"use client";

// ─── Types ──────────────────────────────────────────────────────────────────

export type Ticket = {
  id: string;
  task: "duplicate" | "fraud" | "budget";
  display: {
    vendor: string;
    amount: number;
    description: string;
    invoice_number?: string;
    second_invoice?: {
      vendor: string;
      amount: number;
      invoice_number: string;
    };
  };
  correct_answer: "approve" | "reject";
  dollar_impact: number;
  ramp_feature: string;
  difficulty: "easy" | "medium" | "hard";
};

export type PlayerState = {
  score: number;
  activeTicket: Ticket | null;
};

export type WrongDecision = {
  ticket: Ticket;
  player: "p1" | "p2";
  chose: "approve" | "reject";
};

export type GameState = {
  sharedHealth: number;
  sharedTime: number;
  isRunning: boolean;
  isOver: boolean;
  didWin: boolean;
  phase: number;
  p1: PlayerState;
  p2: PlayerState;
  wrongDecisions: WrongDecision[];
  totalDollarImpact: number;
  missedDeskDeadlines: { p1: number; p2: number };
  expiredTickets: { p1: number; p2: number };
};

// ─── Hardcoded ticket pool ──────────────────────────────────────────────────

const TICKET_POOL: Ticket[] = [
  // ── EASY ──
  {
    id: "dup-1",
    task: "duplicate",
    display: {
      vendor: "Staples",
      amount: 247.5,
      description: "Office supplies Q3",
      invoice_number: "INV-4821",
      second_invoice: { vendor: "Staples", amount: 247.5, invoice_number: "INV-4821" },
    },
    correct_answer: "reject",
    dollar_impact: 247.5,
    ramp_feature: "Duplicate Detection",
    difficulty: "easy",
  },
  {
    id: "fraud-1",
    task: "fraud",
    display: {
      vendor: "AMZN*MKTPLACE",
      amount: 3999.0,
      description: "Personal electronics purchase",
    },
    correct_answer: "reject",
    dollar_impact: 3999.0,
    ramp_feature: "Merchant Lock",
    difficulty: "easy",
  },
  {
    id: "budget-1",
    task: "budget",
    display: {
      vendor: "WeWork",
      amount: 12400,
      description: "Monthly coworking space — 15 seats",
    },
    correct_answer: "reject",
    dollar_impact: 4400,
    ramp_feature: "Spend Limits",
    difficulty: "easy",
  },
  {
    id: "dup-2",
    task: "duplicate",
    display: {
      vendor: "AWS",
      amount: 8420.0,
      description: "Cloud hosting — June",
      invoice_number: "AWS-0612",
      second_invoice: { vendor: "AWS", amount: 8420.0, invoice_number: "AWS-0612" },
    },
    correct_answer: "reject",
    dollar_impact: 8420.0,
    ramp_feature: "Duplicate Detection",
    difficulty: "easy",
  },
  // ── MEDIUM ──
  {
    id: "fraud-2",
    task: "fraud",
    display: {
      vendor: "Best Buy",
      amount: 1849.99,
      description: "75\" OLED TV — 'conference room'",
    },
    correct_answer: "reject",
    dollar_impact: 1849.99,
    ramp_feature: "Merchant Lock",
    difficulty: "medium",
  },
  {
    id: "budget-2",
    task: "budget",
    display: {
      vendor: "Figma",
      amount: 4200,
      description: "Enterprise upgrade — design team",
    },
    correct_answer: "approve",
    dollar_impact: 0,
    ramp_feature: "Spend Limits",
    difficulty: "medium",
  },
  {
    id: "dup-3",
    task: "duplicate",
    display: {
      vendor: "Uber Eats",
      amount: 342.18,
      description: "Team lunch Friday",
      invoice_number: "UE-7891",
      second_invoice: { vendor: "Uber Eats", amount: 187.42, invoice_number: "UE-7834" },
    },
    correct_answer: "approve",
    dollar_impact: 0,
    ramp_feature: "Duplicate Detection",
    difficulty: "medium",
  },
  {
    id: "fraud-3",
    task: "fraud",
    display: {
      vendor: "Delta Airlines",
      amount: 2100.0,
      description: "First class ticket — SFO to NYC",
    },
    correct_answer: "reject",
    dollar_impact: 2100.0,
    ramp_feature: "Policy Enforcement",
    difficulty: "medium",
  },
  {
    id: "budget-3",
    task: "budget",
    display: {
      vendor: "Salesforce",
      amount: 18750,
      description: "Annual CRM license renewal",
    },
    correct_answer: "approve",
    dollar_impact: 0,
    ramp_feature: "Spend Limits",
    difficulty: "medium",
  },
  // ── HARD ──
  {
    id: "dup-4",
    task: "duplicate",
    display: {
      vendor: "Google Cloud",
      amount: 15230.0,
      description: "Cloud infra — June billing",
      invoice_number: "GCP-2406A",
      second_invoice: { vendor: "Google Cloud Platform", amount: 15230.0, invoice_number: "GCP-2406B" },
    },
    correct_answer: "reject",
    dollar_impact: 15230.0,
    ramp_feature: "Duplicate Detection",
    difficulty: "hard",
  },
  {
    id: "fraud-4",
    task: "fraud",
    display: {
      vendor: "Supreme NYC",
      amount: 6800.0,
      description: "Company merch order — 'brand alignment'",
    },
    correct_answer: "reject",
    dollar_impact: 6800.0,
    ramp_feature: "Merchant Lock",
    difficulty: "hard",
  },
  {
    id: "budget-4",
    task: "budget",
    display: {
      vendor: "Hetzner",
      amount: 32000,
      description: "Bare metal GPU cluster — ML training",
    },
    correct_answer: "reject",
    dollar_impact: 12000,
    ramp_feature: "Spend Limits",
    difficulty: "hard",
  },
  {
    id: "fraud-5",
    task: "fraud",
    display: {
      vendor: "Expedia",
      amount: 4200.0,
      description: "Resort booking — Cancún, 7 nights",
    },
    correct_answer: "reject",
    dollar_impact: 4200.0,
    ramp_feature: "Policy Enforcement",
    difficulty: "hard",
  },
  {
    id: "dup-5",
    task: "duplicate",
    display: {
      vendor: "Anthropic",
      amount: 22500.0,
      description: "API credits — July",
      invoice_number: "ANT-0701",
      second_invoice: { vendor: "Anthropic", amount: 22500.0, invoice_number: "ANT-0701" },
    },
    correct_answer: "reject",
    dollar_impact: 22500.0,
    ramp_feature: "Duplicate Detection",
    difficulty: "hard",
  },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

const HEALTH_PENALTY: Record<string, number> = { easy: 15, medium: 20, hard: 30 };
const SCORE_REWARD: Record<string, number> = { easy: 100, medium: 200, hard: 350 };
const PHASE_THRESHOLDS = [0, 5, 12]; // phase 2 at 5 correct, phase 3 at 12
export const DESK_MISS_HEALTH_PENALTY = 10;
export const TICKET_EXPIRY_HEALTH_PENALTY = 15;
export const TICKET_DECISION_SECONDS = 10;
export const GAME_DURATION_SECONDS = 60;

let ticketQueue: Ticket[] = [];

function shufflePool(): Ticket[] {
  const arr = [...TICKET_POOL];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function drawTicket(phase: number): Ticket {
  // Filter by difficulty for current phase, fall back to anything
  const allowed: Set<string> =
    phase === 1 ? new Set(["easy"]) :
    phase === 2 ? new Set(["easy", "medium"]) :
    new Set(["easy", "medium", "hard"]);

  // Refill if empty
  if (ticketQueue.length === 0) ticketQueue = shufflePool();

  const idx = ticketQueue.findIndex((t) => allowed.has(t.difficulty));
  if (idx >= 0) return ticketQueue.splice(idx, 1)[0];

  // Absolute fallback
  if (ticketQueue.length === 0) ticketQueue = shufflePool();
  return ticketQueue.pop()!;
}

// ─── Listeners ──────────────────────────────────────────────────────────────

type Listener = () => void;
const listeners: Set<Listener> = new Set();
export const subscribe = (fn: Listener) => {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
};
const notify = () => { for (const fn of listeners) fn(); };

// ─── Game state (mutable singleton) ─────────────────────────────────────────

export const gameState: GameState = {
  sharedHealth: 100,
  sharedTime: GAME_DURATION_SECONDS,
  isRunning: false,
  isOver: false,
  didWin: false,
  phase: 1,
  p1: { score: 0, activeTicket: null },
  p2: { score: 0, activeTicket: null },
  wrongDecisions: [],
  totalDollarImpact: 0,
  missedDeskDeadlines: { p1: 0, p2: 0 },
  expiredTickets: { p1: 0, p2: 0 },
};

// ─── Actions ────────────────────────────────────────────────────────────────

export function initGame() {
  ticketQueue = shufflePool();
  gameState.sharedHealth = 100;
  gameState.sharedTime = GAME_DURATION_SECONDS;
  gameState.isRunning = true;
  gameState.isOver = false;
  gameState.didWin = false;
  gameState.phase = 1;
  gameState.p1 = { score: 0, activeTicket: null };
  gameState.p2 = { score: 0, activeTicket: null };
  gameState.wrongDecisions = [];
  gameState.totalDollarImpact = 0;
  gameState.missedDeskDeadlines = { p1: 0, p2: 0 };
  gameState.expiredTickets = { p1: 0, p2: 0 };
  notify();
}

export function resetGame() {
  gameState.sharedHealth = 100;
  gameState.sharedTime = GAME_DURATION_SECONDS;
  gameState.isRunning = false;
  gameState.isOver = false;
  gameState.didWin = false;
  gameState.phase = 1;
  gameState.p1 = { score: 0, activeTicket: null };
  gameState.p2 = { score: 0, activeTicket: null };
  gameState.wrongDecisions = [];
  gameState.totalDollarImpact = 0;
  gameState.missedDeskDeadlines = { p1: 0, p2: 0 };
  gameState.expiredTickets = { p1: 0, p2: 0 };
  notify();
}

/** Penalize a player who failed to reach their assigned desk in time. */
export function missDeskDeadline(player: "p1" | "p2") {
  if (!gameState.isRunning || gameState.isOver) return;

  gameState.missedDeskDeadlines[player] += 1;
  gameState.sharedHealth = Math.max(
    0,
    gameState.sharedHealth - DESK_MISS_HEALTH_PENALTY,
  );

  if (gameState.sharedHealth <= 0) {
    gameState.isRunning = false;
    gameState.isOver = true;
    gameState.didWin = false;
  }

  notify();
}

/** Expire an unanswered ticket and apply the automatic health penalty. */
export function expireTicket(player: "p1" | "p2"): boolean {
  if (!gameState.isRunning || gameState.isOver || !gameState[player].activeTicket) {
    return false;
  }

  gameState[player].activeTicket = null;
  gameState.expiredTickets[player] += 1;
  gameState.sharedHealth = Math.max(
    0,
    gameState.sharedHealth - TICKET_EXPIRY_HEALTH_PENALTY,
  );

  if (gameState.sharedHealth <= 0) {
    gameState.isRunning = false;
    gameState.isOver = true;
    gameState.didWin = false;
  }

  notify();
  return true;
}

/** Returns "correct" | "wrong" so the UI can flash. */
export function submitAnswer(
  player: "p1" | "p2",
  answer: "approve" | "reject",
): "correct" | "wrong" {
  if (!gameState.isRunning || gameState.isOver) return "wrong";

  const ps = gameState[player];
  const ticket = ps.activeTicket;
  if (!ticket) return "wrong";

  const correct = answer === ticket.correct_answer;

  if (correct) {
    ps.score += SCORE_REWARD[ticket.difficulty];
  } else {
    const penalty = HEALTH_PENALTY[ticket.difficulty];
    gameState.sharedHealth = Math.max(0, gameState.sharedHealth - penalty);
    gameState.wrongDecisions.push({ ticket, player, chose: answer });
    gameState.totalDollarImpact += ticket.dollar_impact;
  }

  // Phase advancement
  const totalCorrect =
    gameState.p1.score / 100 + gameState.p2.score / 100; // approximate
  const totalAnswered =
    gameState.wrongDecisions.length + totalCorrect;
  if (totalAnswered >= PHASE_THRESHOLDS[2]) gameState.phase = 3;
  else if (totalAnswered >= PHASE_THRESHOLDS[1]) gameState.phase = 2;

  // Check health loss
  if (gameState.sharedHealth <= 0) {
    gameState.isRunning = false;
    gameState.isOver = true;
    gameState.didWin = false;
    notify();
    return "wrong";
  }

  // The player must rotate to their next assigned desk before drawing another
  // ticket. CoopGame assigns that desk after this decision is submitted.
  ps.activeTicket = null;
  notify();
  return correct ? "correct" : "wrong";
}

/** Call every frame with dt in seconds. Counts down sharedTime. */
export function tickGame(dt: number) {
  if (!gameState.isRunning || gameState.isOver) return;

  gameState.sharedTime = Math.max(0, gameState.sharedTime - dt);

  if (gameState.sharedTime <= 0) {
    gameState.isRunning = false;
    gameState.isOver = true;
    // Win if health > 0 when time runs out
    gameState.didWin = gameState.sharedHealth > 0;
    notify();
  }
}
