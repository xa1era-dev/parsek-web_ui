import { useState } from "react";
import SettingsRow from "../SettingsRow/SettingsRow";
import RowInput from "../RowInput/RowInput";
import { Row, ActiveRow, RowValue, defaultValue } from "../../types/row";
import styles from "./PipelineCard.module.css";

export interface PipelineData {
  id: number;
  pipeline: string;
  params: ActiveRow[];
}

interface PipelineCardProps {
  data: PipelineData;
  pipelineOptions: { value: string; label: string }[];
  paramOptions: Row[];
  onChange: (data: PipelineData) => void;
}

export default function PipelineCard({
  data,
  pipelineOptions,
  paramOptions,
  onChange,
}: PipelineCardProps) {
  const [collapsed, setCollapsed] = useState(false);

  function updatePipeline(pipeline: string) {
    onChange({ ...data, pipeline, params: [] });
  }

  function addParam(name: string) {
    if (!name) return;
    const def = paramOptions.find((r) => r.name === name);
    if (!def) return;
    const fresh: ActiveRow = {
      id: Date.now(),
      name: def.name,
      label: def.label,
      value: defaultValue(def),
    };
    onChange({ ...data, params: [...data.params, fresh] });
  }

  function updateParamValue(id: number, value: RowValue) {
    onChange({
      ...data,
      params: data.params.map((p) => (p.id === id ? { ...p, value } : p)),
    });
  }

  function removeParam(id: number) {
    onChange({ ...data, params: data.params.filter((p) => p.id !== id) });
  }

  const label =
    pipelineOptions.find((o) => o.value === data.pipeline)?.label ?? data.pipeline;

  const usedNames = new Set(data.params.map((p) => p.name));
  const addableOptions = paramOptions.filter((r) => !usedNames.has(r.name));

  return (
    <div className={styles.card}>
      <div className={styles.header} onClick={() => setCollapsed((c) => !c)}>
        <span className={styles.chevron}>{collapsed ? "▸" : "▾"}</span>
        <span className={styles.title}>{label}</span>
      </div>

      {!collapsed && (
        <div className={styles.body}>
          <SettingsRow
            type="select"
            label="Пайплайн"
            value={data.pipeline}
            onChange={updatePipeline}
            options={pipelineOptions}
          />

          {data.params.map((p) => (
            <div key={p.id} className={styles.paramRow}>
              <span className={styles.paramLabel} title={p.name}>
                {p.label}
              </span>
              {p.value && (
                <div className={styles.paramValue}>
                  <RowInput
                    value={p.value}
                    onChange={(v) => updateParamValue(p.id, v)}
                  />
                </div>
              )}
              <button
                className={styles.paramRemove}
                onClick={() => removeParam(p.id)}
                title="Удалить"
              >
                ✕
              </button>
            </div>
          ))}

          <div className={styles.addRow}>
            <select
              className={styles.addSelect}
              value=""
              onChange={(e) => addParam(e.target.value)}
              disabled={addableOptions.length === 0}
            >
              <option value="">
                {addableOptions.length === 0 ? "Все поля добавлены" : "— добавить поле —"}
              </option>
              {addableOptions.map((r) => (
                <option key={r.name} value={r.name}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}