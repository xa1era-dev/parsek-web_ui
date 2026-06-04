import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import InfoPanel from "../InfoPanel/InfoPanel";
import Dropdown from "../Dropdown/Dropdown";
import styles from "./TaskCard.module.css";

export interface Task {
	task_uuid: string;
	pod_status: string;
	group_tag?: string;
	time_create?: string;
}

interface TaskDetail {
	success: boolean;
	status: string;
	config: {
		task: { threads: number };
		statistic: {
			init_count: number;
			added_count: number;
			success_count: number;
			fail_count: number;
		};
		in_pipe: Record<string, unknown>;
		out_pipe: Record<string, unknown>;
		parser: string;
	};
}

const STATUS_CLASS: Record<string, string> = {
	RUNNING: styles.cardHeaderRunning,
	PAUSED: styles.cardHeaderPaused,
	PAUSING: styles.cardHeaderPaused,
	STOPPED: styles.cardHeaderStopped,
	STOPPING: styles.cardHeaderStopped,
	ERROR: styles.cardHeaderError,
};

const POD_STATUS_LABEL: Record<string, string> = {
	running: "Выполняется",
	terminating: "Удаляется",
	succeeded: "Завершена",
	failed: "Ошибка",
	queued: "В очереди",
};

const APP_STATUS_LABEL: Record<string, string> = {
	RUNNING: "Выполняется",
	PAUSED: "Пауза",
	PAUSING: "Ставится на паузу",
	STOPPED: "Остановлено",
	STOPPING: "Останавливается",
	ERROR: "Ошибка",
};

export default function TaskCard({ task }: { task: Task }) {
	const navigate = useNavigate();

	const podStatus = (task.pod_status ?? "").toLowerCase();
	const podStatusRu = POD_STATUS_LABEL[podStatus] || podStatus;
	const podRunning = podStatus === "running";
	const podFailed = podStatus === "failed";

	const [detail, setDetail] = useState<TaskDetail | null>(null);
	const [podLogs, setPodLogs] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
	const [threadStatuses, setThreadStatuses] = useState<Record<number, string>>({});
	const [requestsPct, setRequestsPct] = useState(false);
	const [errorsPct, setErrorsPct] = useState(false);
	const [speed, setSpeed] = useState<number | null>(null);
	const timestampsRef = useRef<number[]>([]);
	const [confirmDelete, setConfirmDelete] = useState(false);

	useEffect(() => {
		setDetail(null);
		setPodLogs(null);
		setThreadStatuses({});
		setSpeed(null);
		timestampsRef.current = [];

		if (podStatus === "failed") {
			setLoading(true);
			fetch(`/orch/tasks/${task.task_uuid}/pod_logs/`)
				.then((r) => r.json())
				.then((data: string) => setPodLogs(data ?? ""))
				.catch(() => setPodLogs(""))
				.finally(() => setLoading(false));
			return;
		}

		if (podStatus !== "running" && podStatus !== "succeeded" && podStatus !== "queued") {
			setLoading(false);
			return;
		}

		setLoading(true);

		if (podStatus === "queued") {
			fetch(`/orch/tasks/${task.task_uuid}/config/`)
				.then((r) => r.json())
				.then((config) => {
					if (!config) return;
					setDetail({
						success: true,
						status: "",
						config: {
							task: config.task ?? { threads: 0 },
							in_pipe: config.in_pipe ?? {},
							out_pipe: config.out_pipe ?? {},
							parser: config.parser ?? "—",
							statistic: config.statistic ?? { init_count: 0, added_count: 0, success_count: 0, fail_count: 0 },
						},
					});
				})
				.finally(() => setLoading(false));
			return;
		}

		if (podStatus === "succeeded") {
			Promise.all([
				fetch(`/orch/tasks/${task.task_uuid}/config/`).then((r) => r.json()),
				fetch(`/api/task/${task.task_uuid}/statistics/`).then((r) => r.json()),
			])
				.then(([config, stats]) => {
					setDetail({
						success: true,
						status: "STOPPED",
						config: {
							task: config?.task ?? { threads: 0 },
							in_pipe: config?.in_pipe ?? {},
							out_pipe: config?.out_pipe ?? {},
							parser: config?.parser ?? "—",
							statistic: stats,
						},
					});
				})
				.finally(() => setLoading(false))

			return;
		}

		// running: launch all fetches in parallel
		let es: EventSource | null = null;

		const detailPromise = fetch(`/orch/tasks/${task.task_uuid}/`).then((r) => r.json());


		detailPromise.then((data) => {
			const threadPromise = fetch(`/orch/tasks/${task.task_uuid}/get_thread_status/`)
				.then((r) => r.json())
				.then((d: { thread_statuses: { status: string }[] }) => {
					const dict: Record<number, string> = {};
					d.thread_statuses.forEach((t, i) => { dict[i] = t.status; });
					setThreadStatuses(dict);
				})
				.catch(() => {});

			const speedPromise = fetch(`/api/task/${task.task_uuid}/speed/`)
				.then((r) => r.json())
				.then((d: number[]) => { if (Array.isArray(d)) timestampsRef.current = d; })
				.catch(() => {});
			void Promise.all([threadPromise, speedPromise]);
			if (!data.success) { setLoading(false); return; }
			setDetail(data);
			setLoading(false);

			es = new EventSource(`/orch/tasks/${task.task_uuid}/sse/`);

			es.addEventListener("CHANGE_STATUS", (e) => {
				const newStatus: string = JSON.parse(e.data);
				setDetail((prev) => (prev ? { ...prev, status: newStatus } : prev));
			});

			es.addEventListener("INITIALIZED_QUERIES", (e) => {
				const count = Number(JSON.parse(e.data));
				if (isNaN(count)) return;
				setDetail((prev) => {
					if (!prev) return prev;
					const s = prev.config.statistic;
					return {
						...prev,
						config: {
							...prev.config,
							statistic: {
								init_count: count,
								added_count: s?.added_count ?? 0,
								fail_count: s?.fail_count ?? 0,
								success_count: s?.success_count ?? 0,
							},
						},
					} as TaskDetail;
				});
			});

			es.addEventListener("PARSED_QUERIES", (e) => {
				const data: string | string[] = JSON.parse(e.data);
				const count = Array.isArray(data) ? data.length : 1;
				const now = Date.now() / 1000;
				for (let i = 0; i < count; i++) timestampsRef.current.push(now);
				setDetail((prev) => {
					if (!prev) return prev;
					const s = prev.config.statistic;
					return {
						...prev,
						config: {
							...prev.config,
							statistic: {
								init_count: s?.init_count ?? 0,
								added_count: s?.added_count ?? 0,
								fail_count: s?.fail_count ?? 0,
								success_count: (s?.success_count ?? 0) + count,
							},
						},
					} as TaskDetail;
				});
			});

			es.addEventListener("FAILED_QUERIES", (e) => {
				const data: string | string[] = JSON.parse(e.data);
				const count = Array.isArray(data) ? data.length : 1;
				setDetail((prev) => {
					if (!prev) return prev;
					const s = prev.config.statistic;
					return {
						...prev,
						config: {
							...prev.config,
							statistic: {
								init_count: s?.init_count ?? 0,
								added_count: s?.added_count ?? 0,
								fail_count: (s?.fail_count ?? 0) + count,
								success_count: (s?.success_count ?? 0) - count,
							},
						},
					} as TaskDetail;
				});
			});

			es.addEventListener("ADDED_QUERIES", (e) => {
				const data: string | string[] = JSON.parse(e.data);
				const count = Array.isArray(data) ? data.length : 1;
				setDetail((prev) => {
					if (!prev) return prev;
					const s = prev.config.statistic;
					return {
						...prev,
						config: {
							...prev.config,
							statistic: {
								init_count: s?.init_count ?? 0,
								success_count: s?.success_count ?? 0,
								fail_count: s?.fail_count ?? 0,
								added_count: (s?.added_count ?? 0) + count,
							},
						},
					} as TaskDetail;
				});
			});

			es.addEventListener("CHANGE_THREAD_STATUS", (e) => {
				const states: string[] = JSON.parse(e.data);
				const ids = (e as MessageEvent).lastEventId.split(";").map(Number);
				setThreadStatuses((prev) => {
					const next = { ...prev };
					ids.forEach((id, i) => { if (i < states.length) next[id] = states[i]; });
					return next;
				});
			});
		});

		return () => es?.close();
	}, [task.task_uuid, podStatus]);

	useEffect(() => {
		if (podStatus !== "running") return;
		const id = setInterval(() => {
			const cutoff = Date.now() / 1000 - 60;
			timestampsRef.current = timestampsRef.current.filter((ts) => ts > cutoff);
			setSpeed(timestampsRef.current.length / 60);
		}, 1000);
		return () => clearInterval(id);
	}, [podStatus]);

	const handlePause    = () => fetch(`/orch/tasks/${task.task_uuid}/pause/`,    { method: "POST" });
	const handleResume   = () => fetch(`/orch/tasks/${task.task_uuid}/start/`,    { method: "POST" });
	const handleStop     = () => fetch(`/orch/tasks/${task.task_uuid}/stop/`,     { method: "POST" });
	const handleComplete = () => fetch(`/orch/tasks/${task.task_uuid}/complete/`, { method: "POST" });
	const handleDelete   = () => fetch(`/orch/tasks/${task.task_uuid}/`,         { method: "DELETE" });

	const cardHeader = (
		<div className={styles.cardHeader}>
			<div className={styles.cardHeaderRow}>
				<div className={styles.headerCell}>
					<span>{detail?.config.parser ?? "—"}</span>
					{task.group_tag && (
						<span className="clickable" title="Отфильтровать по тегу">#{task.group_tag}</span>
					)}
				</div>
				<div className={styles.headerCell}>
					<span>{task.task_uuid}</span>
				</div>
				<div className={styles.headerCell}>
					<span>
						{task.time_create
							? new Date(Number(task.time_create) * 1000).toLocaleString("ru-RU")
							: "—"}
					</span>
				</div>
				<div className={styles.headerCell}>
					<span>
						{podRunning
							? (APP_STATUS_LABEL[detail?.status ?? ""] ?? detail?.status ?? "—")
							: podStatusRu}
					</span>
				</div>
			</div>
		</div>
	);

	if (loading) {
		return (
			<div className={styles.card}>
				{cardHeader}
				<div className={styles.cardBody}>
					<div className={styles.cardFooter}>
						<span className={styles.footerInfo}>pod: {podStatusRu}</span>
						<span className={styles.footerInfo}>Загружается...</span>
					</div>
				</div>
			</div>
		);
	}

	const status = detail?.status ?? "";
	const statusClass = STATUS_CLASS[status] ?? "";
	const stat = detail?.config.statistic;
	const isPausedOrStopped = status === "PAUSED" || status === "STOPPED";
	const isTransitioning = status === "PAUSING" || status === "STOPPING";

	const firstVal = (obj: Record<string, unknown>) => String(Object.values(obj)[0] ?? "—");

	const total = stat ? stat.init_count + stat.added_count : 0;

	const threadValues = Object.values(threadStatuses);
	const hasThreadData = threadValues.length > 0;
	const runningThreads = hasThreadData
		? threadValues.filter((s) => s === "RUNNING" || s === "PAUSING").length
		: null;
	const waitingThreads = hasThreadData
		? threadValues.filter((s) => s === "WAITING").length
		: 0;

	const requestsLabel = (() => {
		if (!stat) return "—";
		const processed = stat.success_count + stat.fail_count;
		if (requestsPct) {
			const pct = total > 0 ? ((processed / total) * 100).toFixed(1) : "0.0";
			return `${pct}%`;
		}
		const base = `${processed} / ${stat.init_count}`;
		return stat.added_count > 0 ? `${base} (+ ${stat.added_count})` : base;
	})();

	const errorsLabel = (() => {
		if (!stat) return "—";
		if (errorsPct) {
			const processed = stat.success_count + stat.fail_count;
			const pct = processed > 0 ? ((stat.fail_count / processed) * 100).toFixed(1) : "0.0";
			return `${pct}%`;
		}
		return String(stat.fail_count);
	})();

	return (
		<div className={`${styles.card} ${statusClass} ${podFailed ? styles.cardHeaderError : ""}`}>
			{cardHeader}

			<div className={styles.cardBody}>
				{podFailed && podLogs !== null && (
					<pre className={styles.podLogs}>{podLogs.trim() || "(логи пусты)"}</pre>
				)}

				{!podFailed && (
					<div className={styles.panels}>
						<InfoPanel
							label="Конфиг"
							buttonLabel="Артефакты"
							onButtonClick={() => navigate(`/task/${task.task_uuid}/artifacts/queries/`)}
							enabledButton={podStatus !== "queued"}
							rows={[
								{
									name: "Источник",
									value: detail ? firstVal(detail.config.in_pipe) : "—",
								},
								{
									name: "Результаты",
									value: detail ? firstVal(detail.config.out_pipe) : "—",
								},
							]}
						/>
						{(
							<InfoPanel
								label="Работа"
								buttonLabel="Логи"
								enabledButton={podStatus !== "queued"}
								onButtonClick={() => navigate(`/task/${task.task_uuid}/logs/`)}
								rows={[
									{
										name: "Запросы",
										value: requestsLabel,
										onValueClick: stat ? () => setRequestsPct((v) => !v) : undefined,
										description: "Переключить отображение процентов",
									},
									{
										name: "Потоки",
										value: detail ? (
											<>
												{runningThreads ?? "—"} / {detail.config.task.threads}
												{!!waitingThreads && (
													<span style={{ color: "#f5c518", fontWeight: 700, marginLeft: 6 }}>
														ожид: {waitingThreads}
													</span>
												)}
											</>
										) : "—",
									},
								]}
							/>
						)}
						{(
							<InfoPanel
								label="Статистика"
								buttonLabel="График"
								onButtonClick={() => navigate(`/task/${task.task_uuid}/statistic/chart/`)}
								enabledButton={podStatus !== "queued"}
								rows={[
									{
										name: "Ошибки",
										value: errorsLabel,
										onValueClick: stat ? () => setErrorsPct((v) => !v) : undefined,
										description: "Переключить отображение процентов",
									},
									{
										name: "Скорость",
										value: speed !== null ? `${speed.toFixed(1)}/с` : "—",
									},
								]}
							/>
						)}
					</div>
				)}

				<div className={styles.cardFooter}>
					<span className={styles.footerInfo}>
						
					</span>
					<div className={styles.footerActions}>
						{podRunning ? (
							<>
								{isPausedOrStopped ? (
									<button
										className={styles.btnResume}
										onClick={handleResume}
										disabled={isTransitioning}
									>
										Возобновить
									</button>
								) : (
									<button
										className={styles.btnPause}
										onClick={handlePause}
										disabled={isTransitioning}
									>
										Пауза
									</button>
								)}
								<Dropdown
									portal
									placement="top-end"
									trigger="▾"
									triggerClassName={styles.btnDropdown}
									listClassName={styles.dropdownMenu}
									itemClassName={styles.dropdownItem}
									items={[
										{ label: "Остановить", onClick: () => handleStop() },
										{ label: "Завершить",  onClick: () => handleComplete() },
										{ label: "Удалить", danger: true, onClick: () => setConfirmDelete(true) },
									]}
								/>
							</>
						) : (
							<button className={styles.btnDelete} onClick={() => setConfirmDelete(true)}>
								Удалить
							</button>
						)}
					</div>
				</div>
			</div>

			{confirmDelete &&
				createPortal(
					<div className="modalOverlay">
						<div className={styles.modal}>
							<p className={styles.modalText}>
								Удаление задачи приведет к удалению контейнера из k8s кластера, а
								также удалению файлов артефактов на хосте
							</p>
							<div className={styles.modalActions}>
								<button
									className={styles.btnDelete}
									onClick={() => { handleDelete(); setConfirmDelete(false); }}
								>
									Удалить
								</button>
								<button
									className={styles.btnCancel}
									onClick={() => setConfirmDelete(false)}
								>
									Отмена
								</button>
							</div>
						</div>
					</div>,
					document.body,
				)}
		</div>
	);
}