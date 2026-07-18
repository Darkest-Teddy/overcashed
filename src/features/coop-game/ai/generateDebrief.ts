"use client";

import type { WrongDecision } from "../game/gameLogic";

/**
 * Generates a CFO-style debrief summarizing what went wrong.
 * Placeholder — swap in a real OpenAI / Anthropic call later.
 */
export function generateDebrief(
  wrongDecisions: WrongDecision[],
  totalDollarImpact: number,
): string {
  if (wrongDecisions.length === 0) {
    return "Flawless quarter. Zero exceptions flagged, zero dollars leaked. " +
      "The board will be thrilled — Ramp's controls held up under pressure.";
  }

  const duplicates = wrongDecisions.filter((d) => d.ticket.task === "duplicate");
  const frauds = wrongDecisions.filter((d) => d.ticket.task === "fraud");
  const budgets = wrongDecisions.filter((d) => d.ticket.task === "budget");

  const lines: string[] = [
    `CFO DEBRIEF — Quarter-End Incident Report`,
    ``,
    `Total financial exposure: $${totalDollarImpact.toLocaleString()}`,
    `Errors logged: ${wrongDecisions.length}`,
    ``,
  ];

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

  lines.push(
    ``,
    `With Ramp, these ${wrongDecisions.length} errors never would have reached a human reviewer.`
  );

  return lines.join("\n");
}
