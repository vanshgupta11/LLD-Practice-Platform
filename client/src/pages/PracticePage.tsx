import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import Editor from "@monaco-editor/react";
import { Attempt } from "../types";
import { api } from "../services/api";
import { StatusBadge } from "../components/StatusBadge";
import { RubricPanel } from "../components/RubricPanel";

type SubmitPhase = "idle" | "submitting" | "evaluating" | "done" | "failed";

export const PracticePage: React.FC = () => {
  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();

  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState<SubmitPhase>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Left panel view: Requirements vs Rubric
  const [leftTab, setLeftTab] = useState<"requirements" | "rubric">("requirements");

  // Right workspace active section
  const [activeTab, setActiveTab] = useState<"assumptions" | "classes" | "explanation" | "code">("assumptions");

  // Form fields
  const [assumptions, setAssumptions] = useState("");
  const [classDesign, setClassDesign] = useState("");
  const [explanation, setExplanation] = useState("");
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState<string>("cpp");

  const loadAttempt = useCallback(async () => {
    if (!attemptId) return;
    try {
      setLoading(true);
      const data = await api.getAttempt(attemptId);
      setAttempt(data);

      if (data.status === "COMPLETED") {
        navigate(`/feedback/${attemptId}`, { replace: true });
        return;
      }

      if (data.submission) {
        setAssumptions(data.submission.assumptions || "");
        setClassDesign(data.submission.classDesign || "");
        setExplanation(data.submission.explanation || "");
        setCode(data.submission.code || "");
      }

      if (data.status === "FAILED") {
        setPhase("failed");
        setErrorMessage(data.errorMessage || "Evaluation failed. You can retry evaluation or start a new attempt.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load attempt.");
    } finally {
      setLoading(false);
    }
  }, [attemptId, navigate]);

  useEffect(() => {
    loadAttempt();
  }, [loadAttempt]);

  const handleFillStarter = () => {
    if (!attempt) return;
    setAssumptions(
      `1. Single entry and exit flow with automated ticketing.\n` +
      `2. Supports standard vehicle types: Two-Wheeler, Car, Truck.\n` +
      `3. Pluggable spot-allocation (Nearest-first, Lowest-floor-first).\n` +
      `4. In-memory data store with thread-safe synchronized locks.`
    );
    setClassDesign(
      `// High-Level Class & Interface Design (C++)\n` +
      `class ParkingLot {\n` +
      `  - floors: vector<Floor>\n` +
      `  - allocationStrategy: unique_ptr<SpotAllocationStrategy>\n` +
      `  - pricingStrategy: unique_ptr<PricingStrategy>\n` +
      `  + parkVehicle(Vehicle v): Ticket\n` +
      `  + processExit(Ticket ticket): Invoice\n` +
      `};\n\n` +
      `class SpotAllocationStrategy {\n` +
      `  + virtual shared_ptr<Spot> findSpot(const vector<Floor>& floors, VehicleType type) = 0;\n` +
      `};\n\n` +
      `class PricingStrategy {\n` +
      `  + virtual double calculateFee(const Ticket& ticket, time_t exitTime) = 0;\n` +
      `};`
    );
    setExplanation(
      `### Design Rationale & SOLID Analysis\n` +
      `- **Strategy Pattern**: Spot allocation and fee calculation are decoupled via pure virtual strategy interfaces to adhere to the Open/Closed Principle.\n` +
      `- **Single Responsibility**: Floor manages spot collections; ParkingLot coordinates orchestration.\n` +
      `- **Memory & Concurrency**: RAII smart pointers (unique_ptr/shared_ptr) prevent memory leaks; mutex locks ensure thread safety on spot reservations.`
    );
    setCode(
      `#include <iostream>\n` +
      `#include <vector>\n` +
      `#include <memory>\n` +
      `#include <string>\n` +
      `#include <mutex>\n\n` +
      `enum class VehicleType { TWO_WHEELER, CAR, TRUCK };\n\n` +
      `class Spot {\n` +
      `public:\n` +
      `    std::string id;\n` +
      `    int floorNumber;\n` +
      `    VehicleType type;\n` +
      `    bool isOccupied;\n\n` +
      `    Spot(std::string id, int floor, VehicleType t)\n` +
      `        : id(id), floorNumber(floor), type(t), isOccupied(false) {}\n` +
      `};\n\n` +
      `class Floor {\n` +
      `public:\n` +
      `    int floorNumber;\n` +
      `    std::vector<std::shared_ptr<Spot>> spots;\n\n` +
      `    Floor(int num, std::vector<std::shared_ptr<Spot>> s)\n` +
      `        : floorNumber(num), spots(std::move(s)) {}\n` +
      `};\n\n` +
      `class SpotAllocationStrategy {\n` +
      `public:\n` +
      `    virtual ~SpotAllocationStrategy() = default;\n` +
      `    virtual std::shared_ptr<Spot> findSpot(const std::vector<Floor>& floors, VehicleType type) = 0;\n` +
      `};\n\n` +
      `class ParkingLot {\n` +
      `private:\n` +
      `    std::vector<Floor> floors;\n` +
      `    std::unique_ptr<SpotAllocationStrategy> strategy;\n` +
      `    std::mutex mtx;\n\n` +
      `public:\n` +
      `    ParkingLot(std::vector<Floor> floors, std::unique_ptr<SpotAllocationStrategy> strat)\n` +
      `        : floors(std::move(floors)), strategy(std::move(strat)) {}\n` +
      `};`
    );
  };

  const handleSubmitSolution = async () => {
    if (!attemptId) return;
    setErrorMessage(null);

    try {
      setPhase("submitting");
      const result = await api.submitSolution({ attemptId, assumptions, classDesign, explanation, code });
      setAttempt(result.attempt);

      setPhase("evaluating");
      await api.retryEvaluation(attemptId);

      setPhase("done");
      navigate(`/feedback/${attemptId}`);
    } catch (err: any) {
      setPhase("failed");
      setErrorMessage(err.message || "Failed to submit and evaluate solution.");
      try {
        const refreshed = await api.getAttempt(attemptId);
        setAttempt(refreshed);
      } catch (_) { /* ignore */ }
    }
  };

  const isSubmitted = attempt?.status === "SUBMITTED" || attempt?.status === "EVALUATING";
  const isFailed = phase === "failed" || attempt?.status === "FAILED";
  const isLocked = phase === "submitting" || phase === "evaluating" || isSubmitted;

  const hasAssumptions = assumptions.trim().length > 0;
  const hasClasses = classDesign.trim().length > 0;
  const hasExplanation = explanation.trim().length > 0;
  const hasCode = code.trim().length > 0;
  const completedCount = [hasAssumptions, hasClasses, hasExplanation, hasCode].filter(Boolean).length;

  if (loading) {
    return (
      <div className="py-24 text-center">
        <span className="text-xs font-mono text-zinc-500 animate-pulse">
          Loading workspace...
        </span>
      </div>
    );
  }

  if (!attempt) {
    return (
      <div className="max-w-md mx-auto my-20 p-6 border border-white/10 bg-[#0a0a0a] rounded-lg text-center space-y-3">
        <h2 className="text-base font-semibold text-white">Attempt Not Found</h2>
        <p className="text-xs text-zinc-400">Could not find records for the requested practice session.</p>
        <Link
          to="/problems"
          className="inline-block px-3.5 py-1.5 bg-white text-black text-xs font-medium rounded hover:bg-zinc-200 transition-colors"
        >
          Return to Problems
        </Link>
      </div>
    );
  }

  const problem = attempt.problem;

  return (
    <div className="h-[calc(100vh-3.25rem)] flex flex-col bg-black">
      {/* Workspace Top Bar */}
      <div className="bg-[#0a0a0a] border-b border-white/10 px-4 py-2 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/problems"
            className="text-xs font-mono text-zinc-500 hover:text-white transition-colors flex items-center gap-1"
          >
            <span>&larr;</span>
            <span className="hidden sm:inline">Problems</span>
          </Link>
          <div className="h-3 w-px bg-white/10 hidden sm:block" />
          <h1 className="text-sm font-semibold text-white truncate max-w-xs sm:max-w-sm">
            {problem.title}
          </h1>
          <span className="text-[11px] font-mono text-zinc-500 hidden md:inline">
            attempt:{attempt.id.split("-").pop()}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleFillStarter}
            disabled={isLocked}
            className="text-[11px] font-mono text-zinc-400 hover:text-white px-2.5 py-1 rounded-md border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] transition-all disabled:opacity-40 hidden sm:inline-block"
            title="Auto-fill example starter template"
          >
            Load template
          </button>
          <StatusBadge status={attempt.status} size="sm" />
        </div>
      </div>

      {/* Main Two-Column Full-Screen Layout */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* LEFT COLUMN: Problem Reference (40% width) */}
        <div className="w-full lg:w-5/12 border-b lg:border-b-0 lg:border-r border-white/10 flex flex-col bg-[#0a0a0a] overflow-hidden">
          {/* Reference Tabs */}
          <div className="flex border-b border-white/10 bg-white/[0.02] px-3 text-xs font-mono">
            <button
              onClick={() => setLeftTab("requirements")}
              className={`py-2 px-3 border-b-2 font-medium transition-colors ${
                leftTab === "requirements"
                  ? "border-white text-white font-semibold"
                  : "border-transparent text-zinc-500 hover:text-zinc-300"
              }`}
            >
              Requirements
            </button>
            <button
              onClick={() => setLeftTab("rubric")}
              className={`py-2 px-3 border-b-2 font-medium transition-colors ${
                leftTab === "rubric"
                  ? "border-white text-white font-semibold"
                  : "border-transparent text-zinc-500 hover:text-zinc-300"
              }`}
            >
              Rubric
            </button>
          </div>

          {/* Reference Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6 text-sm">
            {leftTab === "requirements" ? (
              <>
                <div className="space-y-2">
                  <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-zinc-500 block">
                    Problem Summary
                  </span>
                  <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
                    {problem.description}
                  </p>
                </div>

                <div className="space-y-2.5">
                  <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-zinc-500 block">
                    Requirements ({problem.requirements?.length || 0})
                  </span>
                  <ul className="space-y-2 text-xs sm:text-sm text-zinc-300">
                    {problem.requirements?.map((req, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="font-mono text-xs text-zinc-500 shrink-0">
                          [{String(idx + 1).padStart(2, "0")}]
                        </span>
                        <span className="leading-relaxed">{req}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {problem.assumptions && problem.assumptions.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-white/10">
                    <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-zinc-500 block">
                      Constraints & Assumptions
                    </span>
                    <ul className="space-y-1.5 text-xs text-zinc-400">
                      {problem.assumptions.map((asm, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-zinc-600">•</span>
                          <span>{asm}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-3">
                <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-zinc-500 block">
                  Evaluation Criteria
                </span>
                {problem.rubric && <RubricPanel rubric={problem.rubric} />}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Solution Editor (60% width) */}
        <div className="w-full lg:w-7/12 flex flex-col bg-black overflow-hidden">
          {/* Section Number Tabs */}
          <div className="flex items-center justify-between border-b border-white/10 bg-[#0a0a0a] px-3">
            <div className="flex overflow-x-auto text-xs font-mono">
              {[
                { id: "assumptions", label: "01 — Assumptions", filled: hasAssumptions },
                { id: "classes", label: "02 — Class Design", filled: hasClasses },
                { id: "explanation", label: "03 — Explanation", filled: hasExplanation },
                { id: "code", label: "04 — Code", filled: hasCode },
              ].map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`py-2.5 px-3 border-b-2 font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                      isActive
                        ? "border-white text-white font-semibold bg-white/[0.04]"
                        : "border-transparent text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    <span>{tab.label}</span>
                    {tab.filled && (
                      <span className="w-1.5 h-1.5 rounded-full bg-zinc-300 inline-block" title="Section has content" />
                    )}
                  </button>
                );
              })}
            </div>

            <span className="text-[11px] font-mono text-zinc-500 pr-2 hidden sm:inline">
              {completedCount}/4 ready
            </span>
          </div>

          {/* Active Section Editor */}
          <div className="flex-1 flex flex-col p-4 overflow-hidden">
            {activeTab === "assumptions" && (
              <div className="flex-1 flex flex-col space-y-2">
                <div className="flex items-baseline justify-between text-xs text-zinc-500 font-mono">
                  <span>Assumptions, Scope & Constraints</span>
                  <span>Markdown / plain text</span>
                </div>
                <textarea
                  value={assumptions}
                  onChange={(e) => setAssumptions(e.target.value)}
                  disabled={isLocked}
                  placeholder="State your assumptions, capacity constraints, concurrency scope, and out-of-scope items..."
                  className="flex-1 w-full p-4 bg-[#0a0a0a] border border-white/10 rounded-lg text-xs sm:text-sm font-mono text-zinc-200 resize-none focus-ring disabled:opacity-50"
                />
              </div>
            )}

            {activeTab === "classes" && (
              <div className="flex-1 flex flex-col space-y-2">
                <div className="flex items-baseline justify-between text-xs text-zinc-500 font-mono">
                  <span>Class Architecture & Relationships</span>
                  <span>UML / class definitions</span>
                </div>
                <textarea
                  value={classDesign}
                  onChange={(e) => setClassDesign(e.target.value)}
                  disabled={isLocked}
                  placeholder="Define class models, methods, attributes, interfaces, and entity relationships..."
                  className="flex-1 w-full p-4 bg-[#0a0a0a] border border-white/10 rounded-lg text-xs sm:text-sm font-mono text-zinc-200 resize-none focus-ring disabled:opacity-50"
                />
              </div>
            )}

            {activeTab === "explanation" && (
              <div className="flex-1 flex flex-col space-y-2">
                <div className="flex items-baseline justify-between text-xs text-zinc-500 font-mono">
                  <span>Design Rationale & Trade-offs</span>
                  <span>SOLID analysis & pattern justification</span>
                </div>
                <textarea
                  value={explanation}
                  onChange={(e) => setExplanation(e.target.value)}
                  disabled={isLocked}
                  placeholder="Explain why you chose specific design patterns (e.g. Strategy, State), how your design follows SOLID principles, and how you handled extensibility..."
                  className="flex-1 w-full p-4 bg-[#0a0a0a] border border-white/10 rounded-lg text-xs sm:text-sm text-zinc-200 resize-none focus-ring disabled:opacity-50"
                />
              </div>
            )}

            {activeTab === "code" && (
              <div className="flex-1 flex flex-col space-y-2">
                <div className="flex items-baseline justify-between text-xs text-zinc-500 font-mono">
                  <span>Core Implementation Code</span>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    disabled={isLocked}
                    className="bg-[#0a0a0a] border border-white/10 text-[11px] text-zinc-300 rounded px-2 py-0.5 font-mono"
                  >
                    <option value="cpp">C++</option>
                    <option value="typescript">TypeScript</option>
                    <option value="java">Java</option>
                    <option value="python">Python</option>
                  </select>
                </div>
                <div className="flex-1 rounded-lg overflow-hidden border border-white/10 bg-black">
                  <Editor
                    height="100%"
                    language={language}
                    theme="vs-dark"
                    value={code}
                    onChange={(val) => setCode(val || "")}
                    options={{
                      minimap: { enabled: false },
                      fontSize: 13,
                      lineNumbers: "on",
                      scrollBeyondLastLine: false,
                      tabSize: 2,
                      fontFamily: "'Geist Mono', 'JetBrains Mono', 'Fira Code', Menlo, Consolas, monospace",
                      readOnly: isLocked,
                      wordWrap: "on",
                      automaticLayout: true,
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Bottom Action Footer */}
          <div className="border-t border-white/10 bg-[#0a0a0a] px-5 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="text-zinc-400 font-mono">
              {phase === "submitting" && (
                <span className="text-zinc-300">Saving your solution snapshot...</span>
              )}
              {phase === "evaluating" && (
                <span className="text-white animate-pulse">Evaluating against rubric criteria...</span>
              )}
              {phase === "failed" && (
                <span className="text-zinc-300">{errorMessage || "Evaluation failed."}</span>
              )}
              {phase === "idle" && (
                <span className="text-zinc-500">Your submission is safely committed when submitted.</span>
              )}
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              {isFailed && (
                <button
                  type="button"
                  onClick={handleSubmitSolution}
                  disabled={isLocked}
                  className="px-3 py-1.5 rounded-md border border-white/10 text-xs font-mono text-white hover:bg-white/10 transition-colors disabled:opacity-50"
                >
                  Retry evaluation
                </button>
              )}

              <button
                type="button"
                onClick={handleSubmitSolution}
                disabled={isLocked || completedCount === 0}
                className="px-4 py-2 bg-white hover:bg-zinc-200 text-black text-xs font-medium rounded-md transition-colors disabled:opacity-40 flex items-center gap-1.5 shadow-sm"
              >
                <span>
                  {phase === "submitting" || phase === "evaluating"
                    ? "Evaluating..."
                    : "Submit solution"}
                </span>
                <span className="font-mono">&rarr;</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
