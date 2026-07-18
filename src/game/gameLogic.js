/**
 * Framework-agnostic game loop for Overcashed split-screen co-op.
 */

import { splitPool } from "../ai/generateTicketPool.js";

export const GAME_DURATION = 150;
export const STARTING_HEALTH = 100;
export const CORRECT_HEALTH_GAIN = 5;
export const WRONG_HEALTH_LOSS = 15;

/** Spawn interval (ms) by phase */
const SPAWN_INTERVAL_MS = {
  1: 8000, // 150–90s
  2: 5000, // 90–45s
  3: 3000, // 45–0s
};

const SCORE_BY_DIFFICULTY = {
  easy: 100,
  medium: 200,
  hard: 300,
};

/** @private per-player spawn / reshuffle bookkeeping (not part of exported shape) */
const internal = {
  p1: { usedTickets: [], spawnTimerMs: 0 },
  p2: { usedTickets: [], spawnTimerMs: 0 },
};

function createInitialState() {
  return {
    sharedHealth: STARTING_HEALTH,
    sharedTime: GAME_DURATION,
    isRunning: false,
    isOver: false,
    didWin: false,
    phase: 1,

    p1: {
      score: 0,
      activeTicket: null,
      ticketQueue: [],
    },
    p2: {
      score: 0,
      activeTicket: null,
      ticketQueue: [],
    },

    wrongDecisions: [],
    totalDollarImpact: 0,
  };
}

export const gameState = createInitialState();

function resetInternal() {
  internal.p1.usedTickets = [];
  internal.p1.spawnTimerMs = 0;
  internal.p2.usedTickets = [];
  internal.p2.spawnTimerMs = 0;
}

function phaseFromTime(sharedTime) {
  if (sharedTime > 90) return 1;
  if (sharedTime > 45) return 2;
  return 3;
}

function getPlayer(player) {
  if (player !== "p1" && player !== "p2") {
    throw new Error(`Unknown player: ${player}`);
  }
  return gameState[player];
}

function shuffleInPlace(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

/**
 * Pulls the next ticket for one player without touching the other.
 * Reshuffles used tickets back into the queue when empty.
 * @param {"p1" | "p2"} player
 */
export function spawnNextTicket(player) {
  const p = getPlayer(player);
  const book = internal[player];

  if (p.ticketQueue.length === 0) {
    if (book.usedTickets.length === 0) {
      p.activeTicket = null;
      return;
    }
    p.ticketQueue = shuffleInPlace(book.usedTickets.slice());
    book.usedTickets = [];
  }

  const next = p.ticketQueue.shift();
  p.activeTicket = next;
  book.usedTickets.push(next);
  book.spawnTimerMs = 0;
}

/**
 * Starts a fresh round: split pools, reset state, spawn both tickets.
 */
export function initGame() {
  const { p1Pool, p2Pool } = splitPool();

  Object.assign(gameState, createInitialState());
  resetInternal();

  gameState.p1.ticketQueue = p1Pool.slice();
  gameState.p2.ticketQueue = p2Pool.slice();
  gameState.isRunning = true;
  gameState.isOver = false;
  gameState.didWin = false;
  gameState.phase = 1;
  gameState.sharedHealth = STARTING_HEALTH;
  gameState.sharedTime = GAME_DURATION;

  spawnNextTicket("p1");
  spawnNextTicket("p2");
}

/**
 * Submit approve/reject for the given player's active ticket.
 * @param {"p1" | "p2"} player
 * @param {"approve" | "reject"} answer
 */
export function submitAnswer(player, answer) {
  if (!gameState.isRunning || gameState.isOver) return;

  const p = getPlayer(player);
  const ticket = p.activeTicket;
  if (!ticket) return;

  const correct = answer === ticket.correct_answer;

  if (correct) {
    const points = SCORE_BY_DIFFICULTY[ticket.difficulty] ?? 100;
    p.score += points;
    gameState.sharedHealth = Math.min(
      STARTING_HEALTH,
      gameState.sharedHealth + CORRECT_HEALTH_GAIN
    );
  } else {
    gameState.sharedHealth -= WRONG_HEALTH_LOSS;
    gameState.wrongDecisions.push({
      ticket,
      dollar_impact: ticket.dollar_impact,
      player,
      answer,
    });
    gameState.totalDollarImpact += ticket.dollar_impact;

    if (gameState.sharedHealth <= 0) {
      gameState.sharedHealth = 0;
      p.activeTicket = null;
      endGame();
      return;
    }
  }

  spawnNextTicket(player);
}

/**
 * Advance the shared clock. `dt` is seconds.
 * Per-player spawn timers run independently when a seat has no active ticket.
 * @param {number} dt
 */
export function updateTimer(dt) {
  if (!gameState.isRunning || gameState.isOver) return;

  gameState.sharedTime -= dt;
  if (gameState.sharedTime < 0) gameState.sharedTime = 0;

  gameState.phase = phaseFromTime(gameState.sharedTime);

  const intervalMs = SPAWN_INTERVAL_MS[gameState.phase];
  const dtMs = dt * 1000;

  for (const key of ["p1", "p2"]) {
    const p = gameState[key];
    if (p.activeTicket) continue;

    internal[key].spawnTimerMs += dtMs;
    if (internal[key].spawnTimerMs >= intervalMs) {
      spawnNextTicket(key);
    }
  }

  if (gameState.sharedTime <= 0) {
    endGame();
  }
}

export function endGame() {
  gameState.isRunning = false;
  gameState.isOver = true;
  gameState.didWin = gameState.sharedHealth > 0;
}

/**
 * Full reset for booth auto-loop — resets state then starts a new round.
 */
export function resetGame() {
  Object.assign(gameState, createInitialState());
  resetInternal();
  initGame();
}
