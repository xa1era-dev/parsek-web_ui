export type RowValue =
  | { type: "str"; current: string }
  | { type: "int"; current: string }   // string so partial input ("", "-") works
  | { type: "bool"; current: boolean }
  | { type: "literal"; options: string[]; current: string }
  | { type: "path"; current: string };

export interface Row {
  /** API key sent in the request body. Shown on hover over the label. */
  name: string;
  /** Human-readable display label. */
  label: string;
  /** If present, defines the value type and carries the current value. */
  value?: RowValue;
  id: number;
  /** True when the schema field had value: null — must be filled, cannot be removed. */
  required?: boolean;
}

/** Row with a stable list-key for React state. */
export type ActiveRow = Row & { id: number };

/** Produce a fresh default RowValue from a Row definition. */
export function defaultValue(row: Row): RowValue {
  const v = row.value;
  if (!v) return { type: "str", current: "" };
  switch (v.type) {
    case "str": return { type: "str", current: v.current ?? "" };
    case "int": return { type: "int", current: v.current ?? "" };
    case "bool": return { type: "bool", current: false };
    case "literal": return { type: "literal", options: v.options, current: v.options[0] ?? "" };
    case "path":    return { type: "path", current: v.current ?? "" };
  }
}