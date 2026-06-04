import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import ResizableTable, { type ColumnDef } from "../ResizableTable/ResizableTable";
import modalStyles from "../Modal/Modal.module.css";
import styles from "./ResultsModal.module.css";

interface ResultsModalProps {
  taskUuid: string;
  queryUuid: string;
  onClose: () => void;
}

type AnyRow = Record<string, unknown>;

function TypedValue({ val }: { val: unknown }) {
  if (val === null || val === undefined)
    return <span style={{ color: "#bbb" }}>—</span>;
  if (typeof val === "boolean")
    return <span style={{ color: "#4a7fd4", fontWeight: 700 }}>{String(val)}</span>;
  if (typeof val === "number")
    return <span style={{ color: "#4a9a4a", fontWeight: 600 }}>{val}</span>;
  if (typeof val === "object")
    return <span style={{ color: "#888" }}>{JSON.stringify(val)}</span>;
  return <span>{String(val)}</span>;
}

function buildColumns(items: AnyRow[]): ColumnDef<AnyRow>[] {
  const keys = new Set<string>();
  items.forEach((item) => Object.keys(item).forEach((k) => keys.add(k)));
  return Array.from(keys).map((key) => ({
    key,
    label: key,
    flex: 1,
    minWidth: 80,
    render: (row) => <TypedValue val={row[key]} />,
  }));
}

function renderScalar(value: unknown): React.ReactNode {
  if (value === null || value === undefined)
    return <span className={styles.null}>null</span>;
  if (typeof value === "boolean")
    return <span style={{ color: "#4a7fd4", fontWeight: 700 }}>{String(value)}</span>;
  if (typeof value === "number")
    return <span style={{ color: "#4a9a4a", fontWeight: 600 }}>{value}</span>;
  if (typeof value === "object")
    return <pre className={styles.json}>{JSON.stringify(value, null, 2)}</pre>;
  return <span>{String(value)}</span>;
}

export default function ResultsModal({ taskUuid, queryUuid, onClose }: ResultsModalProps) {
  const [data, setData]     = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/task/${taskUuid}/artifacts/results/${queryUuid}/`)
      .then((r) => r.json())
      .then((d: Record<string, unknown>) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [taskUuid, queryUuid]);

  return createPortal(
    <div
      className={modalStyles.overlay}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className={modalStyles.modal}>

        <div className={modalStyles.header}>
          <span>Результаты {queryUuid}</span>
          <div className={modalStyles.headerRight}>
            <button className={modalStyles.closeBtn} onClick={onClose} title="Закрыть">✕</button>
          </div>
        </div>

        <div className={styles.body}>
          {loading && <div className={styles.loading}>Загрузка...</div>}

          {!loading && data && Object.entries(data).map(([key, value]) => (
            <div key={key} className={styles.section}>
              <div className={styles.sectionHeader}>{key}</div>

              {Array.isArray(value) ? (
                value.length === 0 ? (
                  <div className={styles.empty}>Пусто</div>
                ) : (
                  <div className={styles.tableWrap}>
                    <ResizableTable
                      columns={buildColumns(value as AnyRow[])}
                      rows={(value as AnyRow[]).map((item, i) => ({ __idx: i, ...item }))}
                      getKey={(row) => row.__idx as number}
                    />
                  </div>
                )
              ) : (
                <div className={styles.scalar}>{renderScalar(value)}</div>
              )}
            </div>
          ))}
        </div>

      </div>
    </div>,
    document.body,
  );
}