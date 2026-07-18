"use client";

import type { GameState } from "../game/gameLogic";

/**
 * Generates a CFO-style debrief summarizing what went wrong.
 * Placeholder — swap in a real OpenAI / Anthropic call later.
 */
export function generateDebrief(
  state: GameState,
): string {
  const wrongDecisions = state.wrongDecisions;
  const combinedScore = state.p1.score + state.p2.score;
  const missedDesks = state.missedDeskDeadlines.p1 + state.missedDeskDeadlines.p2;
  const expiredTickets = state.expiredTickets.p1 + state.expiredTickets.p2;
  const failures = wrongDecisions.length + missedDesks + expiredTickets;

  if (combinedScore === 0) {
    return [
      "CFO DEBRIEF — No Work Completed",
      "",
      "No tickets were resolved during the round.",
      `Missed desk deadlines: ${missedDesks}`,
      `Expired tickets: ${expiredTickets}`,
      "",
      "Performance: unacceptable. The finance queue was left unattended.",
    ].join("\n");
  }

  if (failures === 0 && combinedScore >= 500) {
    return "Flawless quarter. Zero exceptions flagged, zero dollars leaked. " +
      "The board will be thrilled — Ramp's controls held up under pressure.";
  }

  const duplicates = wrongDecisions.filter((d) => d.ticket.task === "duplicate");
  const frauds = wrongDecisions.filter((d) => d.ticket.task === "fraud");
  const budgets = wrongDecisions.filter((d) => d.ticket.task === "budget");

  const lines: string[] = [
    `CFO DEBRIEF — Quarter-End Incident Report`,
    ``,
    `Team score: ${combinedScore.toLocaleString()}`,
    `Total financial exposure: $${state.totalDollarImpact.toLocaleString()}`,
    `Incorrect decisions: ${wrongDecisions.length}`,
    `Expired tickets: ${expiredTickets}`,
    `Missed desk deadlines: ${missedDesks}`,
    ``,
  ];

  if (failures === 0) {
    lines.push(
      "Decision quality was clean, but throughput was below target. The team needs to resolve more of the queue."
    );
  }

  if (duplicates.length > 0) {
    lines.push(
      `Duplicate invoices missed: ${duplicates.length}. ` +
      `Ramp's Duplicate Detection would have auto-flagged every one of these.`
    );
  }
  if (frauds.length > 0) {
    lines.push(
      `Suspicious transactions approved: ${frauds.length}. ` +
      `Merchant Lock would have blocked these vendors before the charge even hit.`
    );
  }
  if (budgets.length > 0) {
    lines.push(
      `Budget overruns allowed: ${budgets.length}. ` +
      `Spend Limits enforce policy in real-time — no more rubber-stamping.`
    );
  }

  if (failures > 0) {
    lines.push(
      ``,
      state.didWin
        ? "The team survived the round, but missed work and exceptions kept the quarter at risk."
        : "The quarter ended below operational standards. Faster, more accurate review was required."
    );
  }

  return lines.join("\n");
}
