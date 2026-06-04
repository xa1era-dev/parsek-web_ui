import { useLayoutEffect, useEffect, useRef, useState } from "react";
import styles from "./ResizableTable.module.css";

export interface ColumnDef<T> {
  key: string;
  label: string;
  initialPx?: number;
  flex?: number;
  minWidth?: number;
  render?: (row: T) => React.ReactNode;
  cellStyle?: (row: T) => React.CSSProperties;
  children?: ColumnDef<T>[];
  labelSuffix?: React.ReactNode;
}

interface ResizableTableProps<T> {
  columns: ColumnDef<T>[];
  rows: T[];
  getKey: (row: T) => string | number;
  loading?: boolean;
  emptyText?: string;
}

const DEFAULT_MIN = 40;

// ── Helpers ───────────────────────────────────────────────────────────────────

function getLeafCols<T>(cols: ColumnDef<T>[]): ColumnDef<T>[] {
  return cols.flatMap((c) => c.children ? getLeafCols(c.children) : [c]);
}

function calcWidths(leafCols: ColumnDef<unknown>[], totalPx: number): number[] {
  const fixedSum  = leafCols.reduce((s, c) => s + (c.initialPx ?? 0), 0);
  const remaining = Math.max(totalPx - fixedSum, 0);
  const flexTotal = leafCols.reduce((s, c) => s + (c.initialPx === undefined ? (c.flex ?? 1) : 0), 0);
  return leafCols.map((c) => {
    if (c.initialPx !== undefined) return c.initialPx;
    const w = flexTotal > 0 ? Math.floor(remaining * (c.flex ?? 1) / flexTotal) : 0;
    return Math.max(w, c.minWidth ?? DEFAULT_MIN);
  });
}

// Keeps existing order, appends new keys, removes missing ones
function syncOrder(current: string[], incoming: string[]): string[] {
  const set = new Set(incoming);
  const kept = current.filter((k) => set.has(k));
  const added = incoming.filter((k) => !kept.includes(k));
  return [...kept, ...added];
}

// ── Header ────────────────────────────────────────────────────────────────────

interface HeaderProps<T> {
  columns: ColumnDef<T>[];
  leafCols: ColumnDef<T>[];
  colWidths: Record<string, number>;
  onStartResize: (key: string, e: React.MouseEvent) => void;
  onReset: () => void;
  dragKey: string | null;
  dragParent: string | null;
  dragOverKey: string | null;
  dragOverParent: string | null;
  onDragStart: (key: string, parent: string | null, e: React.DragEvent) => void;
  onDragOver: (key: string, parent: string | null, e: React.DragEvent) => void;
  onDrop: (key: string, parent: string | null) => void;
  onDragEnd: () => void;
}

function TableHeader<T>({
  columns, leafCols, colWidths, onStartResize, onReset,
  dragKey, dragParent, dragOverKey, dragOverParent,
  onDragStart, onDragOver, onDrop, onDragEnd,
}: HeaderProps<T>) {
  const gridTemplate = leafCols.map((c) => `${colWidths[c.key] ?? 150}px`).join(" ");
  const hasGroups = columns.some((c) => !!c.children);

  const leafGridCol: Record<string, number> = {};
  leafCols.forEach((c, i) => { leafGridCol[c.key] = i + 1; });

  const isDragging = (key: string, parent: string | null) =>
    dragKey === key && dragParent === parent;
  const isDragOver = (key: string, parent: string | null) =>
    dragOverKey === key && dragOverParent === parent;

  const thClass = (key: string, parent: string | null, extra?: string) =>
    [
      styles.th,
      extra,
      isDragging(key, parent) ? styles.thDragging : "",
      isDragOver(key, parent) ? styles.thDragOver : "",
    ].filter(Boolean).join(" ");

  return (
    <div
      className={styles.header}
      style={{ gridTemplateColumns: gridTemplate, gridTemplateRows: hasGroups ? "auto auto" : "auto" }}
      onDoubleClick={onReset}
    >
      {columns.map((col) => {
        if (col.children && col.children.length > 0) {
          const leaves   = getLeafCols([col]);
          const colStart = leafGridCol[leaves[0].key];
          const colEnd   = leafGridCol[leaves[leaves.length - 1].key] + 1;
          return (
            <div
              key={col.key}
              className={thClass(col.key, null, styles.thGroup)}
              style={{ gridRow: 1, gridColumn: `${colStart} / ${colEnd}` }}
              draggable
              onDragStart={(e) => onDragStart(col.key, null, e)}
              onDragOver={(e) => onDragOver(col.key, null, e)}
              onDrop={() => onDrop(col.key, null)}
              onDragEnd={onDragEnd}
            >
              <span className={styles.thLabel}>{col.label}</span>
              {col.labelSuffix}
            </div>
          );
        }

        const leafIdx = leafCols.findIndex((l) => l.key === col.key);
        return (
          <div
            key={col.key}
            className={thClass(col.key, null)}
            style={{ gridRow: hasGroups ? "1 / 3" : "1", gridColumn: leafGridCol[col.key] }}
            draggable
            onDragStart={(e) => onDragStart(col.key, null, e)}
            onDragOver={(e) => onDragOver(col.key, null, e)}
            onDrop={() => onDrop(col.key, null)}
            onDragEnd={onDragEnd}
          >
            <span className={styles.thLabel}>{col.label}</span>
            {col.labelSuffix}
            {leafIdx < leafCols.length - 1 && (
              <div
                className={styles.resizeHandle}
                draggable={false}
                onMouseDown={(e) => { e.stopPropagation(); onStartResize(col.key, e); }}
                onDoubleClick={(e) => { e.stopPropagation(); onReset(); }}
              />
            )}
          </div>
        );
      })}

      {/* Child headers for groups */}
      {hasGroups && columns.flatMap((col) =>
        col.children ? getLeafCols(col.children).map((child) => {
          const leafIdx = leafCols.findIndex((l) => l.key === child.key);
          return (
            <div
              key={child.key}
              className={thClass(child.key, col.key)}
              style={{ gridRow: 2, gridColumn: leafGridCol[child.key] }}
              draggable
              onDragStart={(e) => onDragStart(child.key, col.key, e)}
              onDragOver={(e) => onDragOver(child.key, col.key, e)}
              onDrop={() => onDrop(child.key, col.key)}
              onDragEnd={onDragEnd}
            >
              <span className={styles.thLabel}>{child.label}</span>
              {child.labelSuffix}
              {leafIdx < leafCols.length - 1 && (
                <div
                  className={styles.resizeHandle}
                  draggable={false}
                  onMouseDown={(e) => { e.stopPropagation(); onStartResize(child.key, e); }}
                  onDoubleClick={(e) => { e.stopPropagation(); onReset(); }}
                />
              )}
            </div>
          );
        }) : []
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ResizableTable<T>({
  columns,
  rows,
  getKey,
  loading,
  emptyText = "Нет данных",
}: ResizableTableProps<T>) {

  // ── Column ordering ─────────────────────────────────────────────────────────

  const [colOrder, setColOrder] = useState<string[]>(() => columns.map((c) => c.key));
  const [childOrders, setChildOrders] = useState<Record<string, string[]>>(() => {
    const o: Record<string, string[]> = {};
    columns.forEach((c) => { if (c.children) o[c.key] = c.children.map((ch) => ch.key); });
    return o;
  });

  // Sync when columns prop changes (e.g. dynamic value columns in ArtifactsModal)
  useEffect(() => {
    setColOrder((prev) => syncOrder(prev, columns.map((c) => c.key)));
    setChildOrders((prev) => {
      const next = { ...prev };
      columns.forEach((c) => {
        if (c.children) next[c.key] = syncOrder(prev[c.key] ?? [], c.children.map((ch) => ch.key));
      });
      Object.keys(next).forEach((k) => { if (!columns.some((c) => c.key === k)) delete next[k]; });
      return next;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columns]);

  const orderedColumns = colOrder
    .map((key) => columns.find((c) => c.key === key))
    .filter(Boolean) as ColumnDef<T>[];

  const orderedColumnsWithChildren: ColumnDef<T>[] = orderedColumns.map((col) => {
    if (!col.children || !childOrders[col.key]) return col;
    return {
      ...col,
      children: childOrders[col.key]
        .map((key) => col.children!.find((c) => c.key === key))
        .filter(Boolean) as ColumnDef<T>[],
    };
  });

  const leafCols = getLeafCols(orderedColumnsWithChildren);

  // ── Widths (keyed) ──────────────────────────────────────────────────────────

  const [colWidths, setColWidths] = useState<Record<string, number>>(() => {
    const w: Record<string, number> = {};
    getLeafCols(columns).forEach((c) => { w[c.key] = c.initialPx ?? 150; });
    return w;
  });

  const outerRef  = useRef<HTMLDivElement>(null);
  const resizeRef = useRef<{ key: string; startX: number; startW: number } | null>(null);

  useLayoutEffect(() => {
    if (!outerRef.current) return;
    const newWidths = calcWidths(leafCols as ColumnDef<unknown>[], outerRef.current.clientWidth);
    setColWidths((prev) => {
      const next = { ...prev };
      leafCols.forEach((c, i) => { next[c.key] = newWidths[i]; });
      return next;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leafCols.length]);

  const resetWidths = () => {
    if (!outerRef.current) return;
    const newWidths = calcWidths(leafCols as ColumnDef<unknown>[], outerRef.current.clientWidth);
    const next: Record<string, number> = {};
    leafCols.forEach((c, i) => { next[c.key] = newWidths[i]; });
    setColWidths(next);
  };

  const startResize = (leafKey: string, e: React.MouseEvent) => {
    e.preventDefault();
    const startW = colWidths[leafKey] ?? 150;
    resizeRef.current = { key: leafKey, startX: e.clientX, startW };

    const onMove = (ev: MouseEvent) => {
      if (!resizeRef.current) return;
      const col = leafCols.find((c) => c.key === resizeRef.current!.key);
      const min = col?.minWidth ?? DEFAULT_MIN;
      const dx  = ev.clientX - resizeRef.current.startX;
      setColWidths((prev) => ({
        ...prev,
        [resizeRef.current!.key]: Math.max(min, resizeRef.current!.startW + dx),
      }));
    };
    const onUp = () => {
      resizeRef.current = null;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  // ── Drag & drop ─────────────────────────────────────────────────────────────

  const [dragKey,      setDragKey]      = useState<string | null>(null);
  const [dragParent,   setDragParent]   = useState<string | null>(null);
  const [dragOverKey,  setDragOverKey]  = useState<string | null>(null);
  const [dragOverParent, setDragOverParent] = useState<string | null>(null);

  const clearDrag = () => {
    setDragKey(null); setDragParent(null); setDragOverKey(null); setDragOverParent(null);
  };

  const handleDragStart = (key: string, parent: string | null, e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = "move";
    setDragKey(key);
    setDragParent(parent);
  };

  const handleDragOver = (key: string, parent: string | null, e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverKey(key);
    setDragOverParent(parent);
  };

  const handleDrop = (targetKey: string, targetParent: string | null) => {
    if (!dragKey || dragKey === targetKey) { clearDrag(); return; }

    if (dragParent === null && targetParent === null) {
      setColOrder((prev) => {
        const next = [...prev];
        const from = next.indexOf(dragKey);
        const to   = next.indexOf(targetKey);
        if (from === -1 || to === -1) return prev;
        next.splice(from, 1);
        next.splice(to, 0, dragKey);
        return next;
      });
    } else if (dragParent !== null && dragParent === targetParent) {
      setChildOrders((prev) => {
        const order = [...(prev[dragParent] ?? [])];
        const from  = order.indexOf(dragKey);
        const to    = order.indexOf(targetKey);
        if (from === -1 || to === -1) return prev;
        order.splice(from, 1);
        order.splice(to, 0, dragKey);
        return { ...prev, [dragParent]: order };
      });
    }

    clearDrag();
  };

  // ── Hover ────────────────────────────────────────────────────────────────────

  const [hoveredKey, setHoveredKey] = useState<string | number | null>(null);

  const totalWidth = leafCols.reduce((a, c) => a + (colWidths[c.key] ?? 150), 0);

  return (
    <div className={styles.outer} ref={outerRef}>
      <div className={styles.inner} style={{ minWidth: totalWidth }}>
        <TableHeader
          columns={orderedColumnsWithChildren}
          leafCols={leafCols}
          colWidths={colWidths}
          onStartResize={startResize}
          onReset={resetWidths}
          dragKey={dragKey}
          dragParent={dragParent}
          dragOverKey={dragOverKey}
          dragOverParent={dragOverParent}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onDragEnd={clearDrag}
        />
        <div className={styles.body}>
          {loading && rows.length === 0 ? (
            <div className={styles.empty}>Загрузка...</div>
          ) : rows.length === 0 ? (
            <div className={styles.empty}>{emptyText}</div>
          ) : (
            leafCols.map((col) => (
              <div
                key={col.key}
                className={styles.colWrapper}
                style={{ width: colWidths[col.key] ?? 150 }}
              >
                {rows.map((row) => {
                  const key = getKey(row);
                  return (
                    <div
                      key={key}
                      className={`${styles.td} ${hoveredKey === key ? styles.tdHovered : ""}`}
                      style={col.cellStyle?.(row)}
                      onMouseEnter={() => setHoveredKey(key)}
                      onMouseLeave={() => setHoveredKey(null)}
                    >
                      {col.render?.(row)}
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}