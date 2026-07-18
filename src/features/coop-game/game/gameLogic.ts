"use client";

import { splitPool } from "@/ai/generateTicketPool.js";

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
  /** Seconds remaining to decide on the active ticket; 0 when none. */
  ticketTimer: number;
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

// ─── Helpers ────────────────────────────────────────────────────────────────

const HEALTH_PENALTY: Record<string, number> = { easy: 15, medium: 20, hard: 30 };
const SCORE_REWARD: Record<string, number> = { easy: 100, medium: 200, hard: 350 };
const PHASE_THRESHOLDS = [0, 5, 12]; // phase 2 at 5 correct, phase 3 at 12
export const DESK_MISS_HEALTH_PENALTY = 10;
export const TICKET_EXPIRY_HEALTH_PENALTY = 15;
export const TICKET_DECISION_SECONDS = 8;
export const GAME_DURATION_SECONDS = 60;

/** Per-player pools from splitPool(); queues are the remaining draw order. */
let p1Pool: Ticket[] = [];
let p2Pool: Ticket[] = [];
let p1Queue: Ticket[] = [];
let p2Queue: Ticket[] = [];

function shuffleTickets(source: Ticket[]): Ticket[] {
  const arr = [...source];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function queueFor(player: "p1" | "p2"): Ticket[] {
  return player === "p1" ? p1Queue : p2Queue;
}

function setQueue(player: "p1" | "p2", queue: Ticket[]) {
  if (player === "p1") p1Queue = queue;
  else p2Queue = queue;
}

function refillQueue(player: "p1" | "p2"): Ticket[] {
  const pool = player === "p1" ? p1Pool : p2Pool;
  const queue = shuffleTickets(pool);
  setQueue(player, queue);
  return queue;
}

export function drawTicket(phase: number, player: "p1" | "p2" = "p1"): Ticket {
  // Filter by difficulty for current phase, fall back to anything
  const allowed: Set<string> =
    phase === 1 ? new Set(["easy"]) :
    phase === 2 ? new Set(["easy", "medium"]) :
    new Set(["easy", "medium", "hard"]);

  let queue = queueFor(player);
  if (queue.length === 0) queue = refillQueue(player);

  const idx = queue.findIndex((t) => allowed.has(t.difficulty));
  if (idx >= 0) {
    const [ticket] = queue.splice(idx, 1);
    return ticket;
  }

  // Absolute fallback
  if (queue.length === 0) queue = refillQueue(player);
  return queue.pop()!;
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
  p1: { score: 0, activeTicket: null, ticketTimer: 0 },
  p2: { score: 0, activeTicket: null, ticketTimer: 0 },
  wrongDecisions: [],
  totalDollarImpact: 0,
  missedDeskDeadlines: { p1: 0, p2: 0 },
  expiredTickets: { p1: 0, p2: 0 },
};

// ─── Actions ────────────────────────────────────────────────────────────────

/** Loads split ticket pools and starts a fresh round. */
export async function initGame() {
  const { p1Pool: splitP1, p2Pool: splitP2 } = await splitPool();
  p1Pool = splitP1 as Ticket[];
  p2Pool = splitP2 as Ticket[];
  p1Queue = shuffleTickets(p1Pool);
  p2Queue = shuffleTickets(p2Pool);

  gameState.sharedHealth = 100;
  gameState.sharedTime = GAME_DURATION_SECONDS;
  gameState.isRunning = true;
  gameState.isOver = false;
  gameState.didWin = false;
  gameState.phase = 1;
  gameState.p1 = { score: 0, activeTicket: null, ticketTimer: 0 };
  gameState.p2 = { score: 0, activeTicket: null, ticketTimer: 0 };
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
  gameState.p1 = { score: 0, activeTicket: null, ticketTimer: 0 };
  gameState.p2 = { score: 0, activeTicket: null, ticketTimer: 0 };
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

/** Draw a ticket for a player and start their decision timer. */
export function assignTicket(player: "p1" | "p2"): Ticket {
  const ticket = drawTicket(gameState.phase, player);
  gameState[player].activeTicket = ticket;
  gameState[player].ticketTimer = TICKET_DECISION_SECONDS;
  notify();
  return ticket;
}

/** Expire an unanswered ticket and apply the automatic health penalty. */
export function expireTicket(player: "p1" | "p2"): boolean {
  if (!gameState.isRunning || gameState.isOver || !gameState[player].activeTicket) {
    return false;
  }

  gameState[player].activeTicket = null;
  gameState[player].ticketTimer = 0;
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
  ps.ticketTimer = 0;
  notify();
  return correct ? "correct" : "wrong";
}

/** Call every frame with dt in seconds. Counts down sharedTime and ticket timers. */
export function tickGame(dt: number) {
  if (!gameState.isRunning || gameState.isOver) return;

  gameState.sharedTime = Math.max(0, gameState.sharedTime - dt);

  for (const player of ["p1", "p2"] as const) {
    const ps = gameState[player];
    if (!ps.activeTicket) continue;
    ps.ticketTimer = Math.max(0, ps.ticketTimer - dt);
  }

  if (gameState.sharedTime <= 0) {
    gameState.isRunning = false;
    gameState.isOver = true;
    // Win if health > 0 when time runs out
    gameState.didWin = gameState.sharedHealth > 0;
    notify();
  }
}
