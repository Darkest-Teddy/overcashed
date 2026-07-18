/**
 * Mock post-game debrief for Overcashed.
 * // TODO: replace mock with OpenAI call when API key is available
 */

function formatDollars(n) {
  const rounded = Math.round(n * 100) / 100;
  return rounded.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: rounded % 1 === 0 ? 0 : 2,
  });
}

function plural(n, one, many) {
  return n === 1 ? one : many;
}

/**
 * Build a dynamic 3-sentence debrief from wrong decisions.
 * Sentence 3 uses ramp_feature from the most expensive miss.
 *
 * @param {Array<{ ticket?: object, dollar_impact?: number } | object>} wrongDecisions
 * @param {number} totalDollarImpact
 * @returns {Promise<string>}
 */
export async function generateDebrief(wrongDecisions, totalDollarImpact) {
  // TODO: replace mock with OpenAI call when API key is available

  const decisions = Array.isArray(wrongDecisions) ? wrongDecisions : [];
  const count = decisions.length;
  const impact = Number(totalDollarImpact) || 0;

  if (count === 0) {
    return (
      "Your team cleared the queue with zero wrong decisions and $0 in exposure. " +
      "Every duplicate, fraud signal, and budget limit was handled correctly under pressure. " +
      "Ramp duplicate detection, behavioral risk monitoring, and spend controls would still stand behind your AP team on a live quarter-close."
    );
  }

  const normalized = decisions.map((d) => {
    const ticket = d && d.ticket ? d.ticket : d;
    const dollar_impact =
      d && typeof d.dollar_impact === "number"
        ? d.dollar_impact
        : ticket && typeof ticket.dollar_impact === "number"
          ? ticket.dollar_impact
          : 0;
    return { ticket, dollar_impact };
  });

  const typeCounts = { duplicate: 0, fraud: 0, budget: 0 };
  for (const { ticket } of normalized) {
    const task = ticket && ticket.task;
    if (task && typeCounts[task] !== undefined) typeCounts[task] += 1;
  }

  const typeParts = [];
  if (typeCounts.fraud)
    typeParts.push(
      `${typeCounts.fraud} ${plural(typeCounts.fraud, "fraudulent transaction", "fraudulent transactions")}`
    );
  if (typeCounts.duplicate)
    typeParts.push(
      `${typeCounts.duplicate} ${plural(typeCounts.duplicate, "duplicate payment", "duplicate payments")}`
    );
  if (typeCounts.budget)
    typeParts.push(
      `${typeCounts.budget} ${plural(typeCounts.budget, "budget violation", "budget violations")}`
    );

  const typePhrase =
    typeParts.length === 0
      ? `${count} ${plural(count, "wrong decision", "wrong decisions")}`
      : typeParts.length === 1
        ? typeParts[0]
        : typeParts.length === 2
          ? `${typeParts[0]} and ${typeParts[1]}`
          : `${typeParts[0]}, ${typeParts[1]}, and ${typeParts[2]}`;

  const sentence1 = `Your team let ${typePhrase} through totaling ${formatDollars(impact)} in exposure.`;

  let largest = normalized[0];
  for (let i = 1; i < normalized.length; i++) {
    const cur = normalized[i];
    const curImpact = cur.dollar_impact;
    const bestImpact = largest.dollar_impact;
    if (curImpact > bestImpact) {
      largest = cur;
    } else if (curImpact === bestImpact) {
      const curAmt = (cur.ticket && cur.ticket.display && cur.ticket.display.amount) || 0;
      const bestAmt =
        (largest.ticket && largest.ticket.display && largest.ticket.display.amount) || 0;
      if (curAmt > bestAmt) largest = cur;
    }
  }

  const t = largest.ticket || {};
  const display = t.display || {};
  const vendor = display.vendor || "an unknown vendor";
  const amount = formatDollars(
    typeof largest.dollar_impact === "number" && largest.dollar_impact > 0
      ? largest.dollar_impact
      : display.amount || 0
  );

  const displayAmount = formatDollars(display.amount || largest.dollar_impact || 0);
  let missDetail;
  if (t.task === "fraud") {
    missDetail = /wire/i.test(display.description || "")
      ? `a ${displayAmount} wire to ${vendor}`
      : `a ${displayAmount} charge to ${vendor}`;
  } else if (t.task === "duplicate") {
    missDetail =
      t.correct_answer === "reject"
        ? `a ${displayAmount} duplicate invoice from ${vendor}`
        : `a legitimate ${displayAmount} invoice from ${vendor}`;
  } else if (t.task === "budget") {
    missDetail =
      t.correct_answer === "reject"
        ? `a ${amount} over-limit spend at ${vendor}`
        : `a policy-compliant ${displayAmount} charge at ${vendor}`;
  } else {
    missDetail = `a ${displayAmount} miss involving ${vendor}`;
  }

  const sentence2 = `The single largest miss was ${missDetail} — a decision your AP queue should have gotten right.`;

  const rampFeature =
    (t && t.ramp_feature) ||
    "Ramp spend controls and risk monitoring catch these issues before they process";

  const sentence3 = rampFeature.trim().endsWith(".")
    ? rampFeature.trim()
    : `${rampFeature.trim()}.`;

  return `${sentence1} ${sentence2} ${sentence3}`;
}
