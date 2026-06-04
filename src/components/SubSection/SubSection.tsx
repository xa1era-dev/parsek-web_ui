import { useState } from "react";
import styles from "./SubSection.module.css";

interface SubSectionProps {
  title: string;
  children: React.ReactNode;
  onAdd?: () => void;
  defaultCollapsed?: boolean;
  /** Background color of the parent body — needed to mask the separator line. Default: #fff */
  bg?: string;
}

export default function SubSection({
  title,
  children,
  onAdd,
  defaultCollapsed = false,
  bg = "#fff",
}: SubSectionProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  return (
    <div className={styles.subSection}>
      <div className={styles.header}>
        <span className={styles.title} style={{ background: bg }}>
          {title}
        </span>
        <div className={styles.actions} style={{ background: bg }}>
          {onAdd && (
            <button className={styles.addBtn} onClick={onAdd} title="Добавить">
              +
            </button>
          )}
          <button
            className={styles.collapseBtn}
            onClick={() => setCollapsed((c) => !c)}
            title={collapsed ? "Развернуть" : "Свернуть"}
          >
            {collapsed ? "▸" : "▾"}
          </button>
        </div>
      </div>
      {!collapsed && <div className={styles.body}>{children}</div>}
    </div>
  );
}