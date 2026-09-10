import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Problem, DifficultyLevel, Attempt } from "../types";
import { api } from "../services/api";
import { RubricPanel } from "../components/RubricPanel";

export const ProblemDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [problem, setProblem] = useState<Problem | null>(null);
  const [previousAttempts, setPreviousAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (!id) return;
    let isMounted = true;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const [probData, historyData] = await Promise.all([
          api.getProblem(id),
          api.getUserAttempts("candidate-alpha").catch(() => []),
        ]);
        if (isMounted) {
          setProblem(probData);
          setPreviousAttempts(historyData.filter((a) => a.problem?.id === id));
        }
      } catch (err: any) {
        if (isMounted) setError(err.message || "Failed to load problem details.");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchData();
    return () => {
      isMounted = false;
    };
  }, [id]);

  const handleStartAttempt = async () => {
    if (!problem) return;
    try {
      setStarting(true);
      const attempt = await api.startAttempt("candidate-alpha", problem.id);
      navigate(`/practice/${attempt.id}`);
    } catch (err: any) {
      alert("Failed to start practice attempt. Please verify the backend is running.");
    } finally {
      setStarting(false);
    }
  };

  const getDifficultyBadge = (difficulty: DifficultyLevel) => {
    switch (difficulty) {
      case "EASY":
        return "bg-emerald-950/40 border-emerald-900/40 text-zinc-300";
      case "MEDIUM":
        return "bg-amber-950/40 border-amber-900/40 text-zinc-300";
      case "HARD":
        return "bg-rose-950/40 border-rose-900/40 text-zinc-300";
    }
  };

  const getEstimatedTime = (difficulty: DifficultyLevel) => {
    switch (difficulty) {
      case "EASY":
        return "25–35 min";
      case "MEDIUM":
        return "40–50 min";
      case "HARD":
        return "60–75 min";
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center">
        <span className="text-xs font-mono text-zinc-500 animate-pulse">
          Loading problem statement...
        </span>
      </div>
    );
  }

  if (error || !problem) {
    return (
      <div className="max-w-md mx-auto my-20 p-6 border border-white/10 bg-[#0a0a0a] rounded-lg text-center space-y-3">
        <h2 className="text-base font-semibold text-white">Problem Not Found</h2>
        <p className="text-xs text-zinc-400">{error || "Could not retrieve problem details."}</p>
        <Link
          to="/"
          className="inline-block px-3.5 py-1.5 bg-white text-black text-xs font-medium rounded hover:bg-zinc-200 transition-colors"
        >
          Return to Problems
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-6 animate-fade-in">
      {/* Breadcrumb Navigation */}
      <div className="text-xs font-mono text-zinc-500 flex items-center gap-1.5 animate-slide-up">
        <Link to="/problems" className="hover:text-white transition-colors">
          Problems
        </Link>
        <span>/</span>
        <span className="text-zinc-300 font-medium">{problem.slug || problem.id}</span>
      </div>

      {/* 70% Content / 30% Sidebar Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Main Technical Problem Statement (70% - 8 cols) */}
        <div className="lg:col-span-8 space-y-8 animate-slide-up delay-1">
          {/* Title Header */}
          <div className="space-y-2 border-b border-white/10 pb-5">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              {problem.title}
            </h1>
            <p className="text-xs font-mono text-zinc-500">
              Reference: {problem.id}
            </p>
          </div>

          {/* Problem Statement Section */}
          <section className="space-y-3">
            <h2 className="text-xs font-mono font-semibold uppercase tracking-wider text-zinc-400">
              01 — Problem Statement
            </h2>
            <div className="text-sm sm:text-base text-zinc-200 leading-relaxed space-y-2">
              <p>{problem.description}</p>
            </div>
          </section>

          {/* Functional Requirements Section */}
          <section className="space-y-3">
            <h2 className="text-xs font-mono font-semibold uppercase tracking-wider text-zinc-400">
              02 — Functional Requirements
            </h2>
            <ul className="space-y-2.5 text-sm text-zinc-300">
              {problem.requirements?.map((req, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <span className="font-mono text-xs text-zinc-500 shrink-0 mt-0.5">
                    [{String(idx + 1).padStart(2, "0")}]
                  </span>
                  <span className="leading-relaxed">{req}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Assumptions & Constraints Section */}
          {problem.assumptions && problem.assumptions.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-xs font-mono font-semibold uppercase tracking-wider text-zinc-400">
                03 — Scope & Architectural Constraints
              </h2>
              <ul className="space-y-2 text-sm text-zinc-400">
                {problem.assumptions.map((asm, idx) => (
                  <li key={idx} className="flex items-start gap-2.5">
                    <span className="text-zinc-600 shrink-0">•</span>
                    <span className="leading-relaxed">{asm}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Evaluation Rubric Accordion */}
          {problem.rubric && (
            <section className="space-y-3">
              <h2 className="text-xs font-mono font-semibold uppercase tracking-wider text-zinc-400">
                04 — Evaluation Criteria Rubric
              </h2>
              <RubricPanel rubric={problem.rubric} />
            </section>
          )}
        </div>

        {/* Sidebar Attempt Panel (30% - 4 cols) */}
        <div className="lg:col-span-4 space-y-4 lg:sticky lg:top-20 animate-slide-up delay-2">
          <div className="border border-white/10 rounded-lg bg-[#0a0a0a] p-5 space-y-5 card-hover">
            <div className="space-y-1">
              <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 block">
                Session Setup
              </span>
              <h3 className="text-sm font-semibold text-white">
                Practice Session
              </h3>
            </div>

            <div className="space-y-3 py-3 border-y border-white/10 text-xs font-mono text-zinc-400">
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Difficulty</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] border ${getDifficultyBadge(problem.difficulty)}`}>
                  {problem.difficulty}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Estimated Time</span>
                <span className="text-zinc-200 font-medium">{getEstimatedTime(problem.difficulty)}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Format</span>
                <span className="text-zinc-200 font-medium">4-Part Submission</span>
              </div>

              {previousAttempts.length > 0 && (
                <div className="flex items-center justify-between pt-1 border-t border-white/5">
                  <span className="text-zinc-500">Previous Attempts</span>
                  <span className="text-zinc-200 font-medium">{previousAttempts.length} logged</span>
                </div>
              )}
            </div>

            <button
              onClick={handleStartAttempt}
              disabled={starting}
              className="w-full py-2.5 px-4 bg-white hover:bg-zinc-200 text-black text-xs font-medium rounded-md btn-interactive transition-all disabled:opacity-50 flex items-center justify-center gap-2 group"
            >
              <span>{starting ? "Initializing attempt..." : "Start attempt"}</span>
              <span className="font-mono text-sm inline-block transition-transform duration-200 group-hover:translate-x-1">&rarr;</span>
            </button>

            <p className="text-[11px] text-zinc-500 leading-normal text-center font-mono">
              Take a few minutes to read the constraints before you start writing code.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
