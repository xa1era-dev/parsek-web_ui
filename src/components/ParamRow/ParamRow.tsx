import styles from "./ParamRow.module.css";

export type ParamType = "string" | "number" | "boolean" | "select" | "list";

export interface ParamEntry {
  id: number;
  paramType: ParamType | "";
  value: string | boolean;
  selectOptions?: string;
}

const TYPE_OPTIONS: { value: ParamType; label: string }[] = [
  { value: "string", label: "Строка" },
  { value: "number", label: "Число" },
  { value: "boolean", label: "Булево" },
  { value: "list", label: "Список" },
  { value: "select", label: "Выбор" },
];

interface ParamRowProps {
  entry: ParamEntry;
  onChange: (entry: ParamEntry) => void;
  onRemove: () => void;
}

export default function ParamRow({ entry, onChange, onRemove }: ParamRowProps) {
  function setType(paramType: ParamType | "") {
    onChange({ ...entry, paramType, value: paramType === "boolean" ? false : "" });
  }

  function setValue(value: string | boolean) {
    onChange({ ...entry, value });
  }

  return (
    <div className={styles.row}>
      {/* Type selector */}
      <select
        className={styles.typeSelect}
        value={entry.paramType}
        onChange={(e) => setType(e.target.value as ParamType | "")}
      >
        <option value="">— тип —</option>
        {TYPE_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      {/* Dynamic value control */}
      <div className={styles.valueCell}>
        {entry.paramType === "" && (
          <span className={styles.hint}>Выберите тип</span>
        )}

        {(entry.paramType === "string" ||
          entry.paramType === "number" ||
          entry.paramType === "list") && (
          <input
            className={styles.textInput}
            type={entry.paramType === "number" ? "number" : "text"}
            value={entry.value as string}
            onChange={(e) => setValue(e.target.value)}
            placeholder={
              entry.paramType === "list" ? "val1, val2, ..." : "Значение"
            }
          />
        )}

        {entry.paramType === "boolean" && (
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={entry.value as boolean}
              onChange={(e) => setValue(e.target.checked)}
              className={styles.hiddenCheckbox}
            />
            <span className={styles.checkmark} />
            <span className={styles.boolLabel}>
              {entry.value ? "true" : "false"}
            </span>
          </label>
        )}

        {entry.paramType === "select" && (
          <input
            className={styles.textInput}
            type="text"
            value={entry.value as string}
            onChange={(e) => setValue(e.target.value)}
            placeholder="opt1, opt2, opt3"
            title="Варианты через запятую"
          />
        )}
      </div>

      <button className={styles.removeBtn} onClick={onRemove} title="Удалить">
        ✕
      </button>
    </div>
  );
}