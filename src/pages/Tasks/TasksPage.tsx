import { useEffect, useRef, useState } from "react";
import { useMatch, useNavigate, useSearchParams } from "react-router-dom";
import TaskCard, { type Task } from "../../components/TaskCard/TaskCard";
import LogsModal from "../../components/LogsModal/LogsModal";
import ArtifactsModal from "../../components/ArtifactsModal/ArtifactsModal";
import ChartModal from "../../components/ChartModal/ChartModal";
import ResultsModal from "../../components/ResultsModal/ResultsModal";
import NewTaskModal from "../../components/NewTaskModal/NewTaskModal";
import Dropdown from "../../components/Dropdown/Dropdown";
import styles from "./TasksPage.module.css";

const ITEMS_PER_PAGE = 10;

const SEARCH_FIELDS = [
  { value: "tag",  label: "Тег" },
  { value: "uuid", label: "UUID" },
];

export default function TasksPage() {
  const logsMatch      = useMatch("/task/:uuid/logs");
  const artifactsMatch = useMatch("/task/:uuid/artifacts/queries");
  const chartMatch     = useMatch("/task/:uuid/statistic/chart/");
  const resultsMatch   = useMatch("/task/:uuid/artifacts/results/:queryUuid/");
  const newTaskMatch   = useMatch("/tasks/new/");
  const navigate = useNavigate();

  const logsUuid         = logsMatch?.params.uuid;
  const artifactsUuid    = artifactsMatch?.params.uuid;
  const chartUuid        = chartMatch?.params.uuid;
  const resultsUuid      = resultsMatch?.params.uuid;
  const resultsQueryUuid = resultsMatch?.params.queryUuid;

  const [searchParams, setSearchParams] = useSearchParams();

  const [tasks, setTasks]   = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage]       = useState(1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const searchField = searchParams.has("uuid") ? "uuid" : "tag";
  const searchQuery = searchParams.get(searchField) ?? "";

  const setSearch = (field: string, query: string) => {
    setPage(1);
    setSearchParams(query ? { [field]: query } : {});
  };

  const fetchTasks = (field?: string, query?: string) => {
    const url = (field && query)
      ? `/orch/tasks/?${encodeURIComponent(field)}=${encodeURIComponent(query)}`
      : "/orch/tasks/";
    return fetch(url)
      .then((r) => r.json())
      .then((data) => (data.items ?? []));
  };

  const refresh = () => {
    setLoading(true);
    fetchTasks(searchField, searchQuery || undefined).then(setTasks).finally(() => setLoading(false));
  };

  // Initial load
  useEffect(() => {
    fetchTasks().then(setTasks).finally(() => setLoading(false));
  }, []);

  // Re-fetch when URL search params change, debounced
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setLoading(true);
      fetchTasks(searchField, searchQuery || undefined).then(setTasks).finally(() => setLoading(false));
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchQuery, searchField]);

  useEffect(() => {
    const es = new EventSource("/orch/tasks/sse/");

    es.addEventListener("task_created", () => {
      fetchTasks(searchField, searchQuery || undefined).then(setTasks);
    });

    es.addEventListener("pod_status_changed", (e) => {
      const { task_uuid, phase } = JSON.parse(e.data) as {
        task_uuid: string;
        phase: string;
      };
      setTasks((prev) =>
        prev.map((t) =>
          t.task_uuid === task_uuid ? { ...t, pod_status: phase } : t
        )
      );
    });

    es.addEventListener("task_deleted", (e) => {
      const { task_uuid } = JSON.parse(e.data) as { task_uuid: string };
      setTasks((prev) => prev.filter((t) => t.task_uuid !== task_uuid));
    });

    return () => es.close();
  }, []);

  const activeTasks = tasks.filter((t) => t.pod_status.toLowerCase() === "running").length;
  const totalPages  = Math.max(1, Math.ceil(tasks.length / ITEMS_PER_PAGE));
  const safePage    = Math.min(page, totalPages);
  const paginated   = tasks.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);

  const goTo = (p: number) => setPage(Math.max(1, Math.min(p, totalPages)));

  return (
    <main className={styles.page}>
      <NewTaskModal isOpen={!!newTaskMatch} onClose={() => navigate("/tasks/")} />
      {logsUuid && (
        <LogsModal taskUuid={logsUuid} onClose={() => navigate("/tasks/")} />
      )}
      {artifactsUuid && (
        <ArtifactsModal taskUuid={artifactsUuid} onClose={() => navigate("/tasks/")} />
      )}
      {chartUuid && (
        <ChartModal taskUuid={chartUuid} onClose={() => navigate("/tasks/")} />
      )}
      {resultsUuid && resultsQueryUuid && (
        <ResultsModal
          taskUuid={resultsUuid}
          queryUuid={resultsQueryUuid}
          onClose={() => navigate("/tasks/")}
        />
      )}

      <div className={styles.pageHeader}>
        <div className={styles.searchGroup}>
          <Dropdown
            trigger={SEARCH_FIELDS.find((f) => f.value === searchField)?.label}
            items={SEARCH_FIELDS.map((f) => ({ label: f.label, value: f.value }))}
            activeValue={searchField}
            showArrow
            triggerClassName={styles.searchDropdownBtn}
            onSelect={(v) => setSearch(v, searchQuery)}
          />
          <input
            className={styles.searchInput}
            type="text"
            placeholder="Поиск..."
            value={searchQuery}
            onChange={(e) => setSearch(searchField, e.target.value)}
          />
        </div>
        <div className={styles.headerActions}>
          <button className={styles.btnPrimary} onClick={() => navigate("/tasks/new/")}>
            Поставить задачу
          </button>
          <button className={styles.btnSecondary} onClick={refresh}>
            Обновить
          </button>
        </div>
      </div>

      <div className={styles.taskList}>
        {loading && <p className={styles.empty}>Загрузка...</p>}
        {!loading && tasks.length === 0 && (
          <p className={styles.empty}>Нет задач</p>
        )}
        {paginated.map((task) => (
          <TaskCard
            key={task.task_uuid}
            task={task}
          />
        ))}
      </div>

      <div className={styles.pageFooter}>
        <div className={styles.footerLeft}>
          <span className={styles.activeCount}>
            Активных: <strong>{activeTasks}</strong>
          </span>
          <button className={styles.btnSecondary} onClick={() => navigate("/statistics/")}>
            Статистика
          </button>
        </div>

        {totalPages > 1 && (
          <div className={styles.pagination}>
            <button
              className={styles.pageBtn}
              onClick={() => goTo(safePage - 1)}
              disabled={safePage === 1}
            >
              ‹
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                className={`${styles.pageBtn} ${p === safePage ? styles.pageBtnActive : ""}`}
                onClick={() => goTo(p)}
              >
                {p}
              </button>
            ))}
            <button
              className={styles.pageBtn}
              onClick={() => goTo(safePage + 1)}
              disabled={safePage === totalPages}
            >
              ›
            </button>
          </div>
        )}
      </div>
    </main>
  );
}