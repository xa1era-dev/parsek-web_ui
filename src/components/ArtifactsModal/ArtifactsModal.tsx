import { useEffect, useRef, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import ResizableTable, { type ColumnDef } from "../ResizableTable/ResizableTable";
import BaseModal from "../Modal/BaseModal";
import { useModalPagination } from "../Modal/useModalPagination";
import ResultsModal from "../ResultsModal/ResultsModal";
import styles from "./ArtifactsModal.module.css";

interface Artifact {
  uuid: string;
  success: boolean | null;
  value: string;
  start_timestamp: number | null;
  end_timestamp: number | null;
}

interface ArtifactsResponse {
  items: Artifact[];
  total: number;
  page: number;
  page_size: number;
}

interface ArtifactsModalProps {
  taskUuid: string;
  onClose: () => void;
}

// ── Status ────────────────────────────────────────────────────────────────────

function getStatusInfo(row: Artifact): { label: string; style: React.CSSProperties } {
  if (!row.start_timestamp)
    return { label: "Запланировано", style: { background: "#8c8882", color: "#fff", fontWeight: 600 } };
  if (!row.end_timestamp)
    return { label: "Собирается",    style: { background: "#e5c456", color: "#000", fontWeight: 600 } };
  if (row.success === true)
    return { label: "Успешно",       style: { background: "#61a361", color: "#fff", fontWeight: 600 } };
  return   { label: "Неуспешно",     style: { background: "#c96055", color: "#fff", fontWeight: 600 } };
}

// ── Time cell ─────────────────────────────────────────────────────────────────

function formatTs(ts: number): string {
  const d = new Date(ts * 1000);
  const hms = d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const ms = String(Math.round(ts * 1000) % 1000).padStart(3, "0");
  return `${hms}.${ms}`;
}

function formatDuration(sec: number): string {
  const h  = Math.floor(sec / 3600);
  const m  = Math.floor((sec % 3600) / 60);
  const s  = Math.floor(sec % 60);
  const ms = Math.round((sec % 1) * 1000);
  return [h ? `${h}ч` : "", m ? `${m}м` : "", `${s}с`, `${ms}мс`].filter(Boolean).join(" ");
}

function TimeCell({ start, end }: { start: number | null; end: number | null }) {
  const [showDuration, setShowDuration] = useState(false);
  const canToggle = !!(start && end);

  if (!start) return <span>—</span>;

  if (showDuration && end) {
    return (
      <span className="clickable" onClick={() => setShowDuration(false)}
        title="Нажмите для отображения времени">
        {formatDuration(end - start)}
      </span>
    );
  }

  return (
    <span
      className="clickable"
      onClick={canToggle ? () => setShowDuration(true) : undefined}
      title={canToggle ? "Нажмите для отображения длительности" : undefined}
    >
      {formatTs(start)} — {end ? formatTs(end) : "…"}
    </span>
  );
}

// ── Value JSON helpers ────────────────────────────────────────────────────────

const VALUE_EXCLUDE = new Set(["uuid"]);

function parseValue(raw: string): Record<string, unknown> {
  try { return JSON.parse(raw) as Record<string, unknown>; } catch { return {}; }
}

function collectValueKeys(items: Artifact[]): string[] {
  const keys = new Set<string>();
  items.forEach((item) => {
    Object.keys(parseValue(item.value)).forEach((k) => {
      if (!VALUE_EXCLUDE.has(k)) keys.add(k);
    });
  });
  return Array.from(keys);
}

// ── Filter helpers ────────────────────────────────────────────────────────────

type SetSearchParams = ReturnType<typeof useModalPagination>["setSearchParams"];

function useDropdownPos(open: boolean, btnRef: React.RefObject<HTMLButtonElement | null>) {
  const [pos, setPos] = useState({ top: 0, left: 0 });
  useEffect(() => {
    if (open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 2, left: r.left });
    }
  }, [open, btnRef]);
  return pos;
}

function useOutsideClose(
  open: boolean,
  setOpen: (v: boolean) => void,
  btnRef: React.RefObject<HTMLElement | null>,
  dropRef: React.RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (
        !btnRef.current?.contains(e.target as Node) &&
        !dropRef.current?.contains(e.target as Node)
      ) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open, setOpen, btnRef, dropRef]);
}

// ── FilterDropdown — 🔍 icon on sub-columns ───────────────────────────────────

function FilterDropdown({
  filterKey,
  searchParams,
  setSearchParams,
}: {
  filterKey: string;
  searchParams: URLSearchParams;
  setSearchParams: SetSearchParams;
}) {
  const paramKey = filterKey;
  const currentVal = searchParams.get(paramKey) ?? "";
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const btnRef  = useRef<HTMLButtonElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  const pos = useDropdownPos(open, btnRef);
  useOutsideClose(open, setOpen, btnRef, dropRef);

  const toggle = () => {
    if (!open) setText(currentVal);
    setOpen((o) => !o);
  };

  const apply = () => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (text) next.set(paramKey, text); else next.delete(paramKey);
      next.set("page", "1");
      return next;
    }, { replace: true });
    setOpen(false);
  };

  const clear = () => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete(paramKey);
      next.set("page", "1");
      return next;
    }, { replace: true });
    setText("");
    setOpen(false);
  };

  return (
    <>
      <button
        ref={btnRef}
        className="clickable"
        onClick={(e) => { e.stopPropagation(); toggle(); }}
        title={currentVal ? `Фильтр: ${currentVal}` : "Фильтр"}
      >
        🔍
      </button>
      {open && createPortal(
        <div ref={dropRef} className={styles.filterDropdown} style={{ top: pos.top, left: pos.left }}>
          <input
            autoFocus
            className={styles.filterInput}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") apply();
              if (e.key === "Escape") setOpen(false);
            }}
            placeholder="Значение..."
          />
          <div className={styles.filterActions}>
            <button className={styles.filterApply} onClick={apply}>OK</button>
            {currentVal && <button className={styles.filterClear} onClick={clear}>✕</button>}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

// ── AddValueFilter — + icon on group header ───────────────────────────────────

function AddValueFilter({
  setSearchParams,
}: {
  setSearchParams: SetSearchParams;
}) {
  const [open, setOpen] = useState(false);
  const [key, setKey]   = useState("");
  const [val, setVal]   = useState("");
  const btnRef  = useRef<HTMLButtonElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  const pos = useDropdownPos(open, btnRef);
  useOutsideClose(open, setOpen, btnRef, dropRef);

  const apply = () => {
    const k = key.trim();
    if (!k) return;
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set(k, val);
      next.set("page", "1");
      return next;
    }, { replace: true });
    setKey(""); setVal(""); setOpen(false);
  };

  return (
    <>
      <button
        ref={btnRef}
        className="clickable"
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        title="Добавить фильтр по значению"
      >
        +
      </button>
      {open && createPortal(
        <div ref={dropRef} className={styles.filterDropdown} style={{ top: pos.top, left: pos.left }}>
          <input
            autoFocus
            className={styles.filterInput}
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="Ключ"
          />
          <input
            className={styles.filterInput}
            value={val}
            onChange={(e) => setVal(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") apply();
              if (e.key === "Escape") setOpen(false);
            }}
            placeholder="Значение"
          />
          <div className={styles.filterActions}>
            <button className={styles.filterApply} onClick={apply}>OK</button>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

// ── Column definitions ────────────────────────────────────────────────────────

function buildColumns(
  taskUuid: string,
  navigate: ReturnType<typeof useNavigate>,
  valueKeys: string[],
  searchParams: URLSearchParams,
  setSearchParams: SetSearchParams,
  setResultsUuid: (uuid: string) => void,
): ColumnDef<Artifact>[] {
  const valueChildren: ColumnDef<Artifact>[] = valueKeys.map((key) => ({
    key: key,
    label: key,
    flex: 1,
    labelSuffix: (
      <FilterDropdown filterKey={key} searchParams={searchParams} setSearchParams={setSearchParams} />
    ),
    render: (row) => {
      const v = parseValue(row.value)[key];
      return v !== undefined ? String(v) : "—";
    },
  }));

  return [
    {
      key: "uuid",
      label: "UUID",
      initialPx: 290,
      render: (row) => row.uuid,
    },
    {
      key: "status",
      label: "Статус",
      initialPx: 140,
      render: (row) => getStatusInfo(row).label,
      cellStyle: (row) => getStatusInfo(row).style,
    },
    {
      key: "value_group",
      label: "Значение",
      labelSuffix: (
        <AddValueFilter setSearchParams={setSearchParams} />
      ),
      children: valueChildren.length > 0 ? valueChildren : [{
        key: "empty",
        label: "—",
        flex: 1,
        render: () => "—",
      }],
    },
    {
      key: "time",
      label: "Время",
      initialPx: 200,
      render: (row) => <TimeCell start={row.start_timestamp} end={row.end_timestamp} />,
      cellStyle: () => ({ fontVariantNumeric: "tabular-nums" }),
    },
    {
      key: "actions",
      label: "Кнопки",
      initialPx: 135,
      render: (row) => (
        <div className={styles.btnGroup}>
          <button
            className={styles.actionBtn}
            onClick={() => navigate(`/task/${taskUuid}/logs/?query_uuid=${row.uuid}`)}
          >
            Логи
          </button>
          {row.end_timestamp && (
            <button
              className={styles.actionBtn}
              onClick={() => setResultsUuid(row.uuid)}
            >
              Результаты
            </button>
          )}
        </div>
      ),
      cellStyle: () => ({ overflow: "visible", padding: "2px 4px" }),
    },
  ];
}

// ── Modal ─────────────────────────────────────────────────────────────────────

export default function ArtifactsModal({ taskUuid, onClose }: ArtifactsModalProps) {
  const navigate = useNavigate();

  const [items, setItems]     = useState<Artifact[]>([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(false);
  const [resultsUuid, setResultsUuid] = useState<string | null>(null);

  const { page, totalPages, goTo, searchParams, setSearchParams } = useModalPagination(total);

  const valueKeys = useMemo(() => collectValueKeys(items), [items]);
  const columns   = useMemo(
    () => buildColumns(taskUuid, navigate, valueKeys, searchParams, setSearchParams, setResultsUuid),
    [taskUuid, navigate, valueKeys, searchParams, setSearchParams, setResultsUuid],
  );

  // searchParams drives the fetch — URL is the source of truth
  useEffect(() => {
    setLoading(true);
    fetch(`/api/task/${taskUuid}/artifacts/queries/?${searchParams.toString()}`)
      .then((r) => r.json())
      .then((data: ArtifactsResponse) => {
        setItems(data.items ?? []);
        setTotal(data.total ?? 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [taskUuid, searchParams]);

  return (
    <>
    {resultsUuid && (
      <ResultsModal
        taskUuid={taskUuid}
        queryUuid={resultsUuid}
        onClose={() => setResultsUuid(null)}
      />
    )}
    <BaseModal
      title={`Артефакты задачи ${taskUuid}`}
      total={total}
      loading={loading}
      onClose={onClose}
      page={page}
      totalPages={totalPages}
      goTo={goTo}
    >
      <ResizableTable
        columns={columns}
        rows={items}
        getKey={(row) => row.uuid}
        loading={loading}
        emptyText="Нет артефактов"
      />
    </BaseModal>
    </>
  );
}