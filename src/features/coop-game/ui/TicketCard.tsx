"use client";

import type { Ticket } from "../game/gameLogic";

// ─── Shared styles ──────────────────────────────────────────────────────────

const card: React.CSSProperties = {
  background: "rgba(15,15,25,0.92)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 14,
  padding: "18px 20px",
  fontFamily: "ui-monospace, monospace",
  color: "#e8e8ef",
  minWidth: 0,
};

const vendorStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  letterSpacing: 0.5,
  textTransform: "uppercase" as const,
  opacity: 0.7,
  marginBottom: 4,
};

const amountStyle: React.CSSProperties = {
  fontSize: 28,
  fontWeight: 800,
  color: "#fff",
  marginBottom: 6,
};

const descStyle: React.CSSProperties = {
  fontSize: 12,
  opacity: 0.6,
  lineHeight: 1.4,
};

const invoiceStyle: React.CSSProperties = {
  fontSize: 11,
  opacity: 0.45,
  marginTop: 4,
};

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: 1.5,
  textTransform: "uppercase" as const,
  textAlign: "center" as const,
  marginBottom: 10,
  padding: "4px 0",
};

// ─── Invoice mini-card (used inside duplicate view) ─────────────────────────

function InvoiceCard({
  vendor,
  amount,
  description,
  invoiceNumber,
  label,
}: {
  vendor: string;
  amount: number;
  description?: string;
  invoiceNumber?: string;
  label: string;
}) {
  return (
    <div style={{ ...card, flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 10, fontWeight: 700, opacity: 0.5, marginBottom: 8, letterSpacing: 1 }}>
        {label}
      </div>
      <div style={vendorStyle}>{vendor}</div>
      <div style={{ ...amountStyle, fontSize: 22 }}>${amount.toLocaleString()}</div>
      {description && <div style={descStyle}>{description}</div>}
      {invoiceNumber && <div style={invoiceStyle}>#{invoiceNumber}</div>}
    </div>
  );
}

// ─── Duplicate ──────────────────────────────────────────────────────────────

function DuplicateTicket({ ticket }: { ticket: Ticket }) {
  const { display } = ticket;
  const second = display.second_invoice;
  return (
    <div>
      <div style={{ ...labelStyle, color: "#fbbf24" }}>DUPLICATE?</div>
      <div style={{ display: "flex", gap: 10 }}>
        <InvoiceCard
          vendor={display.vendor}
          amount={display.amount}
          description={display.description}
          invoiceNumber={display.invoice_number}
          label="NEW"
        />
        {second && (
          <InvoiceCard
            vendor={second.vendor}
            amount={second.amount}
            invoiceNumber={second.invoice_number}
            label="ALREADY PAID"
          />
        )}
      </div>
    </div>
  );
}

// ─── Fraud ──────────────────────────────────────────────────────────────────

function FraudTicket({ ticket }: { ticket: Ticket }) {
  const { display } = ticket;
  return (
    <div>
      <div style={{ ...labelStyle, color: "#ef4444" }}>SUSPICIOUS TRANSACTION</div>
      <div
        style={{
          ...card,
          border: "2px solid #ef4444",
          animation: "pulse-red 1.2s ease-in-out infinite",
        }}
      >
        <div style={vendorStyle}>{display.vendor}</div>
        <div style={amountStyle}>${display.amount.toLocaleString()}</div>
        <div style={descStyle}>{display.description}</div>
      </div>
    </div>
  );
}

// ─── Budget ─────────────────────────────────────────────────────────────────

function BudgetTicket({ ticket }: { ticket: Ticket }) {
  const { display } = ticket;
  // derive a policy limit from dollar_impact — if impact > 0, limit = amount - impact
  const policyLimit =
    ticket.dollar_impact > 0 ? display.amount - ticket.dollar_impact : display.amount + 2000;
  return (
    <div>
      <div style={{ ...labelStyle, color: "#60a5fa" }}>SPEND REQUEST</div>
      <div style={card}>
        <div style={vendorStyle}>{display.vendor}</div>
        <div style={amountStyle}>${display.amount.toLocaleString()}</div>
        <div style={descStyle}>{display.description}</div>
        <div
          style={{
            marginTop: 12,
            padding: "8px 12px",
            borderRadius: 8,
            background: "rgba(96,165,250,0.12)",
            border: "1px solid rgba(96,165,250,0.3)",
            fontSize: 13,
            fontWeight: 700,
            textAlign: "center",
          }}
        >
          Request: <span style={{ color: "#fff" }}>${display.amount.toLocaleString()}</span>
          <span style={{ opacity: 0.5, margin: "0 8px" }}>|</span>
          Limit: <span style={{ color: policyLimit < display.amount ? "#ef4444" : "#4ade80" }}>
            ${policyLimit.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Public component ───────────────────────────────────────────────────────

export function TicketCard({ ticket }: { ticket: Ticket }) {
  switch (ticket.task) {
    case "duplicate":
      return <DuplicateTicket ticket={ticket} />;
    case "fraud":
      return <FraudTicket ticket={ticket} />;
    case "budget":
      return <BudgetTicket ticket={ticket} />;
  }
}
