import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Header } from "./components/Header";
import { ProblemsPage } from "./pages/ProblemsPage";
import { ProblemDetailsPage } from "./pages/ProblemDetailsPage";
import { PracticePage } from "./pages/PracticePage";
import { FeedbackPage } from "./pages/FeedbackPage";
import { HistoryPage } from "./pages/HistoryPage";

export const App: React.FC = () => {
  return (
    <Router>
      <div className="min-h-screen flex flex-col bg-black text-ink antialiased">
        <Header />
        <main className="flex-1 flex flex-col">
          <Routes>
            {/* 1. Problems Catalog */}
            <Route path="/" element={<ProblemsPage />} />
            <Route path="/problems" element={<ProblemsPage />} />

            {/* 2. Problem Details */}
            <Route path="/problems/:id" element={<ProblemDetailsPage />} />

            {/* 3. Practice Workspace */}
            <Route path="/practice/:attemptId" element={<PracticePage />} />

            {/* 4. Feedback Scorecard */}
            <Route path="/feedback/:attemptId" element={<FeedbackPage />} />

            {/* 5. Attempt History */}
            <Route path="/history" element={<HistoryPage />} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
};
