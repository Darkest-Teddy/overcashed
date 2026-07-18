import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  DESK_MISS_HEALTH_PENALTY,
  GAME_DURATION_SECONDS,
  TICKET_DECISION_SECONDS,
  TICKET_EXPIRY_HEALTH_PENALTY,
  assignTicket,
  drawTicket,
  expireTicket,
  gameState,
  initGame,
  missDeskDeadline,
  resetGame,
  submitAnswer,
  tickGame,
} from "../../src/features/coop-game/game/gameLogic";
import { generateDebrief } from "../../src/features/coop-game/ai/generateDebrief";

describe("co-op game rotation rules", () => {
  beforeEach(() => {
    initGame();
  });

  afterEach(() => {
    resetGame();
  });

  it("clears a completed ticket so the UI must rotate to another desk", () => {
    const ticket = drawTicket(1);
    gameState.p1.activeTicket = ticket;

    expect(submitAnswer("p1", ticket.correct_answer)).toBe("correct");
    expect(gameState.p1.activeTicket).toBeNull();
    expect(gameState.p1.ticketTimer).toBe(0);
    expect(gameState.p1.score).toBeGreaterThan(0);
  });

  it("starts a one-minute round", () => {
    expect(GAME_DURATION_SECONDS).toBe(60);
    expect(gameState.sharedTime).toBe(60);
  });

  it("reports inactivity as negative performance", () => {
    const debrief = generateDebrief(gameState);

    expect(debrief).toContain("No Work Completed");
    expect(debrief).toContain("unacceptable");
    expect(debrief).not.toContain("Flawless quarter");
  });

  it("keeps low-throughput clean performance neutral", () => {
    gameState.p1.score = 100;

    const debrief = generateDebrief(gameState);

    expect(debrief).toContain("throughput was below target");
    expect(debrief).not.toContain("Flawless quarter");
  });

  it("assigns an 8s live ticketTimer that counts down each tick", () => {
    expect(TICKET_DECISION_SECONDS).toBe(8);
    assignTicket("p1");
    expect(gameState.p1.activeTicket).not.toBeNull();
    expect(gameState.p1.ticketTimer).toBe(8);

    tickGame(0.1);
    expect(gameState.p1.ticketTimer).toBeCloseTo(7.9, 5);

    tickGame(7.9);
    expect(gameState.p1.ticketTimer).toBe(0);
  });

  it("expires an unanswered ticket and reduces shared health", () => {
    gameState.p1.activeTicket = drawTicket(1);

    expect(expireTicket("p1")).toBe(true);
    expect(gameState.p1.activeTicket).toBeNull();
    expect(gameState.p1.ticketTimer).toBe(0);
    expect(gameState.sharedHealth).toBe(100 - TICKET_EXPIRY_HEALTH_PENALTY);
    expect(gameState.expiredTickets).toEqual({ p1: 1, p2: 0 });
  });

  it("reduces shared health when a player misses a desk deadline", () => {
    missDeskDeadline("p2");

    expect(gameState.sharedHealth).toBe(100 - DESK_MISS_HEALTH_PENALTY);
    expect(gameState.missedDeskDeadlines).toEqual({ p1: 0, p2: 1 });
  });

  it("ends the game when repeated missed deadlines consume all health", () => {
    const missesToLose = Math.ceil(100 / DESK_MISS_HEALTH_PENALTY);
    for (let miss = 0; miss < missesToLose; miss += 1) {
      missDeskDeadline("p1");
    }

    expect(gameState.sharedHealth).toBe(0);
    expect(gameState.isRunning).toBe(false);
    expect(gameState.isOver).toBe(true);
    expect(gameState.didWin).toBe(false);
  });
});
