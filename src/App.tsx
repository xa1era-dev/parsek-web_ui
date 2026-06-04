import { Routes, Route, Navigate } from "react-router-dom";
import Header from "./components/Header/Header";
import TasksPage from "./pages/Tasks/TasksPage";

export default function App() {
  return (
    <>
      <Header />
      <Routes>
        <Route path="/tasks/" element={<TasksPage />} />
        <Route path="/tasks/new/" element={<TasksPage />} />
        <Route path="/task/:uuid/logs" element={<TasksPage />} />
        <Route path="/task/:uuid/artifacts/queries" element={<TasksPage />} />
        <Route path="/task/:uuid/statistic/chart/" element={<TasksPage />} />
        <Route path="/task/:uuid/artifacts/results/:queryUuid/" element={<TasksPage />} />
        <Route path="/" element={<Navigate to="/tasks/" replace />} />
      </Routes>
    </>
  );
}