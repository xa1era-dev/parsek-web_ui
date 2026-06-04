import React from "react";
import styles from "./InfoPanel.module.css";

interface InfoPanelProps {
  label: string;
  buttonLabel: string;
  onButtonClick?: () => void;
  rows: { name: string; value: React.ReactNode; onValueClick?: () => void, description?: string }[];
  enabledButton?: boolean;
}

export default function InfoPanel({
  label,
  buttonLabel,
  onButtonClick,
  rows,
  enabledButton = true
}: InfoPanelProps) {
  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <span className={styles.panelLabel}>{label}</span>
        <button className={styles.panelButton} onClick={onButtonClick} disabled={!enabledButton}>
          {buttonLabel}
        </button>
      </div>
      <div className={styles.panelContent}>
        {rows.map((row) => (
          <div key={row.name} className={styles.row}>
            <span>{row.name}</span>
            <span
              onClick={row.onValueClick}
              title={row.description ?? ""}
              className={row.onValueClick ? "clickable" : undefined}
            >
              {row.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}