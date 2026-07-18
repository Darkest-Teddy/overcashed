/**
 * Ticket pool for Overcashed — live OpenAI with hardcoded fallback.
 */

import OpenAI from "openai";

const RAMP_DUPLICATE =
  "Ramp duplicate detection compares invoice numbers and amounts against payment history and flags them before they process";

const RAMP_FRAUD =
  "Ramp behavioral risk monitoring auto-flags suspicious vendor domains and unusual payment methods";

const RAMP_BUDGET =
  "Ramp spend controls enforce policy limits at authorization — out-of-policy charges are blocked before they process";

const DIFFICULTIES = ["easy", "medium", "hard"];

function difficultyAt(i) {
  return DIFFICULTIES[i % 3];
}

function fmtLimit(n) {
  return n.toLocaleString("en-US");
}

/** Deterministic amount pick inside [min, max] from index. */
function amountInRange(min, max, i) {
  const span = max - min;
  const stepped = min + ((i * 37) % (Math.floor(span) + 1));
  return Math.round(stepped * 100) / 100;
}

function buildDuplicateTickets() {
  const vendors = [
    {
      vendor: "Notion",
      amounts: [280, 294, 261, 308],
      email: "billing@notion.so",
      bases: [
        "Notion workspace subscription",
        "Notion Plus seat renewal",
        "Notion team plan monthly",
        "Notion AI add-on billing",
      ],
    },
    {
      vendor: "Slack",
      amounts: [375, 390, 412, 350],
      email: "billing@slack.com",
      bases: [
        "Slack Business+ plan",
        "Slack Enterprise Grid seats",
        "Slack Connect workspace fee",
        "Slack Pro plan renewal",
      ],
    },
    {
      vendor: "Zoom",
      amounts: [275, 289, 301, 263],
      email: "billing@zoom.us",
      bases: [
        "Zoom Pro monthly",
        "Zoom Webinar add-on",
        "Zoom Business plan",
        "Zoom Phone seats",
      ],
    },
    {
      vendor: "AWS",
      amounts: [1847.23, 2341.17, 987.44, 3102.89, 1204.67],
      email: "aws-billing@amazon.com",
      bases: [
        "AWS cloud infrastructure",
        "AWS EC2 compute charges",
        "AWS S3 and data transfer",
        "AWS reserved instance billing",
        "AWS support plan invoice",
      ],
    },
    {
      vendor: "Gusto",
      amounts: [356, 368, 344, 380],
      email: "billing@gusto.com",
      bases: [
        "Gusto payroll subscription",
        "Gusto HR suite monthly",
        "Gusto benefits admin fee",
        "Gusto contractor payments plan",
      ],
    },
    {
      vendor: "Rippling",
      amounts: [820, 845, 798, 862],
      email: "billing@rippling.com",
      bases: [
        "Rippling HR platform",
        "Rippling IT management seats",
        "Rippling payroll module",
        "Rippling device management",
      ],
    },
    {
      vendor: "WeWork",
      amounts: [4200, 4350, 3980, 4100],
      email: "invoices@wework.com",
      bases: [
        "WeWork shared office",
        "WeWork dedicated desk monthly",
        "WeWork all-access membership",
        "WeWork conference room package",
      ],
    },
    {
      vendor: "Stripe",
      amounts: [892.4, 1203.77, 445.23],
      email: "support@stripe.com",
      bases: [
        "Stripe processing fees",
        "Stripe Radar and billing suite",
        "Stripe Atlas annual fee",
      ],
    },
    {
      vendor: "Salesforce",
      amounts: [2400, 2650, 2100],
      email: "billing@salesforce.com",
      bases: [
        "Salesforce Sales Cloud seats",
        "Salesforce Service Cloud renewal",
        "Salesforce Platform licenses",
      ],
    },
    {
      vendor: "HubSpot",
      amounts: [1800, 1950, 1650],
      email: "billing@hubspot.com",
      bases: [
        "HubSpot Marketing Hub",
        "HubSpot Sales Hub Pro",
        "HubSpot CMS seats",
      ],
    },
    {
      vendor: "Figma",
      amounts: [450, 480, 420],
      email: "billing@figma.com",
      bases: [
        "Figma Organization seats",
        "Figma FigJam add-on",
        "Figma Dev Mode licenses",
      ],
    },
    {
      vendor: "Linear",
      amounts: [240, 260, 220],
      email: "billing@linear.app",
      bases: [
        "Linear Business plan",
        "Linear Plus seats",
        "Linear Insights add-on",
      ],
    },
    {
      vendor: "Datadog",
      amounts: [3200, 3450, 2980],
      email: "billing@datadoghq.com",
      bases: [
        "Datadog infrastructure monitoring",
        "Datadog APM and logs",
        "Datadog security monitoring",
      ],
    },
  ];

  const pairs = [];
  for (const v of vendors) {
    for (let i = 0; i < v.amounts.length; i++) {
      pairs.push({
        vendor: v.vendor,
        amount: v.amounts[i],
        email: v.email,
        base: v.bases[i % v.bases.length],
      });
    }
  }
  // 47 unique vendor-amount pairs; pad to 70 by cycling with alt descriptions
  const altSuffix = [
    " — monthly cycle",
    " — Q2 billing",
    " — seat reconciliation",
    " — annual true-up",
    " — usage adjustment",
    " — renewal notice",
  ];

  const tickets = [];
  let invSeq = 1001;

  // 35 legitimate approve — walk pair list so every vendor appears
  for (let i = 0; i < 35; i++) {
    const p = pairs[i % pairs.length];
    const inv = `INV-${invSeq++}`;
    const description = `${p.base}${altSuffix[i % altSuffix.length]} — ${p.email} (#${i + 1})`;
    tickets.push({
      id: `dup-legit-${String(i + 1).padStart(2, "0")}`,
      task: "duplicate",
      display: {
        vendor: p.vendor,
        amount: p.amount,
        description,
        invoice_number: inv,
      },
      correct_answer: "approve",
      dollar_impact: 0,
      ramp_feature: RAMP_DUPLICATE,
      difficulty: difficultyAt(i),
    });
  }

  // 35 reject — altered invoice + second_invoice pointing at prior legit
  const alterStyles = [
    (inv, amt) => ({
      invoice_number: inv.replace("-", ""),
      amount: Math.round((amt + 75) * 100) / 100,
    }),
    (inv, amt) => ({
      invoice_number: `${inv}A`,
      amount: Math.round((amt + 65) * 100) / 100,
    }),
    (inv, amt) => ({
      invoice_number: `${inv}-DUP`,
      amount: Math.round((amt + 85) * 100) / 100,
    }),
    (inv, amt) => ({
      invoice_number: inv.replace("INV-", "INV"),
      amount: Math.round((amt * 1.08) * 100) / 100,
    }),
    (inv, amt) => ({
      invoice_number: `${inv}-R`,
      amount: Math.round((amt + 120) * 100) / 100,
    }),
  ];

  // Offset into pairs so remaining vendors (HubSpot/Figma/Linear/Datadog) appear
  for (let i = 0; i < 35; i++) {
    const p = pairs[(i + 35) % pairs.length];
    const priorInv = `INV-${2000 + i}`;
    const altered = alterStyles[i % alterStyles.length](priorInv, p.amount);
    const description = `${p.base}${altSuffix[(i + 3) % altSuffix.length]} — ${p.email} (resubmit #${i + 1})`;
    tickets.push({
      id: `dup-reject-${String(i + 1).padStart(2, "0")}`,
      task: "duplicate",
      display: {
        vendor: p.vendor,
        amount: altered.amount,
        description,
        invoice_number: altered.invoice_number,
        second_invoice: {
          vendor: p.vendor,
          amount: p.amount,
          invoice_number: priorInv,
        },
      },
      correct_answer: "reject",
      dollar_impact: altered.amount,
      ramp_feature: RAMP_DUPLICATE,
      difficulty: difficultyAt(i + 1),
    });
  }

  return tickets;
}

function buildFraudTickets() {
  const lookAlikes = [
    { vendor: "Notion", email: "billing@notion-invoices.com", label: "Notion invoice" },
    { vendor: "AWS", email: "aws-billing@amazon-payments.net", label: "Urgent AWS invoice" },
    { vendor: "Slack", email: "invoices@sl4ck.com", label: "Slack renewal" },
    { vendor: "Zoom", email: "billing@z0om.us", label: "Zoom billing update" },
    { vendor: "Gusto", email: "pay@gusto-payroll.com", label: "Payroll correction" },
    { vendor: "Rippling", email: "support@ripp1ing.com", label: "HR platform renewal" },
    { vendor: "WeWork", email: "invoices@we-work.net", label: "Office lease payment" },
    { vendor: "Salesforce", email: "billing@salesf0rce.com", label: "CRM license invoice" },
    { vendor: "HubSpot", email: "pay@hubspot-billing.com", label: "Marketing hub payment" },
    { vendor: "Stripe", email: "accounting@str1pe.com", label: "Processing fee catch-up" },
  ];

  const fakeVendors = [
    {
      vendor: "TotallyLegitSupplies LLC",
      lines: [
        "Office equipment wire transfer request",
        "IT hardware drop-ship — wire transfer preferred",
        "Bulk furniture order — same-day wire required",
      ],
    },
    {
      vendor: "FastPayVendors Inc",
      lines: [
        "Expedited vendor payout — wire transfer required today",
        "Urgent AP catch-up — invoices@fastpay-vendors.net",
        "Priority supplier settlement via wire",
      ],
    },
    {
      vendor: "QuickRemit Solutions",
      lines: [
        "Same-day remittance — wire to new beneficiary",
        "Executive bonus disbursement via wire",
        "Emergency contractor payout — new bank details",
      ],
    },
    {
      vendor: "GlobalTrade Partners",
      lines: [
        "International supplier wire — updated routing",
        "Customs clearance fee — wire only",
        "Overseas logistics settlement request",
      ],
    },
    {
      vendor: "SecureVendor Systems",
      lines: [
        "Security audit invoice — wire to escrow",
        "Compliance tooling license — new payee",
        "Penetration test retainer via wire",
      ],
    },
    {
      vendor: "TrustPay International",
      lines: [
        "Cross-border payment facilitation fee",
        "Treasury sweep service — wire transfer",
        "FX settlement advance request",
      ],
    },
    {
      vendor: "PrimeSolutions Corp",
      lines: [
        "Consulting engagement kickoff — wire deposit",
        "Strategy retainer invoice — new account",
        "Advisory fee — expedited wire please",
      ],
    },
    {
      vendor: "EliteVendors LLC",
      lines: [
        "Premium vendor onboarding fee",
        "Preferred supplier annual dues — wire",
        "Marketplace listing fee — same-day pay",
      ],
    },
    {
      vendor: "ProSupply Networks",
      lines: [
        "Warehouse restock wire transfer",
        "Industrial supplies — new banking details",
        "Fleet parts order — wire before ship",
      ],
    },
    {
      vendor: "SwiftPay Global",
      lines: [
        "Instant payout service activation",
        "Payment rail upgrade — wire required",
        "Global disbursement fee — urgent",
      ],
    },
  ];

  const amounts = [
    1000, 2000, 3000, 5000, 7500, 10000, 15000, 20000, 25000, 50000,
  ];

  const tickets = [];
  let n = 1;

  const lookAlikeAngles = [
    "standard billing",
    "past-due reminder",
    "final notice",
    "account review",
  ];

  // 33 look-alike domain frauds
  for (let i = 0; i < 33; i++) {
    const la = lookAlikes[i % lookAlikes.length];
    const amount = amounts[i % amounts.length];
    const angle = lookAlikeAngles[Math.floor(i / lookAlikes.length) % lookAlikeAngles.length];
    const description = `${la.label} (${angle}) — ${la.email} [case ${i + 1}]`;
    tickets.push({
      id: `fraud-${String(n++).padStart(2, "0")}`,
      task: "fraud",
      display: {
        vendor: la.vendor,
        amount,
        description,
        invoice_number: `INV-FR-LA-${String(1000 + i)}`,
      },
      correct_answer: "reject",
      dollar_impact: amount,
      ramp_feature: RAMP_FRAUD,
      difficulty: difficultyAt(i),
    });
  }

  // 32 fake-vendor frauds
  for (let i = 0; i < 32; i++) {
    const fv = fakeVendors[i % fakeVendors.length];
    const amount = amounts[(i + 3) % amounts.length];
    const line = fv.lines[Math.floor(i / fakeVendors.length) % fv.lines.length];
    tickets.push({
      id: `fraud-${String(n++).padStart(2, "0")}`,
      task: "fraud",
      display: {
        vendor: fv.vendor,
        amount,
        description: `${line} (ref ${i + 1})`,
        invoice_number: `WIRE-FV-${String(2000 + i)}`,
      },
      correct_answer: "reject",
      dollar_impact: amount,
      ramp_feature: RAMP_FRAUD,
      difficulty: difficultyAt(i + 1),
    });
  }

  return tickets;
}

function buildBudgetTickets() {
  const rejectScenarios = [
    {
      vendor: "WeWork",
      label: "WeWork private office NYC",
      min: 9000,
      max: 15000,
      limit: 8000,
      vendors: ["WeWork", "WeWork Midtown", "WeWork SoHo", "WeWork Chelsea"],
    },
    {
      vendor: "United Airlines",
      label: "Business class flights",
      min: 2000,
      max: 6000,
      limit: 1500,
      vendors: ["United Airlines", "Delta", "American Airlines", "British Airways"],
    },
    {
      vendor: "Marriott",
      label: "Team offsite hotel",
      min: 6000,
      max: 12000,
      limit: 5000,
      vendors: ["Marriott", "Hilton", "Hyatt", "Four Seasons"],
    },
    {
      vendor: "The French Laundry",
      label: "Executive dinner",
      min: 800,
      max: 3000,
      limit: 500,
      vendors: ["The French Laundry", "Per Se", "Le Bernardin", "Eleven Madison Park"],
    },
    {
      vendor: "Adobe",
      label: "Software licenses",
      min: 500,
      max: 2000,
      limit: 400,
      vendors: ["Adobe", "Microsoft", "Atlassian", "JetBrains"],
    },
    {
      vendor: "Meta Ads",
      label: "Marketing spend",
      min: 8000,
      max: 20000,
      limit: 5000,
      vendors: ["Meta Ads", "Google Ads", "LinkedIn Ads", "TikTok Ads"],
    },
    {
      vendor: "Apex Contractors",
      label: "Contractor invoices",
      min: 15000,
      max: 40000,
      limit: 10000,
      vendors: ["Apex Contractors", "Northstar Consulting", "BrightPath Staffing", "Orbit Freelance Co"],
    },
    {
      vendor: "Apple",
      label: "Equipment purchases",
      min: 3000,
      max: 8000,
      limit: 2500,
      vendors: ["Apple", "Dell", "Lenovo", "CDW"],
    },
  ];

  const approveScenarios = [
    {
      label: "Team lunch",
      min: 200,
      max: 450,
      limit: 500,
      vendors: ["Sweetgreen", "Chipotle", "Shake Shack", "Cava", "Dig Inn"],
    },
    {
      label: "Software tool subscription",
      min: 50,
      max: 180,
      limit: 200,
      vendors: ["Linear", "Notion", "Loom", "Calendly", "Miro"],
    },
    {
      label: "Office supplies",
      min: 80,
      max: 230,
      limit: 250,
      vendors: ["Staples", "Office Depot", "Amazon Business", "Uline"],
    },
    {
      label: "Conference ticket",
      min: 300,
      max: 900,
      limit: 1000,
      vendors: ["Web Summit", "TechCrunch Disrupt", "SaaStr Annual", "Collision"],
    },
    {
      label: "Training course",
      min: 200,
      max: 800,
      limit: 1000,
      vendors: ["Coursera", "Udemy Business", "LinkedIn Learning", "Reforge"],
    },
    {
      label: "Uber business",
      min: 40,
      max: 120,
      limit: 200,
      vendors: ["Uber", "Uber Business", "Lyft Business"],
    },
    {
      label: "Parking",
      min: 30,
      max: 90,
      limit: 150,
      vendors: ["SP+ Parking", "ParkWhiz", "Airport Parking Reserve"],
    },
    {
      label: "Books and resources",
      min: 20,
      max: 80,
      limit: 100,
      vendors: ["Amazon", "Bookshop.org", "O'Reilly", "Audible"],
    },
  ];

  const tickets = [];

  // 33 reject (over limit)
  for (let i = 0; i < 33; i++) {
    const s = rejectScenarios[i % rejectScenarios.length];
    const vendor = s.vendors[Math.floor(i / rejectScenarios.length) % s.vendors.length];
    const amount = amountInRange(s.min, s.max, i + 11);
    const over = Math.round((amount - s.limit) * 100) / 100;
    tickets.push({
      id: `budget-reject-${String(i + 1).padStart(2, "0")}`,
      task: "budget",
      display: {
        vendor,
        amount,
        description: `${s.label} via ${vendor} — $${fmtLimit(amount)} requested (policy limit $${fmtLimit(s.limit)})`,
        invoice_number: `INV-BUD-R-${String(2001 + i)}`,
      },
      correct_answer: "reject",
      dollar_impact: over,
      ramp_feature: RAMP_BUDGET,
      difficulty: difficultyAt(i),
    });
  }

  // 32 approve (under limit)
  for (let i = 0; i < 32; i++) {
    const s = approveScenarios[i % approveScenarios.length];
    const vendor = s.vendors[Math.floor(i / approveScenarios.length) % s.vendors.length];
    const amount = amountInRange(s.min, s.max, i + 7);
    tickets.push({
      id: `budget-approve-${String(i + 1).padStart(2, "0")}`,
      task: "budget",
      display: {
        vendor,
        amount,
        description: `${s.label} via ${vendor} — $${fmtLimit(amount)} (policy limit $${fmtLimit(s.limit)})`,
        invoice_number: `INV-BUD-A-${String(3001 + i)}`,
      },
      correct_answer: "approve",
      dollar_impact: 0,
      ramp_feature: RAMP_BUDGET,
      difficulty: difficultyAt(i + 2),
    });
  }

  return tickets;
}

function buildHardcodedPool() {
  const pool = [
    ...buildDuplicateTickets(),
    ...buildFraudTickets(),
    ...buildBudgetTickets(),
  ];
  if (pool.length !== 200) {
    throw new Error(`Hardcoded pool must be 200 tickets, got ${pool.length}`);
  }
  return pool;
}

const TICKET_POOL = buildHardcodedPool();

function shuffle(arr) {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return out;
}

/**
 * Returns a deep-cloned copy of the hardcoded ticket pool (200 tickets).
 * Kept as the permanent fallback — never delete.
 * @returns {object[]}
 */
export function getHardcodedPool() {
  return TICKET_POOL.map((t) => ({
    ...t,
    display: {
      ...t.display,
      ...(t.display.second_invoice
        ? { second_invoice: { ...t.display.second_invoice } }
        : {}),
    },
  }));
}

const TICKET_JSON_SCHEMA = {
  type: "object",
  properties: {
    tickets: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          task: { type: "string", enum: ["duplicate", "fraud", "budget"] },
          display: {
            type: "object",
            properties: {
              vendor: { type: "string" },
              amount: { type: "number" },
              description: { type: "string" },
              invoice_number: { type: "string" },
              second_invoice: {
                anyOf: [
                  {
                    type: "object",
                    properties: {
                      vendor: { type: "string" },
                      amount: { type: "number" },
                      invoice_number: { type: "string" },
                    },
                    required: ["vendor", "amount", "invoice_number"],
                    additionalProperties: false,
                  },
                  { type: "null" },
                ],
              },
            },
            required: [
              "vendor",
              "amount",
              "description",
              "invoice_number",
              "second_invoice",
            ],
            additionalProperties: false,
          },
          correct_answer: { type: "string", enum: ["approve", "reject"] },
          dollar_impact: { type: "number" },
          ramp_feature: { type: "string" },
          difficulty: { type: "string", enum: ["easy", "medium", "hard"] },
        },
        required: [
          "id",
          "task",
          "display",
          "correct_answer",
          "dollar_impact",
          "ramp_feature",
          "difficulty",
        ],
        additionalProperties: false,
      },
    },
  },
  required: ["tickets"],
  additionalProperties: false,
};

const LIVE_TICKET_PROMPT = `Generate exactly 40 AP review tickets for a co-op finance game matching this frozen shape:
{
  id: string,
  task: "duplicate" | "fraud" | "budget",
  display: {
    vendor: string,
    amount: number,
    description: string,
    invoice_number: string,
    second_invoice?: { vendor, amount, invoice_number }  // only for duplicate-reject tickets; otherwise null
  },
  correct_answer: "approve" | "reject",
  dollar_impact: number,  // 0 when correct_answer is approve; otherwise the exposure amount
  ramp_feature: string,   // which Ramp product feature would catch this
  difficulty: "easy" | "medium" | "hard"
}

Composition (exact counts):
- 7 duplicate legitimate (approve) — unique real SaaS/office vendors
- 7 duplicate reject — altered invoice_number / amount with second_invoice showing the prior legitimate invoice
- 13 fraud reject — spoofed domains, fake vendors, or wire-transfer urgency
- 7 budget reject — over policy limits (mention limit in description; dollar_impact = amount - limit)
- 6 budget approve — under policy limits

Use realistic vendor names and dollar amounts. Set second_invoice to null when not needed.
ramp_feature should name a concrete Ramp capability (duplicate detection, behavioral risk monitoring, or spend controls).`;

/**
 * Fetch 40 tickets from OpenAI gpt-4o (json_schema strict).
 * 2 attempts max, 6s total timeout. Throws on failure.
 * @returns {Promise<object[]>}
 */
async function fetchLiveTickets() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set");
  }

  const openai = new OpenAI({ apiKey });
  const deadline = Date.now() + 6000;
  let lastError;

  for (let attempt = 0; attempt < 2; attempt++) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) {
      throw lastError || new Error("OpenAI ticket fetch timed out");
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), remaining);

    try {
      const response = await openai.chat.completions.create(
        {
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content:
                "You generate structured AP ticket pools for a finance training game. Return only schema-valid JSON.",
            },
            { role: "user", content: LIVE_TICKET_PROMPT },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "ticket_pool",
              strict: true,
              schema: TICKET_JSON_SCHEMA,
            },
          },
        },
        { signal: controller.signal }
      );

      const content = response.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error("Empty OpenAI response");
      }

      const parsed = JSON.parse(content);
      const tickets = parsed?.tickets;
      if (!Array.isArray(tickets) || tickets.length !== 40) {
        throw new Error(
          `Expected 40 tickets, got ${Array.isArray(tickets) ? tickets.length : typeof tickets}`
        );
      }

      return tickets.map((t) => {
        const display = { ...t.display };
        if (display.second_invoice) {
          display.second_invoice = { ...display.second_invoice };
        } else {
          delete display.second_invoice;
        }
        return { ...t, display };
      });
    } catch (err) {
      lastError = err;
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastError || new Error("OpenAI ticket fetch failed");
}

/**
 * Returns the full ticket pool — live OpenAI with hardcoded fallback (200).
 * @returns {Promise<object[]>}
 */
export async function getTicketPool() {
  try {
    return await fetchLiveTickets();
  } catch (err) {
    console.warn(
      "[generateTicketPool] Live OpenAI fetch failed; using hardcoded pool.",
      err
    );
    return getHardcodedPool();
  }
}

/**
 * Splits the pool into two independent equal halves for p1 and p2.
 * @returns {Promise<{ p1Pool: object[], p2Pool: object[] }>}
 */
export async function splitPool() {
  const shuffled = shuffle(await getTicketPool());
  const mid = Math.floor(shuffled.length / 2);
  return {
    p1Pool: shuffled.slice(0, mid),
    p2Pool: shuffled.slice(mid),
  };
}
