import styles from "./SettingsRow.module.css";

interface BaseProps {
  label: string;
  onRemove?: () => void;
}

interface TextProps extends BaseProps {
  type: "text";
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}

interface NumberProps extends BaseProps {
  type: "number";
  value: number | string;
  onChange: (v: string) => void;
  placeholder?: string;
  min?: number;
  max?: number;
}

interface CheckboxProps extends BaseProps {
  type: "checkbox";
  checked: boolean;
  onChange: (v: boolean) => void;
}

interface SelectProps extends BaseProps {
  type: "select";
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}

type SettingsRowProps = TextProps | NumberProps | CheckboxProps | SelectProps;

export default function SettingsRow(props: SettingsRowProps) {
  const { label, onRemove } = props;

  return (
    <div className={styles.row}>
      <span className={styles.label}>{label}</span>
      <div className={styles.control}>
        {props.type === "text" && (
          <input
            className={styles.textInput}
            type="text"
            value={props.value}
            onChange={(e) => props.onChange(e.target.value)}
            placeholder={props.placeholder ?? "Текст"}
          />
        )}
        {props.type === "number" && (
          <input
            className={styles.textInput}
            type="number"
            value={props.value}
            onChange={(e) => props.onChange(e.target.value)}
            placeholder={props.placeholder ?? "0"}
            min={props.min}
            max={props.max}
          />
        )}
        {props.type === "checkbox" && (
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={props.checked}
              onChange={(e) => props.onChange(e.target.checked)}
              className={styles.checkbox}
            />
            <span className={styles.checkmark} />
          </label>
        )}
        {props.type === "select" && (
          <select
            className={styles.select}
            value={props.value}
            onChange={(e) => props.onChange(e.target.value)}
          >
            {props.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        )}
      </div>
      {onRemove && (
        <button className={styles.removeBtn} onClick={onRemove} title="Удалить">
          ✕
        </button>
      )}
    </div>
  );
}