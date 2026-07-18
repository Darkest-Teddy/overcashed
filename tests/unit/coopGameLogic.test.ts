import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  DESK_MISS_HEALTH_PENALTY,
  drawTicket,
  gameState,
  initGame,
  missDeskDeadline,
  resetGame,
  submitAnswer,
} from "../../src/features/coop-game/game/gameLogic";

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
    expect(gameState.p1.score).toBeGreaterThan(0);
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
