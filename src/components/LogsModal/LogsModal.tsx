import { useEffect, useState } from "react";
import ResizableTable, { type ColumnDef } from "../ResizableTable/ResizableTable";
import BaseModal from "../Modal/BaseModal";
import { useModalPagination } from "../Modal/useModalPagination";

interface LogEntry {
  id: number;
  content: string;
  level: string;
  timestamp: number;
  tags: Record<string, string>;
  has_attachment: boolean;
}

interface LogsResponse {
  items: LogEntry[];
  total: number;
  page: number;
  page_size: number;
}

interface LogsModalProps {
  taskUuid: string;
  onClose: () => void;
}

const LEVEL_BG: Record<string, string> = {
  ERROR:   "#c96055",
  WARNING: "#e5c456",
  WARN:    "#e5c456",
  DEBUG:   "#6b9fd4",
  INFO:    "#ffffff",
};

const LEVEL_DARK = new Set(["ERROR", "DEBUG"]);

function formatTime(ts: number): string {
  const d = new Date(ts * 1000);
  const hms = d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const ms = String(Math.round(ts * 1000) % 1000).padStart(3, "0");
  return `${hms}.${ms}`;
}

const BASE_COLUMNS: ColumnDef<LogEntry>[] = [
  {
    key: "level",
    label: "Level",
    initialPx: 100,
    render: (row) => row.level,
    cellStyle: (row) => ({
      background: LEVEL_BG[row.level] ?? "#fff",
      color: LEVEL_DARK.has(row.level) ? "#fff" : "#000",
      fontWeight: 600,
    }),
  },
  {
    key: "content",
    label: "Контент",
    flex: 1,
    render: (row) => row.content,
  },
  {
    key: "time",
    label: "Время",
    initialPx: 160,
    render: (row) => formatTime(row.timestamp),
    cellStyle: () => ({ justifyContent: "flex-end", fontVariantNumeric: "tabular-nums" }),
  },
];

export default function LogsModal({ taskUuid, onClose }: LogsModalProps) {
  const [items, setItems]     = useState<LogEntry[]>([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(false);

  const { page, totalPages, goTo, searchParams, setSearchParams } = useModalPagination(total);

  const addTagFilter = (key: string, value: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set(key, value);
      next.set("page", "1");
      return next;
    }, { replace: true });
  };

  const columns: ColumnDef<LogEntry>[] = [
    BASE_COLUMNS[0],
    {
      key: "tags",
      label: "Теги",
      flex: 0.5,
      render: (row) => (
        <span style={{ display: "flex", flexWrap: "nowrap", gap: 4 }}>
          {Object.entries(row.tags).map(([k, v]) => (
            <span
              key={k}
              className="clickable"
              onClick={(e) => { e.stopPropagation(); addTagFilter(k, v); }}
            >
              {k}={v}
            </span>
          ))}
        </span>
      ),
    },
    ...BASE_COLUMNS.slice(1),
  ];

  // searchParams drives the fetch — URL is the source of truth
  useEffect(() => {
    setLoading(true);
    fetch(`/api/task/${taskUuid}/logs/?${searchParams.toString()}`)
      .then((r) => r.json())
      .then((data: LogsResponse) => {
        setItems(data.items ?? []);
        setTotal(data.total ?? 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [taskUuid, searchParams]);

  return (
    <BaseModal
      title={`Логи задачи ${taskUuid}`}
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
        getKey={(row) => row.id}
        loading={loading}
        emptyText="Нет логов"
      />
    </BaseModal>
  );
}