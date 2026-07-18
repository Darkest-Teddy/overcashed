"use client";

import { useEffect, useCallback, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { WorldContents } from "./Scene";
import { SplitScreenRenderer } from "./SplitScreenRenderer";
import { keys, stepGame, players, playerStations, STATIONS } from "./state";
import type { Station } from "./state";
import { useAmbientMusic } from "./useAmbientMusic";
import {
  gameState,
  submitAnswer,
  initGame,
  resetGame,
  tickGame,
  assignTicket,
  expireTicket,
  missDeskDeadline,
  TICKET_DECISION_SECONDS,
  subscribe,
} from "./game/gameLogic";
import type { GameState } from "./game/gameLogic";
import { generateDebrief } from "./ai/generateDebrief";
import { TicketCard } from "./ui/TicketCard";

// ─── CSS Keyframes (injected once) ──────────────────────────────────────────

const STYLE_ID = "coop-game-keyframes";
function ensureKeyframes() {
  if (typeof document === "undefined") return;
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    @font-face {
      font-family: 'Luckiest Guy';
      src: url('/fonts/LuckiestGuy-Regular.ttf') format('truetype');
      font-display: swap;
    }
    @keyframes pulse-red {
      0%, 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.4); }
      50% { box-shadow: 0 0 20px 4px rgba(239,68,68,0.7); }
    }
    @keyframes pulse-health {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
    @keyframes flash-green {
      0% { background: rgba(74,222,128,0.45); }
      100% { background: transparent; }
    }
    @keyframes flash-red {
      0% { background: rgba(239,68,68,0.45); }
      100% { background: transparent; }
    }
    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      10% { transform: translateX(-8px); }
      20% { transform: translateX(8px); }
      30% { transform: translateX(-6px); }
      40% { transform: translateX(6px); }
      50% { transform: translateX(-4px); }
      60% { transform: translateX(4px); }
      70% { transform: translateX(-2px); }
      80% { transform: translateX(2px); }
    }
    @keyframes phase-flash {
      0% { opacity: 0.6; }
      100% { opacity: 0; }
    }
    @keyframes valuation-tick {
      0% { opacity: 0; transform: translateY(-10px); }
      20% { opacity: 1; transform: translateY(0); }
      100% { opacity: 1; transform: translateY(0); }
    }
    @keyframes slide-in {
      0% { transform: translateY(-30px); opacity: 0; }
      100% { transform: translateY(0); opacity: 1; }
    }
    @keyframes bob {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-4px); }
    }
  `;
  document.head.appendChild(style);
}

// ─── Snapshot helper ────────────────────────────────────────────────────────

function snap(gs: GameState): GameState {
  return {
    ...gs,
    p1: { ...gs.p1 },
    p2: { ...gs.p2 },
    wrongDecisions: [...gs.wrongDecisions],
    missedDeskDeadlines: { ...gs.missedDeskDeadlines },
    expiredTickets: { ...gs.expiredTickets },
  };
}

function fmtTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

// ─── All keys we track (full WASD + arrows) ─────────────────────────────────

const TRACKED_KEYS = new Set([
  "w", "a", "s", "d",
  "arrowup", "arrowdown", "arrowleft", "arrowright",
]);

type TargetStationIds = [string | null, string | null];
const DESK_TRAVEL_SECONDS = 10;

function pickStationId(excludedIds: Set<string>): string {
  const candidates = STATIONS.filter((station) => !excludedIds.has(station.id));
  const pool = candidates.length > 0 ? candidates : STATIONS;
  return pool[Math.floor(Math.random() * pool.length)].id;
}

// ─── Top Bar (HUD) ─────────────────────────────────────────────────────────

function TopBar({ health, time, phase }: { health: number; time: number; phase: number }) {
  const low = health <= 25;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 40,
        padding: "12px 32px",
        background: "rgba(0,0,0,0.75)",
        backdropFilter: "blur(8px)",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: 2,
          textTransform: "uppercase",
          color: phase === 3 ? "#ef4444" : phase === 2 ? "#fbbf24" : "#4ade80",
          minWidth: 80,
        }}
      >
        PHASE {phase}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, maxWidth: 400 }}>
        <span style={{ fontSize: 12, fontWeight: 700, opacity: 0.6, minWidth: 52 }}>HEALTH</span>
        <div
          style={{
            flex: 1,
            height: 18,
            borderRadius: 9,
            background: "rgba(255,255,255,0.08)",
            overflow: "hidden",
            border: low ? "1px solid #ef4444" : "1px solid rgba(255,255,255,0.1)",
            animation: low ? "pulse-health 0.6s ease-in-out infinite" : undefined,
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${health}%`,
              borderRadius: 9,
              background:
                health > 50
                  ? "linear-gradient(90deg, #4ade80, #22c55e)"
                  : health > 25
                  ? "linear-gradient(90deg, #fbbf24, #f59e0b)"
                  : "linear-gradient(90deg, #ef4444, #dc2626)",
              transition: "width 0.3s ease-out",
            }}
          />
        </div>
        <span style={{ fontSize: 14, fontWeight: 800, minWidth: 36, textAlign: "right" }}>
          {Math.round(health)}
        </span>
      </div>

      <div
        style={{
          fontSize: 44,
          fontWeight: 900,
          fontVariantNumeric: "tabular-nums",
          color: time <= 45 ? "#ef4444" : "#fff",
          textShadow: time <= 45 ? "0 0 18px rgba(239,68,68,0.7)" : "none",
          animation: time <= 10 ? "pulse-health 0.55s ease-in-out infinite" : undefined,
          minWidth: 120,
          textAlign: "center",
        }}
      >
        {fmtTime(time)}
      </div>
    </div>
  );
}

// ─── Directional Arrow (points toward the assigned desk) ────────────────────

function DeskArrow({
  playerIndex,
  color,
  targetStation,
  travelSecondsLeft,
}: {
  playerIndex: number;
  color: string;
  targetStation: Station;
  travelSecondsLeft: number;
}) {
  const p = players[playerIndex];
  const distance = Math.hypot(p.x - targetStation.x, p.y - targetStation.y);
  // Angle from player to station (screen coords: +x right, +y down)
  const angle = Math.atan2(targetStation.y - p.y, targetStation.x - p.x);
  const deg = (angle * 180) / Math.PI;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 12,
      }}
    >
      {/* Pulsing arrow */}
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: "50%",
          background: `rgba(${color === "#4f9dff" ? "79,157,255" : "255,122,89"},0.15)`,
          border: `2px solid ${color}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          animation: "pulse-health 1s ease-in-out infinite",
        }}
      >
        <div
          style={{
            fontSize: 32,
            lineHeight: 1,
            transform: `rotate(${deg}deg)`,
            transition: "transform 0.15s ease-out",
          }}
        >
          ➤
        </div>
      </div>
      <div
        style={{
          fontSize: 14,
          fontWeight: 800,
          letterSpacing: 1,
          color: "#fff",
          textTransform: "uppercase",
          textAlign: "center",
          textShadow: "0 1px 2px rgba(0,0,0,0.9)",
          background: "rgba(8,10,16,0.9)",
          border: "1px solid rgba(255,255,255,0.24)",
          borderRadius: 999,
          padding: "8px 15px",
          boxShadow: "0 5px 18px rgba(0,0,0,0.45)",
          backdropFilter: "blur(6px)",
        }}
      >
        <span style={{ opacity: 0.72 }}>GO TO</span>{" "}
        <span style={{ color: "#facc15" }}>{targetStation.label}</span>
      </div>
      <div style={{ fontSize: 11, opacity: 0.5 }}>
        Follow your {color === "#4f9dff" ? "blue" : "orange"} marker ({Math.round(distance)} units)
      </div>
      <div
        style={{
          marginTop: 2,
          padding: "6px 12px",
          borderRadius: 999,
          background: travelSecondsLeft <= 3 ? "rgba(239,68,68,0.2)" : "rgba(0,0,0,0.65)",
          border: `1px solid ${travelSecondsLeft <= 3 ? "#ef4444" : "rgba(255,255,255,0.14)"}`,
          color: travelSecondsLeft <= 3 ? "#f87171" : "#fff",
          fontSize: 12,
          fontWeight: 900,
          letterSpacing: 1,
          animation: travelSecondsLeft <= 3 ? "pulse-red 0.8s ease-in-out infinite" : undefined,
        }}
      >
        REACH DESK IN {travelSecondsLeft}s
      </div>
    </div>
  );
}

// ─── Player HUD Panel ──────────────────────────────────────────────────────

function PlayerHUD({
  player,
  playerIndex,
  state,
  flashClass,
  approveKey,
  rejectKey,
  moveKeys,
  confirmKey,
  color,
  side,
  atStation,
  stationLabel,
  targetStation,
  travelSecondsLeft,
  confirmed,
}: {
  player: "P1" | "P2";
  playerIndex: number;
  state: GameState["p1"];
  flashClass: string | null;
  approveKey: string;
  rejectKey: string;
  moveKeys: string;
  confirmKey: string;
  color: string;
  side: "left" | "right";
  atStation: boolean;
  stationLabel: string | null;
  targetStation: Station | null;
  travelSecondsLeft: number;
  confirmed: boolean;
}) {
  const roaming = !atStation;
  const atDeskWaiting = atStation && !confirmed; // at desk, hasn't pressed Q/M yet
  const atDeskTicketing = atStation && confirmed; // actively reviewing tickets
  const ticketTimer = state.ticketTimer;

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        bottom: 0,
        [side]: 0,
        width: "50%",
        display: "flex",
        flexDirection: "column",
        pointerEvents: "none",
      }}
    >
      {/* Flash overlay */}
      {flashClass && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            animation: `${flashClass} 0.4s ease-out forwards`,
            pointerEvents: "none",
            zIndex: 10,
          }}
        />
      )}

      {/* Score badge */}
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "center",
          gap: 8,
          padding: "14px 0 8px",
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", color }}>
          {player}
        </span>
        <span style={{ fontSize: 32, fontWeight: 900, color: "#fff" }}>
          {state.score.toLocaleString()}
        </span>
      </div>

      {/* Center area */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {roaming && targetStation && (
          <DeskArrow
            playerIndex={playerIndex}
            color={color}
            targetStation={targetStation}
            travelSecondsLeft={travelSecondsLeft}
          />
        )}
        {atDeskWaiting && (
          /* Player is at desk but hasn't pressed Q/M to start reviewing */
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
            <div
              style={{
                fontSize: 16,
                fontWeight: 800,
                letterSpacing: 1,
                color: "#fbbf24",
                textTransform: "uppercase",
                textAlign: "center",
                textShadow: "0 0 12px rgba(251,191,36,0.5)",
              }}
            >
              DESK READY
            </div>
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: 12,
                border: `3px solid ${color}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 32,
                fontWeight: 900,
                color,
                background: "rgba(0,0,0,0.6)",
                animation: "pulse-health 1s ease-in-out infinite",
              }}
            >
              {confirmKey}
            </div>
            <div style={{ fontSize: 13, opacity: 0.6, textAlign: "center" }}>
              Press <span style={{ fontWeight: 800, color: "#fff" }}>{confirmKey}</span> to open this desk&apos;s task
            </div>
          </div>
        )}
      </div>

      {/* Bottom area: ticket card when confirmed at desk, move hint when roaming */}
      <div style={{ padding: "0 16px 8px", display: "flex", justifyContent: "center" }}>
        {atDeskTicketing ? (
          <div
            style={{
              maxWidth: 440,
              width: "100%",
              background: "rgba(0,0,0,0.75)",
              backdropFilter: "blur(6px)",
              borderRadius: 14,
              padding: "14px 16px",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            {stationLabel && (
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, opacity: 0.5, textAlign: "center", marginBottom: 8 }}>
                {stationLabel}
              </div>
            )}
            {state.activeTicket ? (
              <>
                <TicketCard ticket={state.activeTicket} />
                <div style={{ marginTop: 12 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: 5,
                      fontSize: 10,
                      fontWeight: 900,
                      letterSpacing: 1.2,
                      color: ticketTimer <= 3 ? "#ef4444" : "#fbbf24",
                    }}
                  >
                    <span>DECIDE NOW</span>
                    <span>{ticketTimer.toFixed(1)}s</span>
                  </div>
                  <div
                    style={{
                      height: 9,
                      overflow: "hidden",
                      borderRadius: 999,
                      background: "rgba(255,255,255,0.1)",
                      border: ticketTimer <= 3
                        ? "1px solid rgba(239,68,68,0.6)"
                        : "1px solid rgba(251,191,36,0.35)",
                    }}
                  >
                    <div
                      style={{
                        width: `${(ticketTimer / TICKET_DECISION_SECONDS) * 100}%`,
                        height: "100%",
                        borderRadius: 999,
                        background: ticketTimer <= 3
                          ? "linear-gradient(90deg, #dc2626, #ef4444)"
                          : "linear-gradient(90deg, #f59e0b, #fbbf24)",
                        transition: "width 0.1s linear",
                        boxShadow: ticketTimer <= 3
                          ? "0 0 12px rgba(239,68,68,0.75)"
                          : "none",
                      }}
                    />
                  </div>
                </div>
              </>
            ) : (
              <div style={{ opacity: 0.3, fontSize: 14, textAlign: "center", padding: 12 }}>
                Waiting for ticket…
              </div>
            )}
          </div>
        ) : roaming ? (
          <div
            style={{
              background: "rgba(0,0,0,0.7)",
              backdropFilter: "blur(4px)",
              borderRadius: 10,
              padding: "10px 20px",
              textAlign: "center",
              border: "1px solid rgba(251,191,36,0.3)",
            }}
          >
            <div style={{ fontSize: 11, opacity: 0.5 }}>
              Move: <span style={{ fontWeight: 700, opacity: 1, color: "#fff" }}>{moveKeys}</span>
            </div>
          </div>
        ) : null}
      </div>

      {/* Keybind hints — only when actively ticketing */}
      {atDeskTicketing && (
        <div style={{ display: "flex", justifyContent: "center", gap: 20, padding: "8px 0 14px" }}>
          <KeyHint label={approveKey} action="APPROVE" color="#4ade80" />
          <KeyHint label={rejectKey} action="REJECT" color="#ef4444" />
          <KeyHint label={confirmKey} action="LEAVE DESK" color="#fbbf24" />
        </div>
      )}

      {roaming && <div style={{ height: 46 }} />}
    </div>
  );
}

function KeyHint({ label, action, color }: { label: string; action: string; color: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div
        style={{
          width: 38,
          height: 38,
          borderRadius: 8,
          border: `2px solid ${color}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 15,
          fontWeight: 800,
          color,
          background: "rgba(0,0,0,0.5)",
        }}
      >
        {label}
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, opacity: 0.6, color: "#fff" }}>
        {action}
      </span>
    </div>
  );
}

// ─── Win Screen ─────────────────────────────────────────────────────────────

function getPerformanceFeedback(state: GameState) {
  const combinedScore = state.p1.score + state.p2.score;
  const failures =
    state.wrongDecisions.length +
    state.expiredTickets.p1 + state.expiredTickets.p2 +
    state.missedDeskDeadlines.p1 + state.missedDeskDeadlines.p2;

  if (combinedScore === 0) {
    return {
      tone: "negative" as const,
      initials: "FO",
      author: "Finance Operations",
      source: "performance review",
      quote: "No reviews were completed. The queue was left unattended, and the quarter remained exposed.",
    };
  }
  if (failures === 0 && combinedScore >= 500) {
    return {
      tone: "positive" as const,
      initials: "EG",
      author: "Eric Glyman",
      source: "via Slack",
      quote: "The finance team moved quickly and kept the numbers clean. This is the standard we need.",
    };
  }
  if (failures === 0) {
    return {
      tone: "neutral" as const,
      initials: "FO",
      author: "Finance Operations",
      source: "performance review",
      quote: "Decision quality was clean, but throughput was below target. More of the queue needed attention.",
    };
  }
  return {
    tone: failures >= 3 ? "negative" as const : "neutral" as const,
    initials: "FO",
    author: "Finance Operations",
    source: "performance review",
    quote: failures >= 3
      ? "The round closed, but missed deadlines and unresolved reviews left the quarter at risk."
      : "The team survived the round, but the exception rate still needs work.",
  };
}

function WinScreen({ state, debrief }: { state: GameState; debrief: string }) {
  const combined = state.p1.score + state.p2.score;
  const feedback = getPerformanceFeedback(state);
  const feedbackColor = feedback.tone === "positive"
    ? "74,222,128"
    : feedback.tone === "negative"
      ? "239,68,68"
      : "251,191,36";
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "rgba(0,0,0,0.8)",
        backdropFilter: "blur(12px)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 28,
        padding: 40,
        animation: "slide-in 0.5s ease-out",
        zIndex: 40,
      }}
    >
      <div
        style={{
          maxWidth: 600,
          background: `rgba(${feedbackColor},0.1)`,
          border: `1px solid rgba(${feedbackColor},0.35)`,
          borderRadius: 12,
          padding: "20px 24px",
          display: "flex",
          gap: 14,
          alignItems: "flex-start",
        }}
      >
        <div
          style={{
            width: 44, height: 44, borderRadius: 8,
            background: `rgba(${feedbackColor},0.25)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 20, fontWeight: 900, flexShrink: 0,
          }}
        >
          {feedback.initials}
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 4 }}>
            {feedback.author}{" "}
            <span style={{ fontWeight: 400, opacity: 0.5, fontSize: 12 }}>{feedback.source}</span>
          </div>
          <div style={{ fontSize: 15, lineHeight: 1.5, opacity: 0.9 }}>
            &ldquo;{feedback.quote}&rdquo;
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 40, fontSize: 18, fontWeight: 700 }}>
        <div><span style={{ color: "#4f9dff" }}>P1</span> {state.p1.score.toLocaleString()}</div>
        <div style={{ fontSize: 11, opacity: 0.4, alignSelf: "center" }}>+</div>
        <div><span style={{ color: "#ff7a59" }}>P2</span> {state.p2.score.toLocaleString()}</div>
        <div style={{ fontSize: 11, opacity: 0.4, alignSelf: "center" }}>=</div>
        <div style={{ color: "#4ade80", fontSize: 22 }}>{combined.toLocaleString()}</div>
      </div>

      <div
        style={{
          maxWidth: 560, background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10,
          padding: "16px 20px", fontSize: 13, lineHeight: 1.65,
          opacity: 0.8, whiteSpace: "pre-wrap",
        }}
      >
        {debrief}
      </div>
      <div style={{ fontSize: 12, opacity: 0.3, marginTop: 8 }}>Restarting in a few seconds…</div>
    </div>
  );
}

// ─── Lose Screen ────────────────────────────────────────────────────────────

function ValuationCounter() {
  const [val, setVal] = useState(44.0);
  useEffect(() => {
    const target = 43.1;
    const start = 44.0;
    const duration = 3000;
    const t0 = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const elapsed = now - t0;
      const pct = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - pct, 3);
      setVal(start - (start - target) * eased);
      if (pct < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <div style={{ fontSize: 48, fontWeight: 900, fontVariantNumeric: "tabular-nums", color: "#ef4444", animation: "valuation-tick 0.8s ease-out" }}>
      ${val.toFixed(1)}B
    </div>
  );
}

function LoseScreen({ state, debrief }: { state: GameState; debrief: string }) {
  return (
    <div
      style={{
        position: "absolute", inset: 0, background: "rgba(0,0,0,0.8)",
        backdropFilter: "blur(12px)", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: 24, padding: 40,
        animation: "slide-in 0.5s ease-out", zIndex: 40,
      }}
    >
      <div
        style={{
          maxWidth: 520, background: "rgba(239,68,68,0.08)",
          border: "1px solid rgba(239,68,68,0.25)", borderRadius: 14,
          padding: "16px 20px", display: "flex", gap: 12, alignItems: "flex-start",
        }}
      >
        <div
          style={{
            width: 40, height: 40, borderRadius: 10, background: "#1a1a1a",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 11, fontWeight: 900, letterSpacing: -0.5, flexShrink: 0,
            border: "1px solid rgba(255,255,255,0.15)",
          }}
        >
          WSJ
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.6, marginBottom: 2 }}>BREAKING NEWS</div>
          <div style={{ fontSize: 15, lineHeight: 1.45, fontWeight: 600 }}>
            Ramp&apos;s finance systems in chaos amid quarter-end meltdown.
          </div>
        </div>
      </div>

      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 12, opacity: 0.5, marginBottom: 4, letterSpacing: 1 }}>RAMP VALUATION</div>
        <ValuationCounter />
      </div>

      <div style={{ display: "flex", gap: 32, fontSize: 16, fontWeight: 700, opacity: 0.7 }}>
        <div><span style={{ color: "#4f9dff" }}>P1</span> {state.p1.score.toLocaleString()}</div>
        <div><span style={{ color: "#ff7a59" }}>P2</span> {state.p2.score.toLocaleString()}</div>
      </div>

      <div
        style={{
          maxWidth: 560, background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10,
          padding: "16px 20px", fontSize: 13, lineHeight: 1.65,
          opacity: 0.8, whiteSpace: "pre-wrap",
        }}
      >
        {debrief}
      </div>
      <div style={{ fontSize: 12, opacity: 0.3, marginTop: 8 }}>Restarting in a few seconds…</div>
    </div>
  );
}

// ─── Intro Splash ───────────────────────────────────────────────────────────
// Plays the blueprint logo animation (public/overcashed-intro.html) once on
// load, then hands off to the start screen. The iframe reports completion via
// postMessage; a timer covers the case where it never loads.

function IntroSplash({ onDone }: { onDone: () => void }) {
  const [fading, setFading] = useState(false);
  const doneRef = useRef(false);

  useEffect(() => {
    let fadeTimer: ReturnType<typeof setTimeout> | null = null;
    const finish = () => {
      if (doneRef.current) return;
      doneRef.current = true;
      setFading(true);
      fadeTimer = setTimeout(onDone, 450);
    };
    const onMsg = (e: MessageEvent) => {
      if (e.data === "overcashed-intro-done") finish();
    };
    window.addEventListener("message", onMsg);
    const fallback = setTimeout(finish, 7500);
    return () => {
      window.removeEventListener("message", onMsg);
      clearTimeout(fallback);
      if (fadeTimer) clearTimeout(fadeTimer);
    };
  }, [onDone]);

  return (
    <iframe
      src="/overcashed-intro.html"
      title="Overcashed intro"
      style={{
        position: "absolute", inset: 0, width: "100%", height: "100%",
        border: 0, zIndex: 100, background: "transparent",
        opacity: fading ? 0 : 1, transition: "opacity 0.45s ease",
        pointerEvents: "none",
      }}
    />
  );
}

// ─── Start Screen ───────────────────────────────────────────────────────────

function StartScreen() {
  return (
    <div
      style={{
        position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(6px)", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: 20, zIndex: 40,
      }}
    >
      {/* logo lettering: chunky white caps with the deep-green sticker outline */}
      <svg width="620" height="120" viewBox="0 0 620 120" style={{ transform: "rotate(-2deg)", overflow: "visible" }}>
        <text
          x="50%" y="82" textAnchor="middle"
          fontFamily="'Luckiest Guy', 'Arial Black', sans-serif"
          fontSize="68" fill="#FCFDFC"
          stroke="#1F5F44" strokeWidth="11"
          strokeLinejoin="round" paintOrder="stroke"
          letterSpacing="2"
        >
          OVERCASHED!
        </text>
      </svg>
      <div style={{ fontSize: 14, opacity: 0.5, maxWidth: 400, textAlign: "center", lineHeight: 1.6, color: "#e8e8ef" }}>
        You have 60 seconds. Reach each assigned desk, then decide its ticket within 8 seconds or lose health.
      </div>
      <div
        style={{
          marginTop: 16, padding: "12px 28px", borderRadius: 10,
          border: "2px solid rgba(255,255,255,0.3)", fontSize: 14,
          fontWeight: 700, letterSpacing: 1, color: "#fff",
          animation: "pulse-health 1.5s ease-in-out infinite",
        }}
      >
        PRESS ANY KEY TO START
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function CoopGame() {
  // Ambient office music loop (armed on first user gesture).
  useAmbientMusic();

  const [state, setState] = useState<GameState>(() => snap(gameState));
  const [showIntro, setShowIntro] = useState(true);
  const introActiveRef = useRef(true);
  const [p1Flash, setP1Flash] = useState<string | null>(null);
  const [p2Flash, setP2Flash] = useState<string | null>(null);
  const [shaking, setShaking] = useState(false);
  const [phaseFlash, setPhaseFlash] = useState(false);
  const [debrief, setDebrief] = useState("");
  const [p1AtTarget, setP1AtTarget] = useState(false);
  const [p2AtTarget, setP2AtTarget] = useState(false);
  const [p1StationLabel, setP1StationLabel] = useState<string | null>(null);
  const [p2StationLabel, setP2StationLabel] = useState<string | null>(null);
  const [targetStationIds, setTargetStationIds] = useState<TargetStationIds>([null, null]);
  const [p1Confirmed, setP1Confirmed] = useState(false);
  const [p2Confirmed, setP2Confirmed] = useState(false);
  const [deadlineSnapshot, setDeadlineSnapshot] = useState<[number, number]>([
    DESK_TRAVEL_SECONDS,
    DESK_TRAVEL_SECONDS,
  ]);
  const targetStationIdsRef = useRef<TargetStationIds>([null, null]);
  const confirmedRef = useRef<[boolean, boolean]>([false, false]);
  const travelDeadlineRef = useRef<[number, number]>([
    DESK_TRAVEL_SECONDS,
    DESK_TRAVEL_SECONDS,
  ]);
  const reachedTargetRef = useRef<[boolean, boolean]>([false, false]);
  const prevPhaseRef = useRef(gameState.phase);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updateTargetStationIds = useCallback((next: TargetStationIds) => {
    targetStationIdsRef.current = next;
    setTargetStationIds(next);
  }, []);

  const updateConfirmed = useCallback((playerIndex: 0 | 1, confirmed: boolean) => {
    const next: [boolean, boolean] = [...confirmedRef.current];
    next[playerIndex] = confirmed;
    confirmedRef.current = next;
    if (playerIndex === 0) setP1Confirmed(confirmed);
    else setP2Confirmed(confirmed);
  }, []);

  const assignStartingDesks = useCallback(() => {
    const p1Target = pickStationId(new Set());
    const p2Target = pickStationId(new Set([p1Target]));
    travelDeadlineRef.current = [DESK_TRAVEL_SECONDS, DESK_TRAVEL_SECONDS];
    reachedTargetRef.current = [false, false];
    updateTargetStationIds([p1Target, p2Target]);
  }, [updateTargetStationIds]);

  const rotatePlayerDesk = useCallback((playerIndex: 0 | 1) => {
    const current = targetStationIdsRef.current[playerIndex];
    const other = targetStationIdsRef.current[playerIndex === 0 ? 1 : 0];
    const excluded = new Set<string>();
    if (current) excluded.add(current);
    if (other) excluded.add(other);
    const nextTarget = pickStationId(excluded);
    const next: TargetStationIds = [...targetStationIdsRef.current];
    next[playerIndex] = nextTarget;
    travelDeadlineRef.current[playerIndex] = DESK_TRAVEL_SECONDS;
    reachedTargetRef.current[playerIndex] = false;
    updateTargetStationIds(next);
  }, [updateTargetStationIds]);

  useEffect(() => { ensureKeyframes(); }, []);

  // Subscribe to game state changes
  useEffect(() => {
    return subscribe(() => {
      const s = snap(gameState);
      setState(s);

      if (gameState.phase !== prevPhaseRef.current) {
        prevPhaseRef.current = gameState.phase;
        setPhaseFlash(true);
        setTimeout(() => setPhaseFlash(false), 600);
      }

      if (s.isOver && !resetTimerRef.current) {
        const text = generateDebrief(s);
        setDebrief(text);
        resetTimerRef.current = setTimeout(() => {
          resetGame();
          resetTimerRef.current = null;
          setDebrief("");
          prevPhaseRef.current = 1;
          travelDeadlineRef.current = [DESK_TRAVEL_SECONDS, DESK_TRAVEL_SECONDS];
          reachedTargetRef.current = [false, false];
          updateTargetStationIds([null, null]);
          updateConfirmed(0, false);
          updateConfirmed(1, false);
        }, 10_000);
      }
    });
  }, [updateConfirmed, updateTargetStationIds]);

  // Movement is always available, including while standing at a desk.
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (TRACKED_KEYS.has(k)) {
        keys.add(k);
        e.preventDefault();
      }
    };
    const up = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (TRACKED_KEYS.has(k)) {
        keys.delete(k);
        e.preventDefault();
      }
    };
    const blur = () => keys.clear();
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
    };
  }, []);

  const flash = useCallback((player: "p1" | "p2", result: "correct" | "wrong") => {
    const cls = result === "correct" ? "flash-green" : "flash-red";
    if (player === "p1") {
      setP1Flash(cls);
      setTimeout(() => setP1Flash(null), 400);
    } else {
      setP2Flash(cls);
      setTimeout(() => setP2Flash(null), 400);
    }
    if (result === "wrong") {
      setShaking(true);
      setTimeout(() => setShaking(false), 500);
    }
  }, []);

  // Combined game loop
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      stepGame(dt);
      tickGame(dt);

      // Update station proximity for UI
      const s1 = playerStations[0];
      const s2 = playerStations[1];
      const p1TargetId = targetStationIdsRef.current[0];
      const p2TargetId = targetStationIdsRef.current[1];
      const p1IsAtTarget = s1?.id === p1TargetId;
      const p2IsAtTarget = s2?.id === p2TargetId;
      if (p1IsAtTarget) reachedTargetRef.current[0] = true;
      if (p2IsAtTarget) reachedTargetRef.current[1] = true;
      setP1AtTarget(p1IsAtTarget);
      setP2AtTarget(p2IsAtTarget);
      setP1StationLabel(STATIONS.find((station) => station.id === p1TargetId)?.label ?? null);
      setP2StationLabel(STATIONS.find((station) => station.id === p2TargetId)?.label ?? null);

      // Walking away is always allowed and immediately exits the desk task.
      if (gameState.isRunning) {
        const targetIds = targetStationIdsRef.current;
        for (const playerIndex of [0, 1] as const) {
          if (!gameState.isRunning) break;
          if (!targetIds[playerIndex] || reachedTargetRef.current[playerIndex]) continue;

          travelDeadlineRef.current[playerIndex] = Math.max(
            0,
            travelDeadlineRef.current[playerIndex] - dt,
          );
          if (travelDeadlineRef.current[playerIndex] > 0) continue;

          const player = playerIndex === 0 ? "p1" : "p2";
          missDeskDeadline(player);
          flash(player, "wrong");
          if (gameState.isRunning) rotatePlayerDesk(playerIndex);
        }

        // Once a ticket is opened its decision clock keeps running, even if
        // the player steps away. Expiry costs health and forces a new desk.
        for (const playerIndex of [0, 1] as const) {
          if (!gameState.isRunning) break;
          const player = playerIndex === 0 ? "p1" : "p2";
          if (!gameState[player].activeTicket) continue;
          if (gameState[player].ticketTimer > 0) continue;
          if (!expireTicket(player)) continue;

          updateConfirmed(playerIndex, false);
          flash(player, "wrong");
          if (gameState.isRunning) rotatePlayerDesk(playerIndex);
        }

        if (confirmedRef.current[0] && !p1IsAtTarget) {
          updateConfirmed(0, false);
        }
        if (confirmedRef.current[1] && !p2IsAtTarget) {
          updateConfirmed(1, false);
        }
      }

      if (gameState.isRunning) {
        setState(snap(gameState));
        setDeadlineSnapshot([
          Math.ceil(travelDeadlineRef.current[0]),
          Math.ceil(travelDeadlineRef.current[1]),
        ]);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [flash, rotatePlayerDesk, updateConfirmed]);

  // Q/M toggle desk mode. A/D and Left/Right are only consumed as decisions
  // while that player is actively reviewing at their assigned desk.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();

      // Ignore keys until the intro animation has finished.
      if (introActiveRef.current) return;

      if (!gameState.isRunning && !gameState.isOver) {
        initGame();
        assignStartingDesks();
        e.preventDefault();
        return;
      }

      if (!gameState.isRunning) return;

      // P1 desk toggle: Q opens the assigned task or leaves it.
      if (key === "q") {
        if (confirmedRef.current[0]) {
          updateConfirmed(0, false);
          e.preventDefault();
          return;
        }
        if (playerStations[0]?.id !== targetStationIdsRef.current[0]) return;
        e.preventDefault();
        updateConfirmed(0, true);
        if (!gameState.p1.activeTicket) {
          assignTicket("p1");
        }
        return;
      }

      // P2 desk toggle: M opens the assigned task or leaves it.
      if (key === "m") {
        if (confirmedRef.current[1]) {
          updateConfirmed(1, false);
          e.preventDefault();
          return;
        }
        if (playerStations[1]?.id !== targetStationIdsRef.current[1]) return;
        e.preventDefault();
        updateConfirmed(1, true);
        if (!gameState.p2.activeTicket) {
          assignTicket("p2");
        }
        return;
      }

      // P1: A = approve, D = reject while reviewing. Consuming the key from
      // the movement set prevents a decision from also nudging the avatar.
      if (
        key === "a" &&
        confirmedRef.current[0] &&
        playerStations[0]?.id === targetStationIdsRef.current[0]
      ) {
        keys.delete(key);
        e.preventDefault();
        flash("p1", submitAnswer("p1", "approve"));
        updateConfirmed(0, false);
        if (gameState.isRunning) rotatePlayerDesk(0);
        return;
      }
      if (
        key === "d" &&
        confirmedRef.current[0] &&
        playerStations[0]?.id === targetStationIdsRef.current[0]
      ) {
        keys.delete(key);
        e.preventDefault();
        flash("p1", submitAnswer("p1", "reject"));
        updateConfirmed(0, false);
        if (gameState.isRunning) rotatePlayerDesk(0);
        return;
      }

      // P2: Left = approve, Right = reject while reviewing.
      if (
        key === "arrowleft" &&
        confirmedRef.current[1] &&
        playerStations[1]?.id === targetStationIdsRef.current[1]
      ) {
        keys.delete(key);
        e.preventDefault();
        flash("p2", submitAnswer("p2", "approve"));
        updateConfirmed(1, false);
        if (gameState.isRunning) rotatePlayerDesk(1);
        return;
      }
      if (
        key === "arrowright" &&
        confirmedRef.current[1] &&
        playerStations[1]?.id === targetStationIdsRef.current[1]
      ) {
        keys.delete(key);
        e.preventDefault();
        flash("p2", submitAnswer("p2", "reject"));
        updateConfirmed(1, false);
        if (gameState.isRunning) rotatePlayerDesk(1);
        return;
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [assignStartingDesks, flash, rotatePlayerDesk, updateConfirmed]);

  useEffect(() => {
    return () => {
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    };
  }, []);

  const isIdle = !state.isRunning && !state.isOver;
  const isPlaying = state.isRunning && !state.isOver;

  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "#0b0b12",
        color: "#e8e8ef",
        fontFamily: "ui-monospace, 'Cascadia Code', 'Fira Code', monospace",
        overflow: "hidden",
        animation: shaking ? "shake 0.5s ease-out" : undefined,
      }}
    >
      {/* 3D Canvas */}
      <Canvas shadows dpr={[1, 2]} gl={{ antialias: true }} style={{ position: "absolute", inset: 0 }}>
        <WorldContents targetStationIds={targetStationIds} />
        <SplitScreenRenderer />
      </Canvas>

      {/* Center divider */}
      <div
        style={{
          position: "absolute", top: 0, left: "50%", transform: "translateX(-1px)",
          width: 2, height: "100%", background: "#000",
          boxShadow: "0 0 8px #000", pointerEvents: "none", zIndex: 20,
        }}
      />

      {/* Phase flash */}
      {phaseFlash && (
        <div
          style={{
            position: "absolute", inset: 0,
            background: "rgba(255,255,255,0.15)",
            animation: "phase-flash 0.6s ease-out forwards",
            pointerEvents: "none", zIndex: 50,
          }}
        />
      )}

      {isIdle && <StartScreen />}

      {showIntro && (
        <IntroSplash
          onDone={() => {
            introActiveRef.current = false;
            setShowIntro(false);
          }}
        />
      )}

      {isPlaying && (
        <>
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 30 }}>
            <TopBar health={state.sharedHealth} time={state.sharedTime} phase={state.phase} />
          </div>

          <div style={{ position: "absolute", top: 56, left: 0, right: 0, bottom: 0, zIndex: 25 }}>
            <PlayerHUD
              player="P1"
              playerIndex={0}
              state={state.p1}
              flashClass={p1Flash}
              approveKey="A"
              rejectKey="D"
              moveKeys="WASD"
              confirmKey="Q"
              color="#4f9dff"
              side="left"
              atStation={p1AtTarget}
              stationLabel={p1StationLabel}
              targetStation={STATIONS.find((station) => station.id === targetStationIds[0]) ?? null}
              travelSecondsLeft={deadlineSnapshot[0]}
              confirmed={p1Confirmed}
            />
            <PlayerHUD
              player="P2"
              playerIndex={1}
              state={state.p2}
              flashClass={p2Flash}
              approveKey="←"
              rejectKey="→"
              moveKeys="Arrow Keys"
              confirmKey="M"
              color="#ff7a59"
              side="right"
              atStation={p2AtTarget}
              stationLabel={p2StationLabel}
              targetStation={STATIONS.find((station) => station.id === targetStationIds[1]) ?? null}
              travelSecondsLeft={deadlineSnapshot[1]}
              confirmed={p2Confirmed}
            />
          </div>
        </>
      )}

      {state.isOver && state.didWin && <WinScreen state={state} debrief={debrief} />}
      {state.isOver && !state.didWin && <LoseScreen state={state} debrief={debrief} />}
    </div>
  );
}
