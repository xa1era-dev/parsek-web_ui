import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import styles from "./ChartModal.module.css";

interface ChartData {
  labels: number[];
  speed: number[];
  errors: number[];
  threads: number[];
}

interface ChartPoint {
  time: number;
  speed: number;
  errors: number;
  threads: number;
}

interface ChartModalProps {
  taskUuid: string;
  onClose: () => void;
}

function formatTime(ts: number): string {
  return new Date(ts * 1000).toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function buildPoints(data: ChartData): ChartPoint[] {
  return data.labels.map((ts, i) => ({
    time: ts,
    speed: data.speed[i] ?? 0,
    errors: data.errors[i] ?? 0,
    threads: data.threads[i] ?? 0,
  }));
}

export default function ChartModal({ taskUuid, onClose }: ChartModalProps) {
  const [points, setPoints] = useState<ChartPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/task/${taskUuid}/statistic/chart/`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data: ChartData) => setPoints(buildPoints(data)))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [taskUuid]);

  return createPortal(
    <div
      ref={overlayRef}
      className={styles.overlay}
      onMouseDown={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className={styles.modal}>
        <div className={styles.header}>
          <span>Статистика задачи {taskUuid}</span>
          <button className={styles.closeBtn} onClick={onClose} title="Закрыть">✕</button>
        </div>

        <div className={styles.body}>
          {loading && <p className={styles.message}>Загрузка...</p>}
          {error && <p className={styles.message}>Ошибка: {error}</p>}
          {!loading && !error && points.length === 0 && (
            <p className={styles.message}>Нет данных</p>
          )}
          {!loading && !error && points.length > 0 && (
            <ResponsiveContainer width="100%" height={420}>
              <LineChart data={points} margin={{ top: 16, right: 24, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ccc" />
                <XAxis
                  dataKey="time"
                  tickFormatter={formatTime}
                  tick={{ fontSize: 11 }}
                  interval="preserveStartEnd"
                />
                <YAxis yAxisId="speed" orientation="left" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="threads" orientation="right" tick={{ fontSize: 11 }} />
                <Tooltip
                  labelFormatter={(v) => formatTime(v as number)}
                  formatter={(value, name) => [value, name === "speed" ? "Скорость" : name === "errors" ? "Ошибки" : "Потоки"]}
                />
                <Legend
                  formatter={(v) => v === "speed" ? "Скорость" : v === "errors" ? "Ошибки" : "Потоки"}
                />
                <Line yAxisId="speed"   type="monotone" dataKey="speed"   stroke="#27ae60" dot={false} strokeWidth={2} />
                <Line yAxisId="speed"   type="monotone" dataKey="errors"  stroke="#e74c3c" dot={false} strokeWidth={2} />
                <Line yAxisId="threads" type="monotone" dataKey="threads" stroke="#2980b9" dot={false} strokeWidth={1.5} strokeDasharray="4 2" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}