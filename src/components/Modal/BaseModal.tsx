import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import styles from "./Modal.module.css";

interface BaseModalProps {
  title: string;
  total: number;
  loading: boolean;
  onClose: () => void;
  children: React.ReactNode;
  page: number;
  totalPages: number;
  goTo: (p: number) => void;
}

export default function BaseModal({ title, total, loading, onClose, children, page, totalPages, goTo }: BaseModalProps) {
  const [inputVal, setInputVal] = useState(String(page));
  const prevPage = useRef(page);

  useEffect(() => {
    if (page !== prevPage.current) {
      prevPage.current = page;
      setInputVal(String(page));
    }
  }, [page]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  const commitInput = (val: string) => {
    const n = parseInt(val, 10);
    if (!isNaN(n) && n >= 1 && n <= totalPages && n !== page) goTo(n);
    else setInputVal(String(page));
  };

  return createPortal(
    <div className="modalOverlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={styles.modal}>

        <div className={styles.header}>
          <span>{title}</span>
          <div className={styles.headerRight}>
            {total > 0 && <span className={styles.totalCount}>{total.toLocaleString("ru-RU")} записей</span>}
            <button className={styles.closeBtn} onClick={onClose} title="Закрыть">✕</button>
          </div>
        </div>

        {children}

        {totalPages > 1 && (
          <div className={styles.pagination}>
            <button className={styles.pageBtn} onClick={() => goTo(1)} disabled={page === 1}>«</button>
            <button className={styles.pageBtn} onClick={() => goTo(page - 1)} disabled={page === 1}>‹</button>
            <input
              className={styles.pageInput}
              value={loading ? "..." : inputVal}
              disabled={loading}
              onChange={(e) => setInputVal(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") commitInput(inputVal); }}
              onBlur={(e) => commitInput(e.target.value)}
            />
            <span className={styles.pageTotal}>/ {totalPages}</span>
            <button className={styles.pageBtn} onClick={() => goTo(page + 1)} disabled={page === totalPages}>›</button>
            <button className={styles.pageBtn} onClick={() => goTo(totalPages)} disabled={page === totalPages}>»</button>
          </div>
        )}

      </div>
    </div>,
    document.body
  );
}