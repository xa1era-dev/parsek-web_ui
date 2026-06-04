import { RowValue } from "../../types/row";
import styles from "./RowInput.module.css";

interface RowInputProps {
  value: RowValue;
  onChange: (v: RowValue) => void;
}

export default function RowInput({ value, onChange }: RowInputProps) {
  switch (value.type) {
    case "str":
      return (
        <input
          className={styles.text}
          type="text"
          value={value.current}
          onChange={(e) => onChange({ ...value, current: e.target.value })}
          placeholder="Значение"
        />
      );

    case "int":
      return (
        <input
          className={styles.text}
          type="text"
          inputMode="numeric"
          value={value.current}
          onChange={(e) => {
            const raw = e.target.value;
            if (raw === "" || raw === "-" || /^-?\d+$/.test(raw))
              onChange({ ...value, current: raw });
          }}
          placeholder="0"
        />
      );

    case "bool":
      return (
        <label className={styles.checkLabel}>
          <input
            type="checkbox"
            checked={value.current}
            onChange={(e) => onChange({ ...value, current: e.target.checked })}
            className={styles.hiddenCheck}
          />
          <span className={styles.checkmark} />
          <span className={styles.boolText}>{value.current ? "true" : "false"}</span>
        </label>
      );

    case "literal":
      return (
        <select
          className={styles.select}
          value={value.current}
          onChange={(e) => onChange({ ...value, current: e.target.value })}
        >
          {value.options.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      );

    case "path":
      return (
        <input
          className={styles.text}
          type="text"
          value={value.current}
          onChange={(e) => onChange({ ...value, current: e.target.value })}
          placeholder="Путь к файлу"
        />
      );
  }
}