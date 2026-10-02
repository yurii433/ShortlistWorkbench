import { Route, Routes } from "react-router-dom";
import { JobsPage } from "./pages/JobsPage";
import { WorkbenchPage } from "./pages/WorkbenchPage";

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<JobsPage />} />
      <Route path="/job/:jobId" element={<WorkbenchPage />} />
      <Route path="*" element={<JobsPage />} />
    </Routes>
  );
}
