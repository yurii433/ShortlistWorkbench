import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { JobsList } from "./JobsList";
import { Workbench } from "./Workbench";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<JobsList />} />
        <Route path="/job/:jobId" element={<Workbench />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);