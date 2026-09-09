import { ProblemModel } from "./models/ProblemModel";
import { DifficultyLevel } from "../../domain/enums/DifficultyLevel";

/**
 * Canonical seed problem IDs.
 * Used by the seed runner to clear stale problems that no longer belong to the
 * authoritative list without touching user-generated attempt/submission data.
 */
export const SEED_PROBLEM_IDS = [
  "prob-parking-lot",
  "prob-vending-machine",
  "prob-elevator",
  "prob-library",
] as const;

// ─── Rubric Criterion Template ────────────────────────────────────────────────

function criterion(
  key: string,
  name: string,
  description: string,
  maxScore: number,
  weight: number
) {
  return { key, name, description, maxScore, weight };
}

// ─── Common Rubric Criteria Keys ─────────────────────────────────────────────
// All four problems share the same five evaluation dimensions so that the
// RuleBasedEvaluator and LlmEvaluator work uniformly across problems.

const SHARED_RUBRIC_KEYS = [
  "REQUIREMENT_ALIGNMENT",
  "SOLID_ABSTRACTION",
  "DESIGN_PATTERNS",
  "EDGE_CASES",
  "COUPLING_COHESION",
] as const;

// ─── Seed Data ────────────────────────────────────────────────────────────────

export const SEED_PROBLEMS = [
  // ── 1. Parking Lot ───────────────────────────────────────────────────────
  {
    _id: "prob-parking-lot",
    slug: "parking-lot",
    title: "Design a Multi-Floor Parking Lot",
    description:
      "Design an automated multi-floor parking lot system that handles multiple vehicle types, " +
      "assigns spots dynamically, issues tickets on entry, and calculates fees on exit. " +
      "The system must remain consistent under concurrent vehicle arrivals and departures.",
    requirements: [
      "The parking lot has multiple floors; each floor has a fixed number of spots categorised as Two-Wheeler, Car, and Truck.",
      "On vehicle entry, automatically allocate the nearest available spot of the correct type and issue a ticket with a unique ID, entry timestamp, spot address (floor + spot number), and vehicle registration.",
      "On vehicle exit, accept the ticket, calculate the parking fee based on vehicle type and duration parked, and free the spot.",
      "Support at least two interchangeable spot-allocation strategies: Nearest-to-entrance and Lowest-floor-first. The active strategy must be switchable without modifying any existing class.",
      "Support at least two interchangeable fee structures: flat hourly rate and a tiered rate (first hour cheaper, subsequent hours costlier). Adding a new fee structure must not require changing the exit flow.",
      "Expose a real-time display showing available spot counts per floor, grouped by vehicle type.",
    ],
    assumptions: [
      "A single entry gate and a single exit gate are sufficient for this session — you do not need to model multiple physical gates.",
      "Spots are homogeneous within a category (any Car spot is equally valid for any car).",
      "You do not need to implement a payment gateway; model the payment step as a simple method call.",
      "Concurrency: assume at least two threads can call park/unpark simultaneously; your design must prevent double-allocation of the same spot.",
      "Choose any programming language you are comfortable with, but write actual compilable code for the core classes.",
    ],
    difficulty: DifficultyLevel.MEDIUM,
    rubric: {
      id: "rubric-parking-lot",
      problemId: "prob-parking-lot",
      criteria: [
        criterion(
          "REQUIREMENT_ALIGNMENT",
          "Functional Coverage",
          "Design addresses multi-floor layout, vehicle types, dynamic spot allocation, ticketing, fee calculation, and the real-time display board.",
          25, 0.25
        ),
        criterion(
          "SOLID_ABSTRACTION",
          "OOD & SOLID Principles",
          "Classes have single, clear responsibilities. ParkingLot, Floor, Spot, Ticket, and fee/allocation logic are separate, cohesive units. Open/Closed: adding a vehicle type or fee structure does not break existing code.",
          25, 0.25
        ),
        criterion(
          "DESIGN_PATTERNS",
          "Pattern Selection & Justification",
          "Strategy for allocation and fee calculation. Factory (optional) for ticket/spot creation. Explanation clearly links each pattern to the design problem it solves.",
          20, 0.20
        ),
        criterion(
          "EDGE_CASES",
          "Concurrency & Edge Cases",
          "Thread-safe spot reservation (no double-allocation). Handles lot-full scenario, invalid ticket at exit, and vehicle-type mismatch gracefully.",
          15, 0.15
        ),
        criterion(
          "COUPLING_COHESION",
          "Modularity & Extensibility",
          "Low coupling between entry gate, exit gate, display board, and spot management. High cohesion within each domain entity.",
          15, 0.15
        ),
      ],
    },
  },

  // ── 2. Vending Machine ────────────────────────────────────────────────────
  {
    _id: "prob-vending-machine",
    slug: "vending-machine",
    title: "Design a Vending Machine",
    description:
      "Design the software for a vending machine that sells products, accepts coins and notes, " +
      "dispenses products and change, and handles inventory management. " +
      "The machine must enforce valid state transitions and recover cleanly from failed transactions.",
    requirements: [
      "The machine holds a configurable inventory of products, each with a name, price, and stock count.",
      "Accept cash denominations (coins and notes). Track the running total inserted for the current transaction.",
      "Allow the user to select a product after inserting cash. Validate that sufficient cash has been inserted and that the product is in stock.",
      "On a valid purchase: dispense the product, deduct stock, dispense exact change using available denominations, and return to idle state.",
      "On cancellation at any point before dispensing: return all inserted cash to the user and return to idle state.",
      "The machine must enforce a strict state machine: IDLE → ACCEPTING_CASH → PRODUCT_SELECTED → DISPENSING → IDLE. Invalid transitions (e.g., selecting a product before inserting cash) must be rejected with a clear error.",
      "An admin interface must allow: restocking products, refilling cash denominations, and viewing current inventory and cash float.",
    ],
    assumptions: [
      "You only need one machine instance — no distributed or networked vending is required.",
      "Assume denominations are whole integers (no floating-point currency arithmetic needed if you model prices in cents/paise).",
      "The change-dispensing algorithm must be greedy (largest denomination first); document any edge case where exact change cannot be given.",
      "You do not need a real UI; model user interactions as method calls.",
      "Concurrency: a single user interacts with the machine at a time; you do not need to handle concurrent transactions.",
    ],
    difficulty: DifficultyLevel.MEDIUM,
    rubric: {
      id: "rubric-vending-machine",
      problemId: "prob-vending-machine",
      criteria: [
        criterion(
          "REQUIREMENT_ALIGNMENT",
          "Functional Coverage",
          "Design correctly handles inventory lookup, cash acceptance, product dispensing, change calculation, cancellation, and admin restocking.",
          25, 0.25
        ),
        criterion(
          "SOLID_ABSTRACTION",
          "State Machine & OOD",
          "State Pattern (or equivalent) clearly models IDLE/ACCEPTING_CASH/PRODUCT_SELECTED/DISPENSING transitions. Each state class/handler has a single responsibility. Invalid transitions throw meaningful exceptions.",
          25, 0.25
        ),
        criterion(
          "DESIGN_PATTERNS",
          "Pattern Selection & Justification",
          "State Pattern for lifecycle, Strategy (optional) for change-dispensing algorithm. Explanation justifies why State was chosen over if-else chains.",
          20, 0.20
        ),
        criterion(
          "EDGE_CASES",
          "Edge Cases & Error Handling",
          "Handles: insufficient cash, out-of-stock product, exact change unavailable, cancellation mid-transaction, and admin operations during idle state only.",
          15, 0.15
        ),
        criterion(
          "COUPLING_COHESION",
          "Modularity & Extensibility",
          "CashHandler, InventoryManager, ChangeDispenser, and StateMachine are loosely coupled. Adding a new denomination or product type requires minimal change.",
          15, 0.15
        ),
      ],
    },
  },

  // ── 3. Elevator ───────────────────────────────────────────────────────────
  {
    _id: "prob-elevator",
    slug: "elevator-system",
    title: "Design an Elevator Control System",
    description:
      "Design the control system for a bank of elevators in a building. " +
      "The system must accept requests from passengers on floors (hall calls) and from inside cars (car calls), " +
      "dispatch elevators intelligently, and manage each elevator's movement and door lifecycle.",
    requirements: [
      "The building has a configurable number of floors and a configurable number of elevator cars.",
      "Hall calls: a passenger on a floor presses UP or DOWN. The system must assign the most suitable available elevator.",
      "Car calls: a passenger inside a car presses a destination floor button. The car must stop at every requested floor in its current direction of travel before reversing.",
      "Each elevator has the following states: IDLE, MOVING_UP, MOVING_DOWN, DOOR_OPEN, DOOR_CLOSED. Model transitions explicitly.",
      "Dispatch algorithm: implement the LOOK algorithm — the elevator continues in its current direction, picking up passengers along the way, before reversing. If idle, it moves toward the nearest pending request.",
      "Safety: an overloaded car (exceeds weight limit) must not move; its doors stay open until load is within limit. An emergency stop button halts the car immediately.",
    ],
    assumptions: [
      "Model weight as a simple integer (kg); you do not need real sensor simulation.",
      "A single ElevatorController is responsible for all dispatching decisions; individual elevators report their state to it.",
      "Door open/close events are instant for this design session — no timer simulation is required.",
      "You do not need to model a physical button panel UI; represent button presses as method calls.",
      "Concurrency: multiple hall calls may arrive simultaneously; your dispatcher must handle them correctly without losing a request.",
    ],
    difficulty: DifficultyLevel.MEDIUM,
    rubric: {
      id: "rubric-elevator",
      problemId: "prob-elevator",
      criteria: [
        criterion(
          "REQUIREMENT_ALIGNMENT",
          "Functional Coverage",
          "Design handles hall calls, car calls, LOOK algorithm dispatch, multi-elevator coordination, state lifecycle, and safety rules.",
          25, 0.25
        ),
        criterion(
          "SOLID_ABSTRACTION",
          "State Machine & Entity Modeling",
          "ElevatorCar, Floor, Button, ElevatorController, and Dispatcher are distinct, well-reasoned classes. State transitions are explicit and validated.",
          25, 0.25
        ),
        criterion(
          "DESIGN_PATTERNS",
          "Pattern Selection & Justification",
          "State Pattern for elevator movement lifecycle. Strategy for the dispatch algorithm (pluggable: LOOK, FCFS, Nearest-Car). Observer (optional) for floor arrival notifications.",
          20, 0.20
        ),
        criterion(
          "EDGE_CASES",
          "Concurrency, Starvation & Safety",
          "No request is lost when multiple arrive simultaneously. LOOK prevents starvation at floors along the path. Overload and emergency-stop are handled safely.",
          15, 0.15
        ),
        criterion(
          "COUPLING_COHESION",
          "Architecture & Separation of Concerns",
          "Physical car simulation is decoupled from dispatching logic. Adding a new scheduling algorithm requires implementing one interface, not touching ElevatorCar or Floor classes.",
          15, 0.15
        ),
      ],
    },
  },

  // ── 4. Library Management ─────────────────────────────────────────────────
  {
    _id: "prob-library",
    slug: "library-management",
    title: "Design a Library Management System",
    description:
      "Design the core backend for a public library that manages its book catalogue, " +
      "member accounts, borrowing and return workflows, reservations, and overdue fines. " +
      "Focus on the domain model and service layer — not on a specific database or UI technology.",
    requirements: [
      "Maintain a catalogue of books. Each book title may have multiple physical copies, each tracked as a distinct item (barcode, condition, shelf location).",
      "Support member registration with a unique member ID, name, and contact details. A member may borrow at most 5 items simultaneously.",
      "Borrowing: a member checks out an available copy; the system records the loan with a due date (14 days from checkout by default).",
      "Return: accepting a returned copy calculates any overdue fine (configurable rate per day past due date) and marks the copy available.",
      "Reservation: if all copies of a title are currently on loan, a member may reserve it. When a copy becomes available, the oldest pending reservation is automatically fulfilled (copy held for 48 hours).",
      "Search: find books by title keyword, author, ISBN, or genre. Return all matching titles with their current availability (copies available vs. total copies).",
    ],
    assumptions: [
      "You do not need to implement a full database schema — model persistence as repository interfaces with in-memory implementations for this session.",
      "Fine calculation uses simple calendar days; you do not need to account for library opening hours or holidays.",
      "A member may have at most one active reservation per title.",
      "Notifications (e.g., 'your reserved book is available') can be modelled as a simple method call or event — no real email/SMS integration required.",
      "The system is single-tenant (one library branch); no multi-branch synchronisation is needed.",
    ],
    difficulty: DifficultyLevel.EASY,
    rubric: {
      id: "rubric-library",
      problemId: "prob-library",
      criteria: [
        criterion(
          "REQUIREMENT_ALIGNMENT",
          "Functional Coverage",
          "Design covers catalogue management, member accounts, checkout/return workflow, fine calculation, reservation queue, and search.",
          25, 0.25
        ),
        criterion(
          "SOLID_ABSTRACTION",
          "Domain Modeling & OOD",
          "Clear, cohesive entities: Book (title metadata), BookItem (physical copy), Member, Loan, Reservation, Fine. Repository interfaces decouple domain from persistence. No god-classes.",
          25, 0.25
        ),
        criterion(
          "DESIGN_PATTERNS",
          "Pattern Selection & Justification",
          "Repository Pattern for persistence abstraction. Observer (or event) for reservation notification when a copy is returned. Strategy (optional) for fine calculation policy. Each pattern is justified, not just named.",
          20, 0.20
        ),
        criterion(
          "EDGE_CASES",
          "Business Rule Enforcement & Edge Cases",
          "Enforces borrow limit (max 5). Handles: return of already-returned item, reservation expiry after 48 h, member with outstanding fines, and search returning zero results gracefully.",
          15, 0.15
        ),
        criterion(
          "COUPLING_COHESION",
          "Modularity & Extensibility",
          "Catalogue, lending, reservation, and fine subsystems are loosely coupled. Adding a new fine policy or notification channel does not require changes to existing domain entities.",
          15, 0.15
        ),
      ],
    },
  },
];

// ─── Seed Runner ──────────────────────────────────────────────────────────────

/**
 * seedProblems()
 *
 * Idempotent — safe to call on every server start.
 *
 * 1. Removes any problem document whose _id is NOT in the canonical list
 *    (cleans up stale problems from previous seed versions).
 * 2. Upserts each canonical problem by _id so updates to problem text or
 *    rubric are reflected without manual intervention.
 */
export async function seedProblems(): Promise<void> {
  // Step 1: remove stale problems that are no longer in the canonical list
  await ProblemModel.deleteMany({
    _id: { $nin: SEED_PROBLEM_IDS as unknown as string[] },
  });

  // Step 2: upsert each canonical problem
  for (const prob of SEED_PROBLEMS) {
    await ProblemModel.findByIdAndUpdate(
      prob._id,
      {
        _id:          prob._id,
        slug:         prob.slug,
        title:        prob.title,
        description:  prob.description,
        requirements: prob.requirements,
        assumptions:  prob.assumptions,
        difficulty:   prob.difficulty,
        rubric:       prob.rubric,
      },
      { upsert: true, new: true }
    );
  }

  console.log(`[Seed] Seeded ${SEED_PROBLEMS.length} LLD practice problems: ${SEED_PROBLEM_IDS.join(", ")}.`);
}
