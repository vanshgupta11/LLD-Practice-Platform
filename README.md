# CipherLLD — Low-Level Design Practice & Evaluation Platform

A focused developer learning platform designed to help software engineers practice **Low-Level System Design (LLD)** and **Object-Oriented Design (OOD)** with structured, rubric-driven automated feedback.

---

## 1. Project Overview & Problem Solved

### The Problem
Preparing for Low-Level Design (LLD) and Machine Coding interviews has historically lacked effective tooling:
- **DSA platforms** (e.g. LeetCode, HackerRank) evaluate binary test cases (pass/fail), but cannot evaluate architecture, SOLID principles, or design patterns.
- **High-Level Design resources** (System Design primers) focus on distributed scalability, microservices, and databases, ignoring class-level modularity.
- **Generic LLMs** (ChatGPT/Claude in open chat) provide uncalibrated, sycophantic "looks good!" reviews without grounding against a consistent scoring rubric.
- **Learners lack an iterative practice loop**: they write code, but receive no objective breakdown of *what they did well*, *why a design choice was problematic*, and *how to fix it*.

### The Solution
**CipherLLD** provides an interactive, structured practice environment where engineers:
1. Explore realistic, bounded LLD problem statements (Parking Lot, Vending Machine, Elevator Controller, Library Management).
2. Deconstruct requirements into **Assumptions**, **Class Architecture**, **SOLID Trade-off Explanations**, and **Code Implementations**.
3. Receive deterministic structural checks and multi-dimensional LLM rubric evaluations.
4. Get actionable feedback distinguishing **Score**, **Observed Evidence**, **Identified Gaps**, and **Actionable Recommendations**.

---

## 2. Key Features

- **Curated Problem Catalog**: 4 real-world LLD problems spanning Easy, Medium, and Hard difficulty levels.
- **Structured Multi-Part Editor**: Dedicated sections for assumptions, class models, rationale, and an integrated **Monaco Editor** for compilable code.
- **Isolated State-Machine Lifecycle**: State transitions (`IN_PROGRESS` $\rightarrow$ `SUBMITTED` $\rightarrow$ `EVALUATING` $\rightarrow$ `COMPLETED` / `FAILED`) guarantee that submission data is safely persisted *before* evaluation begins.
- **Two-Tier Evaluation Engine**:
  - **Rule-Based Evaluator**: Fast, deterministic structural validation.
  - **LLM Evaluator**: Deep semantic evaluation across 5 standardized rubric dimensions using OpenAI / Gemini with strict Zod schema validation.
- **High-Clarity Scorecard**: Executive summary, visual score gauges, and clear distinction between *Evidence*, *Concerns*, and *Suggestions*.
- **Attempt History & Retries**: Tracks progress across attempts and provides one-click evaluation retry on network or provider errors.

---

## 3. Technology Stack

### Backend (`server/`)
- **Runtime**: Node.js with TypeScript
- **Web Framework**: Express.js
- **Database / ODM**: MongoDB with Mongoose (In-Memory MongoDB for testing)
- **Validation**: Zod for runtime DTO validation and LLM response parsing
- **LLM Clients**: Google Gemini API (`@google/generative-ai`) and OpenAI API (`openai`)
- **Testing**: Jest, Supertest, `mongodb-memory-server`

### Frontend (`client/`)
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS with custom developer-focused theme tokens
- **Code Editor**: `@monaco-editor/react`
- **Routing & Icons**: `react-router-dom`, `lucide-react`

---

## 4. Architecture

CipherLLD is built following **Clean Architecture** and **SOLID principles**:

```
cipher/
├── client/                     # React Single-Page Application
│   ├── src/
│   │   ├── components/         # CriteriaCard, ScoreGauge, StatusBadge, RubricPanel, Header
│   │   ├── pages/              # ProblemsPage, ProblemDetailsPage, PracticePage, FeedbackPage, HistoryPage
│   │   └── services/           # Axios HTTP client with unified error interceptor
├── server/                     # Node.js Express REST Backend
│   ├── src/
│   │   ├── domain/             # Pure entities, value objects, invariants, repository interfaces
│   │   │   ├── entities/       # Attempt, Submission, Problem, Rubric, Evaluation
│   │   │   └── interfaces/     # IEvaluator, IAttemptRepository, ISubmissionRepository
│   │   ├── application/        # Use-case orchestration services (Attempt, Submission, Evaluation, Problem)
│   │   ├── infrastructure/     # Database models, Mongo repositories, LLM clients, Evaluators
│   │   │   ├── database/       # Mongoose schemas, seed scripts
│   │   │   ├── evaluators/     # RuleBasedEvaluator, LlmEvaluator
│   │   │   └── llm/            # GeminiLlmClient, OpenAiLlmClient
│   │   └── interfaces/         # Express controllers, routers, Zod DTO schemas, error middleware
```

---

## 5. Setup Instructions

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **MongoDB**: Local MongoDB instance (`mongodb://localhost:27017/cipher_lld`) or MongoDB Atlas URI (optional for tests, as tests use in-memory MongoDB).

### Step 1: Clone & Install Dependencies

```bash
# Clone the repository
git clone <repository-url>
cd cipher

# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

---

## 6. Environment Variables

Create a `.env` file in `server/.env`:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/cipher_lld
GEMINI_API_KEY=your_gemini_api_key_here
# Optional fallback if using OpenAI
OPENAI_API_KEY=your_openai_api_key_here
NODE_ENV=development
```

> **Note on LLM Evaluation**: If no LLM API key is provided or the provider is unreachable, the system gracefully falls back to the deterministic `RuleBasedEvaluator`, allowing offline practice without crashes.

---

## 7. How to Run the Application

### Running the Backend

```bash
cd server
npm run dev
```
The server will start on `http://localhost:5000` and automatically run the idempotent database seeder.

### Running the Frontend

```bash
cd client
npm run dev
```
The client will start on `http://localhost:3000` (or `http://localhost:5173`).

---

## 8. Database Seeding

The database seeds automatically upon backend startup via `seedProblems()`. You can also trigger seeding manually:

```bash
cd server
npx ts-node src/infrastructure/database/seed.ts
```

Seeded problems:
1. **Design a Multi-Floor Parking Lot** (`MEDIUM`)
2. **Design a Snack & Beverage Vending Machine** (`MEDIUM`)
3. **Design an Elevator Control System** (`HARD`)
4. **Design a Library Management System** (`EASY`)

---

## 9. How to Run Tests

The backend test suite verifies domain invariants, state transitions, repository operations, evaluator behavior, and end-to-end REST API workflows:

```bash
cd server
npm test
```

Expected output: **8 test suites passing, 76/76 tests passing**.

---

## 10. Known Limitations

1. **Synchronous Evaluation**: Currently, the LLM evaluation is processed synchronously during the submission flow. In high-traffic production environments, an asynchronous task queue (e.g. BullMQ / Redis) with WebSockets would be preferable.
2. **Single-Tenant Authentication**: The MVP uses a fixed candidate identifier (`candidate-alpha`) to streamline local evaluation without requiring an OAuth/auth flow.
3. **Diagram Parsing**: Class diagrams are currently represented via text, UML, and code snippets. Interactive visual UML drag-and-drop or direct image-to-architecture parsing is scheduled for the next phase.
