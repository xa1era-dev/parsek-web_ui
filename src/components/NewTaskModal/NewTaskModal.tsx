import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import RowInput from "../RowInput/RowInput";
import Dropdown from "../Dropdown/Dropdown";
import { Row, ActiveRow, RowValue, defaultValue } from "../../types/row";
import styles from "./NewTaskModal.module.css";

/* ─── static data ─────────────────────────────────────────── */


/* ─── schema helpers ──────────────────────────────────────── */

type SchemaField = { type: string | string[]; value?: unknown };
type SchemaNode  = SchemaField | Record<string, SchemaField>;

function schemaFieldToRow(name: string, field: SchemaField, label = name): Row {
	const id = 0;
	const required = field.value === null ? true : undefined;
	if (Array.isArray(field.type)) {
		return { id, name, label, required, value: { type: "literal", options: field.type, current: field.type[0] ?? "" } };
	}
	switch (field.type) {
		case "str":
		case "string": return { id, name, label, required, value: { type: "str",  current: field.value as string  ?? "" } };
		case "int":    return { id, name, label, required, value: { type: "int",  current: field.value as string  ?? "" } };
		case "bool":   return { id, name, label, required, value: { type: "bool", current: field.value as boolean ?? false } };
		case "Path":   return { id, name, label, required, value: { type: "path", current: field.value as string  ?? "" } };
		default:       return { id, name, label, required, value: { type: "str",  current: field.value as string  ?? "" } };
	}
}

function schemaToRows(section: Record<string, SchemaNode>): Row[] {
	const rows: Row[] = [];
	for (const [key, node] of Object.entries(section)) {
		if ("type" in node) {
			rows.push(schemaFieldToRow(key, node as SchemaField));
		} else {
			for (const [subKey, sub] of Object.entries(node as Record<string, SchemaField>)) {
				if ("type" in sub)
					rows.push(schemaFieldToRow(`${key}.${subKey}`, sub, `${key} / ${subKey}`));
			}
		}
	}
	return rows;
}

/* ─── types ───────────────────────────────────────────────── */

interface Pipeline {
	id: number;
	file: string;
	params: ActiveRow[];
}

function mkPipeline(): Pipeline {
	return { id: Date.now() + Math.random(), file: "", params: [] };
}

function mkPipelineFrom(file: string): Pipeline {
	return { id: Date.now() + Math.random(), file, params: [] };
}

/* ─── styles ──────────────────────────────────────────────── */

const DEMO_STYLE = `
  /* ── 1. Страница ── */
  .page-container {
    max-width: 700px; margin: 0 auto; padding: 24px 24px 80px;
    font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;
    font-size: 12px; color: #1a1a1a;
  }
  .page-title { font-size: 15px; font-weight: 700; margin: 0 0 28px }

  /* ── 2. Секции ── */
  .sections-list { display: flex; flex-direction: column; gap: 32px }

  .section-header {
    display: flex; align-items: baseline; gap: 8px;
    margin-bottom: 12px; padding-bottom: 8px;
    border-bottom: 1.5px solid #ebebeb;
  }
  .section-number { font-size: 10px; font-weight: 700; color: #bbb; letter-spacing: .04em; flex-shrink: 0 }
  .section-title  { font-size: 14px; font-weight: 700; color: #1a1a1a }
  .section-description { margin-left: auto; font-size: 11px; color: #aaa; white-space: nowrap }

  .section-add-btn {
    appearance: none; width: 100%; padding: 8px;
    border: 1.5px dashed #d8d8d8; border-radius: 8px;
    background: transparent; font: inherit; font-size: 12px; color: #aaa;
    cursor: pointer; margin-top: 4px;
    transition: border-color .12s, color .12s, background .12s;
  }
  .section-add-btn:hover { border-color: #999; color: #444; background: #fafafa }

  /* ── 3. Встроенные контролы (число, текст) ── */
  .form-row   { display: flex; align-items: center; gap: 10px; margin-bottom: 8px }
  .form-label { width: 90px; flex-shrink: 0; font-weight: 500; color: #555 }

  .number-input {
    display: flex; align-items: center; height: 28px; padding: 0 0 0 8px;
    border: .5px solid rgba(0,0,0,.12); border-radius: 7px; background: #fff;
  }
  .number-input input {
    flex: 1; min-width: 0; width: 56px; height: 100%;
    border: 0; background: transparent; font: inherit;
    font-variant-numeric: tabular-nums; text-align: right;
    padding: 0 8px 0 0; outline: none; -moz-appearance: textfield;
  }
  .number-input input::-webkit-inner-spin-button,
  .number-input input::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0 }
  .number-input-unit { padding-right: 8px; color: #aaa }

  .text-input {
    appearance: none; width: 100%; height: 28px; padding: 0 8px;
    border: .5px solid rgba(0,0,0,.12); border-radius: 7px; background: #fff;
    color: inherit; font: inherit; outline: none;
  }
  .text-input:focus { border-color: rgba(0,0,0,.3) }

  /* ── 4. Карточка (ConfigurableFile) ── */
  .card { background: #fff; border: 1px solid #e2e2e2; border-radius: 8px; margin-bottom: 8px }
  .card:last-of-type { margin-bottom: 0 }

  .card-header {
    display: flex; align-items: center; gap: 6px;
    padding: 5px 8px 5px 10px; background: #f8f8f8;
    border-bottom: 1px solid #ebebeb; border-radius: 8px 8px 0 0; min-height: 28px;
  }
  .card-header--source {
    background: #fffbe6; border-bottom-color: #f0c040;
  }
  .card-chain-label { font-size: 10px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; color: #999; flex-shrink: 0; white-space: nowrap }
  .card-chain-label--source { color: #b8860b }
  .card-chain-sep   { font-size: 10px; color: #ccc; flex-shrink: 0 }
  .card-filename    { font-size: 11px; color: #999; max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap }
  .card-error-badge { display: inline-flex; align-items: center; gap: 3px; font-size: 10.5px; color: #e04040 }
  .card-header-spacer { flex: 1 }
  .card-header-btn {
    appearance: none; border: 0; background: transparent; color: #bbb;
    width: 22px; height: 22px; border-radius: 5px; cursor: pointer; font-size: 12px;
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  }
  .card-header-btn:hover { background: rgba(0,0,0,.06); color: #555 }
  .card-header-btn--delete:hover { background: #fee2e2; color: #c55 }

  .card-body { padding: 10px 14px 12px; display: flex; flex-direction: column; gap: 10px }

  .field-row     { display: flex; align-items: flex-start; gap: 10px }
  .field-label   { width: 90px; flex-shrink: 0; font-weight: 500; color: #444; padding-top: 5px }
  .field-label--required::after { content: " *"; color: #e04040 }
  .field-control { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px }
  .field-hint    { font-size: 11px; color: #bbb }

  /* ── 5. Комбо-инпут + выпадающий список ── */
  .combo       { position: relative; display: flex }
  .combo-input {
    appearance: none; flex: 1; min-width: 0; height: 28px; padding: 0 8px;
    border: .5px solid rgba(0,0,0,.14); border-right: none;
    border-radius: 7px 0 0 7px; background: #fff;
    font: inherit; font-size: 12px; outline: none; color: #1a1a1a;
  }
  .combo-input:focus         { border-color: rgba(0,0,0,.3) }
  .combo-input--error        { border-color: #e04040 }
  .combo-toggle {
    appearance: none; width: 26px; height: 28px;
    border: .5px solid rgba(0,0,0,.14); border-radius: 0 7px 7px 0;
    background: #f5f5f5; color: #888; cursor: pointer; font-size: 10px; flex-shrink: 0;
  }
  .combo-toggle:hover { background: #ebebeb }

  .dropdown {
    position: absolute; top: calc(100% + 3px); left: 0; right: 0; z-index: 200;
    background: #fff; border: .5px solid rgba(0,0,0,.14); border-radius: 7px;
    box-shadow: 0 4px 16px rgba(0,0,0,.12); max-height: 200px; overflow-y: auto;
  }
  .dropdown-item {
    padding: 6px 10px; cursor: pointer; font-size: 12px;
    display: flex; align-items: center; gap: 6px; color: #1a1a1a;
  }
  .dropdown-item:hover  { background: #f5f5f5 }
  .dropdown-empty       { padding: 8px 10px; font-size: 11px; color: #aaa; font-style: italic }
  .dropdown-item-label  { font-size: 11px; color: #888; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap }

  /* ── 6. Параметры ── */
  .param-table { width: 100%; border-collapse: collapse; margin-bottom: 4px }
  .param-table-head th {
    font-size: 10px; font-weight: 600; text-transform: uppercase;
    letter-spacing: .06em; color: #666; text-align: left;
    padding: 0 4px 5px; border-bottom: 1px solid #d8d8d8;
  }
  .param-col-name { cursor: pointer; user-select: none; width: 44% }
  .param-col-name:hover { color: #555 }
  .param-col-name span { border-bottom: 1px dashed currentColor }

  .param-row td         { padding: 3px 4px; vertical-align: middle }
  .param-cell-name      { width: 67% }
  .param-cell-value     { width: 33% }
  .param-cell-remove    { width: 22px; text-align: right }
  .param-row--selectable { cursor: pointer }
  .param-row--selectable:hover td { background: #f5f5f5 }

  .param-key-badge {
    display: inline-flex; align-items: center; padding: 1px 5px;
    background: #f0f0f0; border-radius: 4px;
    font-size: 10.5px; font-family: ui-monospace, 'Cascadia Code', monospace;
    font-weight: 500; color: #555; white-space: nowrap; margin-right: 3px;
  }
  .param-value-label { font-size: 11px; color: #999 }
  .param-remove-btn {
    appearance: none; border: 0; width: 18px; height: 18px;
    border-radius: 4px; background: transparent; color: #ccc;
    cursor: pointer; font-size: 11px;
    display: flex; align-items: center; justify-content: center;
  }
  .param-remove-btn:hover { background: #fee2e2; color: #c55 }

  .active-param-row   { display: flex; align-items: center; gap: 6px; padding: 2px 0 }
  .active-param-label { flex: 0 0 110px; font-size: 11px; color: #555; overflow: hidden; text-overflow: ellipsis; white-space: nowrap }
  .active-param-value { flex: 1; min-width: 0 }

  .param-add-wrapper { position: relative; display: inline-block }
  .param-add-btn {
    appearance: none; border: 1px dashed #d4d4d4; border-radius: 6px; padding: 4px 10px;
    background: transparent; font: inherit; font-size: 11px; color: #aaa; cursor: pointer;
    display: inline-flex; align-items: center; gap: 4px; white-space: nowrap;
    transition: border-color .12s, color .12s;
  }
  .param-add-btn:hover:not(:disabled) { border-color: #999; color: #444 }
  .param-add-btn:disabled { opacity: .4; cursor: not-allowed }

  .param-dropdown { width: 300px; right: auto; min-width: 300px; max-width: 300px }
  .param-dropdown .param-cell-name  { white-space: normal; word-break: break-word }
  .param-dropdown .param-key-badge  { white-space: normal; word-break: break-word }
`;

/* ─── ConfigurableFile ────────────────────────────────────── */

interface CFileProps {
	file: string;
	onFileChange: (v: string) => void;
	options: { value: string; label: string }[];
	fileLabel?: string;
	placeholder?: string;
	hint?: string;
	schema: Row[];
	params: ActiveRow[];
	onParamsChange: (params: ActiveRow[]) => void;
	index?: number;
	onRemove?: () => void;
	isSource?: boolean;
}

function ConfigurableFile({
	file, onFileChange, options,
	fileLabel = "Файл",
	placeholder = "Выберите из списка или введите имя файла",
	hint,
	schema, params, onParamsChange,
	index, onRemove, isSource,
}: CFileProps) {
	const paramsRef = useRef(params);
	paramsRef.current = params;
	const onParamsChangeRef = useRef(onParamsChange);
	onParamsChangeRef.current = onParamsChange;

	useEffect(() => {
		const required = schema.filter((r) => r.required);
		if (!required.length) return;
		const existingNames = new Set(paramsRef.current.map((p) => p.name));
		const missing = required.filter((r) => !existingNames.has(r.name));
		if (!missing.length) return;
		onParamsChangeRef.current([
			...paramsRef.current,
			...missing.map((r) => ({ ...r, id: Date.now() + Math.random(), value: defaultValue(r) })),
		]);
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [schema]);

	const usedNames = new Set(params.map((p) => p.name));
	const available = schema.filter((r) => !usedNames.has(r.name));

	const filtered = options.filter(
		(o) =>
			!file ||
			o.label.toLowerCase().includes(file.toLowerCase()) ||
			o.value.toLowerCase().includes(file.toLowerCase()),
	);

	function addParam(name: string) {
		const def = schema.find((r) => r.name === name);
		if (!def) return;
		onParamsChange([...params, { ...def, id: Date.now(), value: defaultValue(def) }]);
	}

	function removeParam(id: number) {
		onParamsChange(params.filter((p) => p.id !== id));
	}

	function updateParam(id: number, value: RowValue) {
		onParamsChange(params.map((p) => (p.id === id ? { ...p, value } : p)));
	}

	const paramItems = available.length === 0
		? [{ label: schema.length === 0 ? "Схема не загружена" : "Все параметры добавлены", disabled: true }]
		: available.map((r) => ({ label: r.label, value: r.name }));

	return (
		<div className="card">
			{(index != null || isSource) && (
				<div className={`card-header${isSource ? " card-header--source" : ""}`}>
					<span className={`card-chain-label${isSource ? " card-chain-label--source" : ""}`}>
						{isSource ? "Источниковая цепь" : "Трансформирующая цепь"}
					</span>
					{!isSource && index != null && (
						<span className="card-chain-sep">·</span>
					)}
					{!isSource && index != null && (
						<span style={{ fontSize: 11, color: "#aaa", flexShrink: 0 }}>{index}</span>
					)}
					{file
						? <span className="card-filename">{file}</span>
						: <span className="card-error-badge">● не выбран файл</span>
					}
					<span className="card-header-spacer" />
					{onRemove && (
						<button className="card-header-btn card-header-btn--delete" onClick={onRemove} title="Удалить">
							🗑
						</button>
					)}
				</div>
			)}

			<div className="card-body">
				{/* Файл */}
				<div className="field-row">
					<span className="field-label field-label--required">{fileLabel}</span>
					<div className="field-control">
						<div className="combo">
							<input
								className={`combo-input${!file ? " combo-input--error" : ""}`}
								value={file}
								placeholder={placeholder}
								onChange={(e) => onFileChange(e.target.value)}
							/>
							<Dropdown
								trigger="▾"
								items={filtered.map((o) => ({ label: o.label, value: o.value }))}
								onSelect={(v) => onFileChange(v)}
								portal
								placement="bottom-start"
								triggerClassName="combo-toggle"
							/>
						</div>
						{hint && <span className="field-hint">{hint}</span>}
					</div>
				</div>

				{/* Параметры */}
				<div className="field-row">
					<span className="field-label">Параметры</span>
					<div className="field-control">

						{params.map((p) => (
							<div key={p.id} className="active-param-row">
								<span className="active-param-label" title={p.name}>
									{p.label}
									{p.required && <span style={{ color: "#e04040", marginLeft: 2 }}>*</span>}
								</span>
								<div className="active-param-value">
									{p.value && (
										<RowInput value={p.value} onChange={(v) => updateParam(p.id, v)} />
									)}
								</div>
								{!p.required && (
									<button className="param-remove-btn" onClick={() => removeParam(p.id)} title="Удалить">×</button>
								)}
							</div>
						))}

						{file ? (
							<Dropdown
								trigger="+ добавить параметр"
								items={paramItems}
								onSelect={addParam}
								portal
								placement="bottom-start"
								triggerClassName="param-add-btn"
								listClassName="param-dropdown"
							/>
						) : (
							<button className="param-add-btn" disabled>+ добавить параметр</button>
						)}

					</div>
				</div>
			</div>
		</div>
	);
}

/* ─── helpers: конфиг и валидация ────────────────────────── */

function flattenConf(obj: Record<string, unknown>, prefix = ""): Record<string, unknown> {
	const result: Record<string, unknown> = {};
	for (const [k, v] of Object.entries(obj)) {
		const key = prefix ? `${prefix}.${k}` : k;
		if (typeof v === "object" && v !== null && !Array.isArray(v))
			Object.assign(result, flattenConf(v as Record<string, unknown>, key));
		else
			result[key] = v;
	}
	return result;
}

function confToActiveRows(conf: Record<string, unknown>, schema: Row[]): ActiveRow[] {
	const flat = flattenConf(conf);
	const rows: ActiveRow[] = [];
	for (const row of schema) {
		if (!(row.name in flat)) continue;
		const raw = flat[row.name];
		let value: RowValue;
		if (row.value?.type === "bool") {
			value = { type: "bool", current: Boolean(raw) };
		} else if (row.value?.type === "int") {
			value = { type: "int", current: String(raw ?? "") };
		} else if (row.value?.type === "literal") {
			value = { ...(row.value as { type: "literal"; options: string[]; current: string }), current: String(raw ?? "") };
		} else {
			value = { type: "str", current: String(raw ?? "") };
		}
		rows.push({ ...row, id: Date.now() + Math.random(), value });
	}
	return rows;
}

function paramsToConf(params: ActiveRow[]): Record<string, unknown> {
	const conf: Record<string, unknown> = {};
	for (const p of params) {
		const parts = p.name.split(".");
		let cur = conf;
		for (let i = 0; i < parts.length - 1; i++) {
			if (typeof cur[parts[i]] !== "object" || cur[parts[i]] === null)
				cur[parts[i]] = {};
			cur = cur[parts[i]] as Record<string, unknown>;
		}
		const last = parts[parts.length - 1];
		const v = p.value;
		if (!v) continue;
		if (v.type === "bool") cur[last] = v.current;
		else if (v.type === "int") cur[last] = Number(v.current) || 0;
		else cur[last] = (v as { type: string; current: string }).current;
	}
	return conf;
}

function buildPayload(
	parserFile: string,
	parserParams: ActiveRow[],
	threads: number,
	tag: string,
	inPipelines: Pipeline[],
	outPipelines: Pipeline[],
): Record<string, unknown> {
	const payload: Record<string, unknown> = {
		parser:    { conf: paramsToConf(parserParams), file: parserFile || null },
		task:      { conf: { threads } },
		in_pipes:  inPipelines.map((p) => ({ conf: paramsToConf(p.params), file: p.file || null })),
		out_pipes: outPipelines.map((p) => ({ conf: paramsToConf(p.params), file: p.file || null })),
	};
	if (tag.trim()) payload.group_tag = tag.trim();
	return payload;
}

function isRequiredEmpty(p: ActiveRow): boolean {
	if (!p.required || !p.value) return false;
	const v = p.value;
	if (v.type === "bool" || v.type === "literal") return false;
	return (v as { current: string }).current.trim() === "";
}

function checkRequiredParams(params: ActiveRow[], prefix: string, errors: string[]) {
	params.filter(isRequiredEmpty).forEach((p) => {
		errors.push(`${prefix}: поле «${p.label}» обязательно`);
	});
}

function getValidationErrors(
	parserFile: string,
	parserParams: ActiveRow[],
	inSource: Pipeline,
	inTransforms: Pipeline[],
	outSource: Pipeline,
	outTransforms: Pipeline[],
): string[] {
	const errors: string[] = [];
	if (!parserFile) errors.push("Не выбран парсер");
	if (!inSource.file) errors.push("Входной источник не настроен");
	if (!outSource.file) errors.push("Выходной источник не настроен");
	checkRequiredParams(parserParams, "Парсер", errors);
	checkRequiredParams(inSource.params, "Входной источник", errors);
	inTransforms.forEach((t, i) => checkRequiredParams(t.params, `Вх. transform #${i + 1}`, errors));
	checkRequiredParams(outSource.params, "Выходной источник", errors);
	outTransforms.forEach((t, i) => checkRequiredParams(t.params, `Вых. transform #${i + 1}`, errors));
	return errors;
}

/* ─── ValidationTooltip ───────────────────────────────────── */

function ValidationTooltip({ errors, children }: { errors: string[]; children: React.ReactNode }) {
	const [visible, setVisible] = useState(false);
	if (!errors.length) return <>{children}</>;
	return (
		<div style={{ position: "relative", display: "inline-flex" }}
		     onMouseEnter={() => setVisible(true)}
		     onMouseLeave={() => setVisible(false)}>
			{children}
			{visible && (
				<div style={{
					position: "absolute",
					bottom: "calc(100% + 7px)",
					right: 0,
					background: "#1e1e1e",
					color: "#f5f5f5",
					fontSize: 11,
					lineHeight: 1.6,
					padding: "8px 12px",
					borderRadius: 7,
					whiteSpace: "nowrap",
					zIndex: 1000,
					pointerEvents: "none",
					boxShadow: "0 4px 16px rgba(0,0,0,.25)",
				}}>
					{errors.map((e, i) => (
						<div key={i} style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
							<span style={{ color: "#f87171", flexShrink: 0 }}>✕</span>
							<span>{e}</span>
						</div>
					))}
				</div>
			)}
		</div>
	);
}

/* ─── ComponentsDemo ──────────────────────────────────────── */

interface Props {
	isOpen: boolean;
	onClose: () => void;
}

export default function NewTaskModal({ isOpen, onClose }: Props) {
	const [threads, setThreads] = useState(20);
	const [tag, setTag]         = useState("tags");

	const [inSource, setInSource]         = useState<Pipeline>(mkPipeline());
	const [inTransforms, setInTransforms] = useState<Pipeline[]>([]);
	const [outSource, setOutSource]       = useState<Pipeline>(mkPipeline());
	const [outTransforms, setOutTransforms] = useState<Pipeline[]>([]);

	const [sourceOptions, setSourceOptions]       = useState<{ value: string; label: string }[]>([]);
	const [transformOptions, setTransformOptions] = useState<{ value: string; label: string }[]>([]);
	const [pipelineSchemas, setPipelineSchemas] = useState<Record<string, Row[]>>({});
	const fetchedPipelines = useRef(new Set<string>());
	const [parserOptions, setParserOptions]     = useState<{ value: string; label: string }[]>([]);
	const [parserFile, setParserFile]       = useState("");
	const [parserSchema, setParserSchema]   = useState<Row[]>([]);
	const [parserParams, setParserParams]   = useState<ActiveRow[]>([]);

	const [copied, setCopied] = useState(false);
	const [isRunning, setIsRunning] = useState(false);
	const [runError, setRunError]   = useState("");

	const [importOpen, setImportOpen]   = useState(false);
	const [importText, setImportText]   = useState("");
	const [importError, setImportError] = useState("");

	const PRESETS_KEY = "aparser_presets";
	type Preset = { name: string; json: string };

	const [presets, setPresets]           = useState<Preset[]>(() => {
		try { return JSON.parse(localStorage.getItem(PRESETS_KEY) ?? "[]"); }
		catch { return []; }
	});
	const [selectedPreset, setSelectedPreset] = useState("");
	const [showSaveInput, setShowSaveInput]   = useState(false);
	const [saveNameInput, setSaveNameInput]   = useState("");

	useEffect(() => {
		fetch("/api/pipelines/")
			.then((r) => r.json())
			.then((data: { source?: string[]; transform?: string[] }) => {
				setSourceOptions((data.source ?? []).map((p) => ({ value: p, label: p })));
				setTransformOptions((data.transform ?? []).map((p) => ({ value: p, label: p })));
			})
			.catch(() => {});
		fetch("/api/parsers/")
			.then((r) => r.json())
			.then((data: string[]) => setParserOptions(data.map((p) => ({ value: p, label: p }))))
			.catch(() => {});
	}, []);

	useEffect(() => {
		if (!isOpen) return;
		const handler = (e: KeyboardEvent) => {
			if (e.key === "Escape") { onClose(); return; }
			if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); if (validationErrors.length === 0) handleTestRun(); return; }
			if ((e.ctrlKey || e.metaKey) && e.key === "s")     { e.preventDefault(); handleSaveDraft(); return; }
		};
		document.addEventListener("keydown", handler);
		return () => document.removeEventListener("keydown", handler);
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isOpen, onClose]);

	function handleParserFileChange(val: string) {
		setParserFile(val);
		setParserParams([]);
		setParserSchema([]);
		if (!val) return;
		fetch(`/api/parser/${val}/config/`)
			.then((r) => r.json())
			.then((data: { parser?: Record<string, SchemaNode> }) =>
				setParserSchema(schemaToRows(data.parser ?? {}))
			)
			.catch(() => {});
	}

	function fetchPipelineSchema(file: string) {
		if (!file || fetchedPipelines.current.has(file)) return;
		fetchedPipelines.current.add(file);
		fetch(`/api/pipeline/${file}/config/`)
			.then((r) => r.json())
			.then((data: Record<string, Record<string, SchemaNode>>) => {
				const section = (Object.values(data)[0] ?? {}) as Record<string, SchemaNode>;
				setPipelineSchemas((s) => ({ ...s, [file]: schemaToRows(section) }));
			})
			.catch(() => {});
	}

	function applyPatch(patch: Partial<Pipeline>): Partial<Pipeline> {
		if (patch.file !== undefined) {
			fetchPipelineSchema(patch.file);
			return { ...patch, params: [] };
		}
		return patch;
	}

	function patchInSource(patch: Partial<Pipeline>) {
		setInSource((prev) => ({ ...prev, ...applyPatch(patch) }));
	}
	function patchOutSource(patch: Partial<Pipeline>) {
		setOutSource((prev) => ({ ...prev, ...applyPatch(patch) }));
	}
	function patchInTransform(id: number, patch: Partial<Pipeline>) {
		setInTransforms((prev) => prev.map((p) => (p.id === id ? { ...p, ...applyPatch(patch) } : p)));
	}
	function patchOutTransform(id: number, patch: Partial<Pipeline>) {
		setOutTransforms((prev) => prev.map((p) => (p.id === id ? { ...p, ...applyPatch(patch) } : p)));
	}

	const allInPipelines  = [inSource, ...inTransforms];
	const allOutPipelines = [...outTransforms, outSource];

	const validationErrors = getValidationErrors(parserFile, parserParams, inSource, inTransforms, outSource, outTransforms);
	const payload = buildPayload(parserFile, parserParams, threads, tag, allInPipelines, allOutPipelines);
	const jsonStr = JSON.stringify(payload, null, 2);

	const pathNotifications = allInPipelines.flatMap((p, i) =>
		(pipelineSchemas[p.file] ?? [])
			.filter((r) => r.value?.type === "path")
			.map((r) => ({ index: i + 1, file: p.file, label: r.label || r.name }))
	);

	async function loadPreset(raw: string) {
		setImportError("");
		let payload: Record<string, unknown>;
		try {
			payload = JSON.parse(raw);
		} catch {
			setImportError("Невалидный JSON");
			return;
		}

		const task   = payload.task   as { conf?: { threads?: unknown } } | undefined;
		const parser = payload.parser as { file?: unknown; conf?: Record<string, unknown> } | undefined;

		if (typeof task?.conf?.threads === "number") setThreads(task.conf.threads);
		setTag(typeof payload.group_tag === "string" ? payload.group_tag : "");

		const newFile = typeof parser?.file === "string" ? parser.file : "";
		setParserFile(newFile);
		setParserParams([]);
		setParserSchema([]);

		if (newFile) {
			try {
				const resp = await fetch(`/api/parser/${newFile}/config/`);
				const data = await resp.json() as { parser?: Record<string, SchemaNode> };
				const schema = schemaToRows(data.parser ?? {});
				setParserSchema(schema);
				if (parser?.conf) setParserParams(confToActiveRows(parser.conf, schema));
			} catch {
				/* схема недоступна — параметры оставляем пустыми */
			}
		}

		type PipeEntry = { file?: unknown; conf?: Record<string, unknown> };
		const inPipes  = Array.isArray(payload.in_pipes)  ? payload.in_pipes  as PipeEntry[] : [];
		const outPipes = Array.isArray(payload.out_pipes) ? payload.out_pipes as PipeEntry[] : [];
		// First in-pipe is Source, rest are transforms; last out-pipe is Source, rest are transforms
		const [inSrc, ...inTrans]   = inPipes.length  ? inPipes  : [{}];
		const outTrans = outPipes.slice(0, -1);
		const outSrc   = outPipes.length ? outPipes[outPipes.length - 1] : {};

		// Fetch schemas for all unique pipe files in parallel, then apply conf values
		const localSchemas: Record<string, Row[]> = {};
		async function getPipeSchema(file: string): Promise<Row[]> {
			if (!file || localSchemas[file]) return localSchemas[file] ?? [];
			try {
				const resp = await fetch(`/api/pipeline/${file}/config/`);
				const data = await resp.json() as Record<string, Record<string, SchemaNode>>;
				const section = (Object.values(data)[0] ?? {}) as Record<string, SchemaNode>;
				localSchemas[file] = schemaToRows(section);
				fetchedPipelines.current.add(file);
			} catch { localSchemas[file] = []; }
			return localSchemas[file];
		}
		const uniquePipeFiles = [...new Set([...inPipes, ...outPipes].map((p) => String(p.file ?? "")).filter(Boolean))];
		await Promise.all(uniquePipeFiles.map(getPipeSchema));
		setPipelineSchemas((s) => ({ ...s, ...localSchemas }));

		function mkPipelineFromEntry(entry: PipeEntry): Pipeline {
			const file = String(entry.file ?? "");
			const schema = localSchemas[file] ?? [];
			const params = entry.conf ? confToActiveRows(entry.conf, schema) : [];
			return { id: Date.now() + Math.random(), file, params };
		}
		setInSource(mkPipelineFromEntry(inSrc as PipeEntry));
		setInTransforms((inTrans as PipeEntry[]).map(mkPipelineFromEntry));
		setOutSource(mkPipelineFromEntry(outSrc as PipeEntry));
		setOutTransforms((outTrans as PipeEntry[]).map(mkPipelineFromEntry));

		setImportOpen(false);
		setImportText("");
	}

	function persistPresets(next: Preset[]) {
		localStorage.setItem(PRESETS_KEY, JSON.stringify(next));
		setPresets(next);
	}

	function savePreset() {
		const name = saveNameInput.trim();
		if (!name) return;
		const next = [
			...presets.filter((p) => p.name !== name),
			{ name, json: jsonStr },
		];
		persistPresets(next);
		setSelectedPreset(name);
		setShowSaveInput(false);
		setSaveNameInput("");
	}

	function deletePreset() {
		if (!selectedPreset) return;
		const next = presets.filter((p) => p.name !== selectedPreset);
		persistPresets(next);
		setSelectedPreset("");
	}

	function handleClear() {
		setThreads(20);
		setTag("tags");
		setInSource(mkPipeline());
		setInTransforms([]);
		setOutSource(mkPipeline());
		setOutTransforms([]);
		setParserFile("");
		setParserSchema([]);
		setParserParams([]);
	}

	function handleTestRun()  { /* TODO: тестовый сбор */ }
	function handleSaveDraft() { /* TODO: сохранить черновик */ }
	async function handleRun() {
		setRunError("");
		setIsRunning(true);
		try {
			const res = await fetch("/api/task/", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: jsonStr,
			});
			if (!res.ok) {
				const text = await res.text();
				setRunError(`Ошибка ${res.status}: ${text || res.statusText}`);
				return;
			}
			onClose();
		} catch (e) {
			setRunError(e instanceof Error ? e.message : "Неизвестная ошибка");
		} finally {
			setIsRunning(false);
		}
	}

	function handleCopy() {
		navigator.clipboard.writeText(jsonStr).then(() => {
			setCopied(true);
			setTimeout(() => setCopied(false), 1500);
		});
	}

	function handleOverlayMouseDown(e: React.MouseEvent<HTMLDivElement>) {
		if (e.target === e.currentTarget) onClose();
	}

	if (!isOpen) return null;

	return createPortal(
		<div className="modalOverlay" onMouseDown={handleOverlayMouseDown}>
			<div className={styles.modal}>

				{/* ── Шапка модалки ── */}
				<div className={styles.modalHeader}>
					<span className={styles.modalTitle}>Новая задача</span>
					<button className={styles.closeBtn} onClick={onClose} title="Закрыть">✕</button>
				</div>

				{/* ── Тело: левый бар + контент + правый бар ── */}
				<div className={styles.layout}>

					{/* Левый сайдбар */}
					<aside className={styles.leftSidebar}>

						{/* Пресеты */}
						<div className={styles.sidebarBlock}>
							<div className={styles.sidebarTitle}>Пресеты</div>
							<select
								className={styles.presetSelect}
								value={selectedPreset}
								onChange={(e) => setSelectedPreset(e.target.value)}
								size={1}
							>
								<option value="">— выбрать —</option>
								{presets.map((p) => (
									<option key={p.name} value={p.name}>{p.name}</option>
								))}
							</select>
							<div className={styles.presetActions}>
								<button
									className={styles.presetLoadBtn}
									disabled={!selectedPreset}
									onClick={() => {
										const p = presets.find((x) => x.name === selectedPreset);
										if (p) loadPreset(p.json);
									}}
								>Загрузить</button>
								<button
									className={styles.presetDeleteBtn}
									disabled={!selectedPreset}
									onClick={deletePreset}
								>Удалить</button>
							</div>
							{showSaveInput ? (
								<div className={styles.presetSaveRow}>
									<input
										className={styles.presetNameInput}
										value={saveNameInput}
										onChange={(e) => setSaveNameInput(e.target.value)}
										onKeyDown={(e) => { if (e.key === "Enter") savePreset(); if (e.key === "Escape") { setShowSaveInput(false); setSaveNameInput(""); } }}
										placeholder="Название пресета"
										autoFocus
									/>
									<button
										className={styles.presetSaveConfirmBtn}
										disabled={!saveNameInput.trim()}
										onClick={savePreset}
									>✓</button>
								</div>
							) : (
								<button
									className={styles.presetSaveBtn}
									onClick={() => setShowSaveInput(true)}
								>Сохранить текущий</button>
							)}
						</div>

						{/* Валидация */}
						<div className={styles.sidebarBlock}>
							<div className={styles.sidebarTitle}>Валидация</div>
							{validationErrors.length === 0
								? <span className={styles.validationOk}>✓ Всё заполнено</span>
								: <div className={styles.validationList}>
									{validationErrors.map((err, i) => (
										<div key={i} className={styles.validationItem}>
											<span className={styles.validationIcon}>✕</span>
											<span>{err}</span>
										</div>
									))}
								</div>
							}
						</div>

						{/* Уведомления */}
						{pathNotifications.length > 0 && (
							<div className={styles.sidebarBlock}>
								<div className={styles.sidebarTitle}>Уведомления</div>
								{pathNotifications.map((n, i) => (
									<div key={i} className={styles.noticeItem}>
										<div className={styles.noticeLabel}>Вх. #{n.index} · {n.label}</div>
										<div className={styles.noticeText}>Файл будет перемещён в</div>
										<div className={styles.noticePath}>artifacts/&lt;uuid&gt;/</div>
									</div>
								))}
							</div>
						)}

					</aside>

					{/* Основной контент */}
					<div className={styles.mainContent}>
						<style>{DEMO_STYLE}</style>
						<div className="page-container">
							<div className="sections-list">

								{/* 01 — Конфиг */}
								<section>
									<div className="section-header">
										<span className="section-number">01</span>
										<span className="section-title">Конфиг</span>
									</div>
									<div className="form-row">
										<span className="form-label">Потоки</span>
										<div className="number-input">
											<button className={styles.numberInputBtn} onClick={() => setThreads((v) => Math.max(1, v - 1))}>−</button>
											<input type="number" value={threads} min={1} max={200}
											       onChange={(e) => setThreads(Math.max(1, Number(e.target.value)))} />
											<button className={styles.numberInputBtn} onClick={() => setThreads((v) => Math.min(200, v + 1))}>+</button>
											<span className="number-input-unit">шт</span>
										</div>
									</div>
									<div className="form-row">
										<span className="form-label">Тег</span>
										<input className="text-input" style={{ maxWidth: 200 }} type="text"
										       value={tag} onChange={(e) => setTag(e.target.value)} placeholder="tags" />
									</div>
								</section>

								{/* 02 — Входные пайплайны */}
								<section>
									<div className="section-header">
										<span className="section-number">02</span>
										<span className="section-title">Входные пайплайны</span>
										<span className="section-description">Откуда берём данные для сбора</span>
									</div>
									<ConfigurableFile
										isSource
										file={inSource.file}
										onFileChange={(v) => patchInSource({ file: v })}
										options={sourceOptions}
										hint="Source пайплайн — точка входа цепочки"
										schema={pipelineSchemas[inSource.file] ?? []}
										params={inSource.params}
										onParamsChange={(params) => patchInSource({ params })}
									/>
									{inTransforms.map((p, i) => (
										<ConfigurableFile
											key={p.id}
											index={i + 1}
											file={p.file}
											onFileChange={(v) => patchInTransform(p.id, { file: v })}
											options={transformOptions}
											hint="Transform пайплайн"
											schema={pipelineSchemas[p.file] ?? []}
											params={p.params}
											onParamsChange={(params) => patchInTransform(p.id, { params })}
											onRemove={() => setInTransforms((prev) => prev.filter((x) => x.id !== p.id))}
										/>
									))}
									<button className="section-add-btn"
									        onClick={() => setInTransforms((prev) => [...prev, mkPipeline()])}>
										+ Добавить входной transform
									</button>
								</section>

								{/* 03 — Парсер */}
								<section>
									<div className="section-header">
										<span className="section-number">03</span>
										<span className="section-title">Парсер</span>
										<span className="section-description">Где обрабатываем данные</span>
									</div>
									<ConfigurableFile
										file={parserFile}
										onFileChange={handleParserFileChange}
										options={parserOptions}
										fileLabel="Парсер"
										placeholder="— выбрать парсер —"
										schema={parserSchema}
										params={parserParams}
										onParamsChange={setParserParams}
									/>
								</section>

								{/* 04 — Выходные пайплайны */}
								<section>
									<div className="section-header">
										<span className="section-number">04</span>
										<span className="section-title">Выходные пайплайны</span>
										<span className="section-description">Куда отправляем результат</span>
									</div>
									{outTransforms.map((p, i) => (
										<ConfigurableFile
											key={p.id}
											index={i + 1}
											file={p.file}
											onFileChange={(v) => patchOutTransform(p.id, { file: v })}
											options={transformOptions}
											hint="Transform пайплайн"
											schema={pipelineSchemas[p.file] ?? []}
											params={p.params}
											onParamsChange={(params) => patchOutTransform(p.id, { params })}
											onRemove={() => setOutTransforms((prev) => prev.filter((x) => x.id !== p.id))}
										/>
									))}
									<button className="section-add-btn"
									        onClick={() => setOutTransforms((prev) => [...prev, mkPipeline()])}>
										+ Добавить выходной обработчик
									</button>
									<ConfigurableFile
										isSource
										file={outSource.file}
										onFileChange={(v) => patchOutSource({ file: v })}
										options={sourceOptions}
										hint="Source пайплайн — точка выхода цепочки"
										schema={pipelineSchemas[outSource.file] ?? []}
										params={outSource.params}
										onParamsChange={(params) => patchOutSource({ params })}
									/>
								</section>

							</div>
						</div>
					</div>

					{/* Правый сайдбар */}
					<aside className={styles.sidebar}>

						{/* Сводка */}
						<div className={styles.sidebarBlock}>
							<div className={styles.sidebarTitle}>Сводка</div>
							<div className={styles.summaryRow}>
								<span className={styles.summaryKey}>Парсер</span>
								{parserFile
									? <span className={styles.summaryVal}>{parserFile}</span>
									: <span className={styles.summaryValEmpty}>не выбран</span>}
							</div>
							<div className={styles.summaryRow}>
								<span className={styles.summaryKey}>Потоков</span>
								<span className={styles.summaryVal}>{threads}</span>
							</div>
							{tag.trim() && (
								<div className={styles.summaryRow}>
									<span className={styles.summaryKey}>Тег</span>
									<span className={styles.summaryVal}>{tag.trim()}</span>
								</div>
							)}
							<div className={styles.summaryRow}>
								<span className={styles.summaryKey}>Вх. Source</span>
								{inSource.file
									? <span className={styles.summaryVal}>{inSource.file}</span>
									: <span className={styles.summaryValEmpty}>не выбран</span>}
							</div>
							{inTransforms.length > 0 && (
								<div className={styles.summaryRow}>
									<span className={styles.summaryKey}>Вх. transforms</span>
									<span className={styles.summaryVal}>{inTransforms.length}</span>
								</div>
							)}
							<div className={styles.summaryRow}>
								<span className={styles.summaryKey}>Вых. Source</span>
								{outSource.file
									? <span className={styles.summaryVal}>{outSource.file}</span>
									: <span className={styles.summaryValEmpty}>не выбран</span>}
							</div>
							{outTransforms.length > 0 && (
								<div className={styles.summaryRow}>
									<span className={styles.summaryKey}>Вых. transforms</span>
									<span className={styles.summaryVal}>{outTransforms.length}</span>
								</div>
							)}
						</div>

						{/* Импорт пресета */}
						<div className={styles.sidebarBlock}>
							<div className={styles.sidebarTitle}>Пресет</div>
							{importOpen ? (
								<>
									<textarea
										className={styles.importTextarea}
										value={importText}
										onChange={(e) => setImportText(e.target.value)}
										placeholder='Вставьте JSON…'
										spellCheck={false}
									/>
									{importError && <span className={styles.importError}>{importError}</span>}
									<div className={styles.importActions}>
										<button
											className={styles.importApplyBtn}
											onClick={() => loadPreset(importText)}
										>Применить</button>
										<button
											className={styles.importCancelBtn}
											onClick={() => { setImportOpen(false); setImportText(""); setImportError(""); }}
										>Отмена</button>
									</div>
								</>
							) : (
								<button
									className={styles.importOpenBtn}
									onClick={() => setImportOpen(true)}
								>Загрузить из JSON</button>
							)}
						</div>

						{/* Превью JSON */}
						<div className={styles.sidebarBlockGrow}>
							<div className={styles.sidebarTitle}>Превью JSON</div>
							<div className={styles.jsonBlock}>
								<button
									className={`${styles.copyBtn}${copied ? ` ${styles.copyBtnOk}` : ""}`}
									onClick={handleCopy}
								>
									{copied ? "скопировано" : "копировать"}
								</button>
								<pre className={styles.jsonPre}>{jsonStr}</pre>
							</div>
						</div>

					</aside>

				</div>

				{/* ── Футер ── */}
				<div className={styles.footer}>
					<button className={styles.footerClearBtn} onClick={handleClear}>
						Очистить
					</button>
					{runError && (
						<span className={styles.runError}>{runError}</span>
					)}
					<div className={styles.footerRight}>
						<ValidationTooltip errors={validationErrors}>
							<button className={styles.footerSecondBtn} onClick={handleTestRun}
							        disabled={validationErrors.length > 0}>
								Тестовый сбор
								<span className={styles.keybind}>^↵</span>
							</button>
						</ValidationTooltip>
						<button className={styles.footerSecondBtn} onClick={handleSaveDraft}>
							Сохранить
							<span className={styles.keybind}>^S</span>
						</button>
						<ValidationTooltip errors={validationErrors}>
							<button className={styles.footerPrimaryBtn} onClick={handleRun}
							        disabled={validationErrors.length > 0 || isRunning}>
								{isRunning ? "Запуск…" : "Запустить"}
							</button>
						</ValidationTooltip>
					</div>
				</div>

			</div>
		</div>,
		document.body,
	);
}