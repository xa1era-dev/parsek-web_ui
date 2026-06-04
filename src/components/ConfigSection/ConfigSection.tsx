import { useState } from "react";
import styles from "./ConfigSection.module.css";

type Accent = "blue" | "orange" | "green" | "purple";

interface ConfigSectionProps {
  title: string;
  accent?: Accent;
  children: React.ReactNode;
  onAdd?: () => void;
  defaultCollapsed?: boolean;
  /** Background color of the parent — needed so the title masks the border. Default: #fff */
  bg?: string;
}

export default function ConfigSection({
  title,
  accent = "blue",
  children,
  onAdd,
  defaultCollapsed = false,
  bg = "#fff",
}: ConfigSectionProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  return (
    <div className={`${styles.section} ${styles[accent]}`}>
      <div className={styles.header}>
        <span className={styles.title} style={{ background: bg }}>
          {title}
        </span>
        <div className={styles.headerRight} style={{ background: bg }}>
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