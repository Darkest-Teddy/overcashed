/**
 * Hardcoded ticket pool for Overcashed.
 * // TODO: swap hardcoded pool for live OpenAI call
 * // when API key is available.
 */

const RAMP_DUPLICATE =
  "Ramp duplicate detection compares invoice numbers and amounts against payment history and flags them before they process";

const RAMP_FRAUD =
  "Ramp behavioral risk monitoring auto-flags suspicious vendor domains and unusual payment methods";

const RAMP_BUDGET =
  "Ramp spend controls enforce policy limits at authorization — out-of-policy charges are blocked before they process";

const TICKET_POOL = [
  // ─── DUPLICATE — legitimate (approve) × 7 ───────────────────────────
  {
    id: "dup-legit-01",
    task: "duplicate",
    display: {
      vendor: "Notion",
      amount: 280,
      description: "Notion workspace subscription — billing@notion.so",
      invoice_number: "INV-1001",
    },
    correct_answer: "approve",
    dollar_impact: 0,
    ramp_feature: RAMP_DUPLICATE,
    difficulty: "easy",
  },
  {
    id: "dup-legit-02",
    task: "duplicate",
    display: {
      vendor: "Slack",
      amount: 375,
      description: "Slack Business+ plan — billing@slack.com",
      invoice_number: "INV-1002",
    },
    correct_answer: "approve",
    dollar_impact: 0,
    ramp_feature: RAMP_DUPLICATE,
    difficulty: "easy",
  },
  {
    id: "dup-legit-03",
    task: "duplicate",
    display: {
      vendor: "Zoom",
      amount: 275,
      description: "Zoom Pro monthly — billing@zoom.us",
      invoice_number: "INV-1003",
    },
    correct_answer: "approve",
    dollar_impact: 0,
    ramp_feature: RAMP_DUPLICATE,
    difficulty: "easy",
  },
  {
    id: "dup-legit-04",
    task: "duplicate",
    display: {
      vendor: "Gusto",
      amount: 356,
      description: "Gusto payroll subscription — billing@gusto.com",
      invoice_number: "INV-1004",
    },
    correct_answer: "approve",
    dollar_impact: 0,
    ramp_feature: RAMP_DUPLICATE,
    difficulty: "medium",
  },
  {
    id: "dup-legit-05",
    task: "duplicate",
    display: {
      vendor: "Rippling",
      amount: 820,
      description: "Rippling HR platform — billing@rippling.com",
      invoice_number: "INV-1005",
    },
    correct_answer: "approve",
    dollar_impact: 0,
    ramp_feature: RAMP_DUPLICATE,
    difficulty: "medium",
  },
  {
    id: "dup-legit-06",
    task: "duplicate",
    display: {
      vendor: "AWS",
      amount: 1847.23,
      description: "AWS cloud infrastructure — aws-billing@amazon.com",
      invoice_number: "INV-1006",
    },
    correct_answer: "approve",
    dollar_impact: 0,
    ramp_feature: RAMP_DUPLICATE,
    difficulty: "hard",
  },
  {
    id: "dup-legit-07",
    task: "duplicate",
    display: {
      vendor: "WeWork",
      amount: 4200,
      description: "WeWork shared office — invoices@wework.com",
      invoice_number: "INV-1007",
    },
    correct_answer: "approve",
    dollar_impact: 0,
    ramp_feature: RAMP_DUPLICATE,
    difficulty: "medium",
  },

  // ─── DUPLICATE — reject (altered invoice + second_invoice) × 7 ──────
  {
    id: "dup-reject-01",
    task: "duplicate",
    display: {
      vendor: "Notion",
      amount: 355,
      description: "Notion workspace subscription — billing@notion.so",
      invoice_number: "INV1001",
      second_invoice: {
        vendor: "Notion",
        amount: 280,
        invoice_number: "INV-1001",
      },
    },
    correct_answer: "reject",
    dollar_impact: 355,
    ramp_feature: RAMP_DUPLICATE,
    difficulty: "easy",
  },
  {
    id: "dup-reject-02",
    task: "duplicate",
    display: {
      vendor: "Slack",
      amount: 450,
      description: "Slack Business+ plan — billing@slack.com",
      invoice_number: "INV1002",
      second_invoice: {
        vendor: "Slack",
        amount: 375,
        invoice_number: "INV-1002",
      },
    },
    correct_answer: "reject",
    dollar_impact: 450,
    ramp_feature: RAMP_DUPLICATE,
    difficulty: "easy",
  },
  {
    id: "dup-reject-03",
    task: "duplicate",
    display: {
      vendor: "Zoom",
      amount: 340,
      description: "Zoom Pro monthly — billing@zoom.us",
      invoice_number: "INV-1003A",
      second_invoice: {
        vendor: "Zoom",
        amount: 275,
        invoice_number: "INV-1003",
      },
    },
    correct_answer: "reject",
    dollar_impact: 340,
    ramp_feature: RAMP_DUPLICATE,
    difficulty: "medium",
  },
  {
    id: "dup-reject-04",
    task: "duplicate",
    display: {
      vendor: "Gusto",
      amount: 430,
      description: "Gusto payroll subscription — billing@gusto.com",
      invoice_number: "INV1004",
      second_invoice: {
        vendor: "Gusto",
        amount: 356,
        invoice_number: "INV-1004",
      },
    },
    correct_answer: "reject",
    dollar_impact: 430,
    ramp_feature: RAMP_DUPLICATE,
    difficulty: "medium",
  },
  {
    id: "dup-reject-05",
    task: "duplicate",
    display: {
      vendor: "Rippling",
      amount: 895,
      description: "Rippling HR platform — billing@rippling.com",
      invoice_number: "INV-1005-DUP",
      second_invoice: {
        vendor: "Rippling",
        amount: 820,
        invoice_number: "INV-1005",
      },
    },
    correct_answer: "reject",
    dollar_impact: 895,
    ramp_feature: RAMP_DUPLICATE,
    difficulty: "hard",
  },
  {
    id: "dup-reject-06",
    task: "duplicate",
    display: {
      vendor: "AWS",
      amount: 1920.5,
      description: "AWS cloud infrastructure — aws-billing@amazon.com",
      invoice_number: "INV1006",
      second_invoice: {
        vendor: "AWS",
        amount: 1847.23,
        invoice_number: "INV-1006",
      },
    },
    correct_answer: "reject",
    dollar_impact: 1920.5,
    ramp_feature: RAMP_DUPLICATE,
    difficulty: "hard",
  },
  {
    id: "dup-reject-07",
    task: "duplicate",
    display: {
      vendor: "WeWork",
      amount: 4285,
      description: "WeWork shared office — invoices@wework.com",
      invoice_number: "INV1007",
      second_invoice: {
        vendor: "WeWork",
        amount: 4200,
        invoice_number: "INV-1007",
      },
    },
    correct_answer: "reject",
    dollar_impact: 4285,
    ramp_feature: RAMP_DUPLICATE,
    difficulty: "medium",
  },

  // ─── FRAUD — reject × 13 ────────────────────────────────────────────
  {
    id: "fraud-01",
    task: "fraud",
    display: {
      vendor: "Notion",
      amount: 280,
      description: "Notion invoice — billing@notion-invoices.com",
      invoice_number: "INV-N-4401",
    },
    correct_answer: "reject",
    dollar_impact: 280,
    ramp_feature: RAMP_FRAUD,
    difficulty: "easy",
  },
  {
    id: "fraud-02",
    task: "fraud",
    display: {
      vendor: "AWS",
      amount: 5000,
      description: "Urgent AWS invoice — aws-billing@amazon-payments.net",
      invoice_number: "INV-AWS-9901",
    },
    correct_answer: "reject",
    dollar_impact: 5000,
    ramp_feature: RAMP_FRAUD,
    difficulty: "medium",
  },
  {
    id: "fraud-03",
    task: "fraud",
    display: {
      vendor: "Slack",
      amount: 375,
      description: "Slack renewal — invoices@sl4ck.com",
      invoice_number: "INV-SL-2201",
    },
    correct_answer: "reject",
    dollar_impact: 375,
    ramp_feature: RAMP_FRAUD,
    difficulty: "easy",
  },
  {
    id: "fraud-04",
    task: "fraud",
    display: {
      vendor: "TotallyLegitSupplies LLC",
      amount: 10000,
      description: "Office equipment wire transfer request",
      invoice_number: "WIRE-TLS-001",
    },
    correct_answer: "reject",
    dollar_impact: 10000,
    ramp_feature: RAMP_FRAUD,
    difficulty: "hard",
  },
  {
    id: "fraud-05",
    task: "fraud",
    display: {
      vendor: "FastPayVendors Inc",
      amount: 10000,
      description: "Expedited vendor payout — wire transfer required today",
      invoice_number: "WIRE-FPV-778",
    },
    correct_answer: "reject",
    dollar_impact: 10000,
    ramp_feature: RAMP_FRAUD,
    difficulty: "hard",
  },
  {
    id: "fraud-06",
    task: "fraud",
    display: {
      vendor: "QuickRemit Solutions",
      amount: 5000,
      description: "Same-day remittance — wire to new beneficiary",
      invoice_number: "WIRE-QRS-112",
    },
    correct_answer: "reject",
    dollar_impact: 5000,
    ramp_feature: RAMP_FRAUD,
    difficulty: "hard",
  },
  {
    id: "fraud-07",
    task: "fraud",
    display: {
      vendor: "Zoom",
      amount: 275,
      description: "Zoom billing update — billing@zoom-pay.com",
      invoice_number: "INV-ZM-3310",
    },
    correct_answer: "reject",
    dollar_impact: 275,
    ramp_feature: RAMP_FRAUD,
    difficulty: "easy",
  },
  {
    id: "fraud-08",
    task: "fraud",
    display: {
      vendor: "Gusto",
      amount: 5000,
      description: "Payroll correction — payroll@gust0.com",
      invoice_number: "INV-GU-5502",
    },
    correct_answer: "reject",
    dollar_impact: 5000,
    ramp_feature: RAMP_FRAUD,
    difficulty: "medium",
  },
  {
    id: "fraud-09",
    task: "fraud",
    display: {
      vendor: "Rippling",
      amount: 820,
      description: "HR platform renewal — billing@ripp1ing.com",
      invoice_number: "INV-RP-6603",
    },
    correct_answer: "reject",
    dollar_impact: 820,
    ramp_feature: RAMP_FRAUD,
    difficulty: "medium",
  },
  {
    id: "fraud-10",
    task: "fraud",
    display: {
      vendor: "WeWork",
      amount: 4200,
      description: "Office lease payment — invoices@wew0rk.com",
      invoice_number: "INV-WW-7704",
    },
    correct_answer: "reject",
    dollar_impact: 4200,
    ramp_feature: RAMP_FRAUD,
    difficulty: "medium",
  },
  {
    id: "fraud-11",
    task: "fraud",
    display: {
      vendor: "TotallyLegitSupplies LLC",
      amount: 5000,
      description: "IT hardware drop-ship — wire transfer preferred",
      invoice_number: "WIRE-TLS-204",
    },
    correct_answer: "reject",
    dollar_impact: 5000,
    ramp_feature: RAMP_FRAUD,
    difficulty: "hard",
  },
  {
    id: "fraud-12",
    task: "fraud",
    display: {
      vendor: "FastPayVendors Inc",
      amount: 7500,
      description: "Urgent AP catch-up — invoices@fastpay-vendors.net",
      invoice_number: "INV-FPV-901",
    },
    correct_answer: "reject",
    dollar_impact: 7500,
    ramp_feature: RAMP_FRAUD,
    difficulty: "hard",
  },
  {
    id: "fraud-13",
    task: "fraud",
    display: {
      vendor: "QuickRemit Solutions",
      amount: 10000,
      description: "Executive bonus disbursement via wire",
      invoice_number: "WIRE-QRS-999",
    },
    correct_answer: "reject",
    dollar_impact: 10000,
    ramp_feature: RAMP_FRAUD,
    difficulty: "hard",
  },

  // ─── BUDGET — reject (over limit) × 4 specified + extras ────────────
  {
    id: "budget-reject-01",
    task: "budget",
    display: {
      vendor: "WeWork",
      amount: 12400,
      description: "WeWork private office NYC (policy limit $8,000)",
      invoice_number: "INV-BUD-2001",
    },
    correct_answer: "reject",
    dollar_impact: 4400,
    ramp_feature: RAMP_BUDGET,
    difficulty: "medium",
  },
  {
    id: "budget-reject-02",
    task: "budget",
    display: {
      vendor: "United Airlines",
      amount: 4200,
      description: "Business class flights (policy limit $1,500)",
      invoice_number: "INV-BUD-2002",
    },
    correct_answer: "reject",
    dollar_impact: 2700,
    ramp_feature: RAMP_BUDGET,
    difficulty: "easy",
  },
  {
    id: "budget-reject-03",
    task: "budget",
    display: {
      vendor: "Marriott",
      amount: 8900,
      description: "Team offsite hotel (policy limit $5,000)",
      invoice_number: "INV-BUD-2003",
    },
    correct_answer: "reject",
    dollar_impact: 3900,
    ramp_feature: RAMP_BUDGET,
    difficulty: "medium",
  },
  {
    id: "budget-reject-04",
    task: "budget",
    display: {
      vendor: "The French Laundry",
      amount: 2100,
      description: "Executive dinner (policy limit $500)",
      invoice_number: "INV-BUD-2004",
    },
    correct_answer: "reject",
    dollar_impact: 1600,
    ramp_feature: RAMP_BUDGET,
    difficulty: "easy",
  },
  {
    id: "budget-reject-05",
    task: "budget",
    display: {
      vendor: "Apple",
      amount: 3200,
      description: "MacBook Pro fleet add-on (policy limit $2,000)",
      invoice_number: "INV-BUD-2005",
    },
    correct_answer: "reject",
    dollar_impact: 1200,
    ramp_feature: RAMP_BUDGET,
    difficulty: "medium",
  },
  {
    id: "budget-reject-06",
    task: "budget",
    display: {
      vendor: "Delta",
      amount: 2800,
      description: "Last-minute first-class redeye (policy limit $1,200)",
      invoice_number: "INV-BUD-2006",
    },
    correct_answer: "reject",
    dollar_impact: 1600,
    ramp_feature: RAMP_BUDGET,
    difficulty: "hard",
  },
  {
    id: "budget-reject-07",
    task: "budget",
    display: {
      vendor: "Four Seasons",
      amount: 6500,
      description: "Client entertainment suite (policy limit $3,000)",
      invoice_number: "INV-BUD-2007",
    },
    correct_answer: "reject",
    dollar_impact: 3500,
    ramp_feature: RAMP_BUDGET,
    difficulty: "hard",
  },

  // ─── BUDGET — approve (under limit) × 4 specified + extras ──────────
  {
    id: "budget-approve-01",
    task: "budget",
    display: {
      vendor: "Sweetgreen",
      amount: 340,
      description: "Team lunch (policy limit $500)",
      invoice_number: "INV-BUD-3001",
    },
    correct_answer: "approve",
    dollar_impact: 0,
    ramp_feature: RAMP_BUDGET,
    difficulty: "easy",
  },
  {
    id: "budget-approve-02",
    task: "budget",
    display: {
      vendor: "Linear",
      amount: 89,
      description: "Software tool subscription (policy limit $200)",
      invoice_number: "INV-BUD-3002",
    },
    correct_answer: "approve",
    dollar_impact: 0,
    ramp_feature: RAMP_BUDGET,
    difficulty: "easy",
  },
  {
    id: "budget-approve-03",
    task: "budget",
    display: {
      vendor: "Staples",
      amount: 127,
      description: "Office supplies (policy limit $250)",
      invoice_number: "INV-BUD-3003",
    },
    correct_answer: "approve",
    dollar_impact: 0,
    ramp_feature: RAMP_BUDGET,
    difficulty: "easy",
  },
  {
    id: "budget-approve-04",
    task: "budget",
    display: {
      vendor: "Web Summit",
      amount: 499,
      description: "Conference ticket (policy limit $1,000)",
      invoice_number: "INV-BUD-3004",
    },
    correct_answer: "approve",
    dollar_impact: 0,
    ramp_feature: RAMP_BUDGET,
    difficulty: "medium",
  },
  {
    id: "budget-approve-05",
    task: "budget",
    display: {
      vendor: "Uber",
      amount: 86,
      description: "Airport ground transport (policy limit $150)",
      invoice_number: "INV-BUD-3005",
    },
    correct_answer: "approve",
    dollar_impact: 0,
    ramp_feature: RAMP_BUDGET,
    difficulty: "easy",
  },
  {
    id: "budget-approve-06",
    task: "budget",
    display: {
      vendor: "Figma",
      amount: 45,
      description: "Design seat add-on (policy limit $100)",
      invoice_number: "INV-BUD-3006",
    },
    correct_answer: "approve",
    dollar_impact: 0,
    ramp_feature: RAMP_BUDGET,
    difficulty: "easy",
  },
];

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
 * Returns the full hardcoded ticket pool (40 tickets).
 * @returns {object[]}
 */
export function getTicketPool() {
  // TODO: swap hardcoded pool for live OpenAI call when API key is available.
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

/**
 * Splits the pool into two independent piles of 20 for p1 and p2.
 * @returns {{ p1Pool: object[], p2Pool: object[] }}
 */
export function splitPool() {
  const shuffled = shuffle(getTicketPool());
  return {
    p1Pool: shuffled.slice(0, 20),
    p2Pool: shuffled.slice(20, 40),
  };
}
