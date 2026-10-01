import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { JobsList } from "./pages/JobsList";
import { Workbench } from "./pages/Workbench";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<JobsList />} />
        <Route path="/job/:jobId" element={<Workbench />} />
        <Route path="*" element={<JobsList />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
