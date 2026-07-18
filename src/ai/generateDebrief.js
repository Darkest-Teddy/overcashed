/**
 * Post-game debrief for Overcashed — live OpenAI with mock fallback.
 */

import OpenAI from "openai";

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
 * Build a dynamic 3-sentence debrief from wrong decisions (mock fallback).
 *
 * @param {Array<{ ticket?: object, dollar_impact?: number } | object>} wrongDecisions
 * @param {number} totalDollarImpact
 * @returns {string}
 */
function getMockDebrief(wrongDecisions, totalDollarImpact) {
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

function highestImpactRampFeature(wrongDecisions) {
  const decisions = Array.isArray(wrongDecisions) ? wrongDecisions : [];
  let best = null;
  let bestImpact = -Infinity;

  for (const d of decisions) {
    const ticket = d && d.ticket ? d.ticket : d;
    const dollar_impact =
      d && typeof d.dollar_impact === "number"
        ? d.dollar_impact
        : ticket && typeof ticket.dollar_impact === "number"
          ? ticket.dollar_impact
          : 0;
    if (dollar_impact > bestImpact) {
      bestImpact = dollar_impact;
      best = ticket;
    }
  }

  return (best && best.ramp_feature) || null;
}

/**
 * Fetch a live 3-sentence CFO debrief from OpenAI.
 * 2 attempts max. Throws on failure.
 *
 * @param {Array} wrongDecisions
 * @param {number} totalDollarImpact
 * @returns {Promise<string>}
 */
async function fetchLiveDebrief(wrongDecisions, totalDollarImpact) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set");
  }

  const openai = new OpenAI({ apiKey });
  const rampFeature = highestImpactRampFeature(wrongDecisions);
  const impact = Number(totalDollarImpact) || 0;

  const systemPrompt =
    "You are the CFO of Ramp reviewing finance decisions " +
    "after a chaotic quarter-close. Write exactly 3 sentences:\n" +
    "1. What went wrong and how many mistakes\n" +
    "2. The exact dollar cost or exposure\n" +
    "3. Which specific Ramp feature catches this automatically\n" +
    "No bullet points. No preamble. Exactly 3 sentences.";

  const userPrompt =
    `wrongDecisions:\n${JSON.stringify(wrongDecisions ?? [], null, 2)}\n\n` +
    `totalDollarImpact: ${formatDollars(impact)}\n\n` +
    `ramp_feature (from highest dollar_impact wrong decision): ${rampFeature ?? "unknown"}`;

  let lastError;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      });

      const content = response.choices?.[0]?.message?.content?.trim();
      if (!content) {
        throw new Error("Empty OpenAI debrief response");
      }
      return content;
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error("OpenAI debrief fetch failed");
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
  try {
    return await fetchLiveDebrief(wrongDecisions, totalDollarImpact);
  } catch (err) {
    console.warn(
      "[generateDebrief] Live OpenAI fetch failed; using mock debrief.",
      err
    );
    return getMockDebrief(wrongDecisions, totalDollarImpact);
  }
}
