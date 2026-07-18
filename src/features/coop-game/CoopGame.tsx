"use client";

import { useEffect, useCallback, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { WorldContents } from "./Scene";
import { SplitScreenRenderer } from "./SplitScreenRenderer";
import { keys, stepGame, players, playerStations } from "./state";
import {
  gameState,
  submitAnswer,
  initGame,
  resetGame,
  tickGame,
  drawTicket,
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
          fontSize: 32,
          fontWeight: 900,
          fontVariantNumeric: "tabular-nums",
          color: time <= 30 ? "#ef4444" : time <= 60 ? "#fbbf24" : "#fff",
          minWidth: 80,
          textAlign: "center",
        }}
      >
        {fmtTime(time)}
      </div>
    </div>
  );
}

// ─── Player HUD Panel ──────────────────────────────────────────────────────

function PlayerHUD({
  player,
  state,
  flashClass,
  approveKey,
  rejectKey,
  moveKeys,
  color,
  side,
  atStation,
  stationLabel,
}: {
  player: "P1" | "P2";
  state: GameState["p1"];
  flashClass: string | null;
  approveKey: string;
  rejectKey: string;
  moveKeys: string;
  color: string;
  side: "left" | "right";
  atStation: boolean;
  stationLabel: string | null;
}) {
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
          key={Date.now()}
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

      {/* Spacer — 3D scene shows through */}
      <div style={{ flex: 1 }} />

      {/* Bottom area: ticket card OR roaming prompt */}
      <div style={{ padding: "0 16px 8px", display: "flex", justifyContent: "center" }}>
        {atStation ? (
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
              <TicketCard ticket={state.activeTicket} />
            ) : (
              <div style={{ opacity: 0.3, fontSize: 14, textAlign: "center", padding: 12 }}>
                Waiting for ticket…
              </div>
            )}
          </div>
        ) : (
          <div
            style={{
              background: "rgba(0,0,0,0.6)",
              backdropFilter: "blur(4px)",
              borderRadius: 10,
              padding: "12px 20px",
              textAlign: "center",
              border: "1px solid rgba(255,255,255,0.08)",
              animation: "bob 2s ease-in-out infinite",
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 700, opacity: 0.7 }}>
              Walk to a desk to review tickets
            </div>
            <div style={{ fontSize: 11, opacity: 0.4, marginTop: 4 }}>
              Move: {moveKeys}
            </div>
          </div>
        )}
      </div>

      {/* Keybind hints — only show when at station */}
      {atStation && (
        <div style={{ display: "flex", justifyContent: "center", gap: 20, padding: "8px 0 14px" }}>
          <KeyHint label={approveKey} action="APPROVE" color="#4ade80" />
          <KeyHint label={rejectKey} action="REJECT" color="#ef4444" />
        </div>
      )}

      {/* Movement hint when roaming — show below prompt */}
      {!atStation && (
        <div style={{ height: 50 }} />
      )}
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

function WinScreen({ state, debrief }: { state: GameState; debrief: string }) {
  const combined = state.p1.score + state.p2.score;
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
          background: "rgba(74,21,75,0.25)",
          border: "1px solid rgba(74,21,75,0.5)",
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
            background: "linear-gradient(135deg, #611f69, #9b59b6)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 20, fontWeight: 900, flexShrink: 0,
          }}
        >
          EG
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 4 }}>
            Eric Glyman <span style={{ fontWeight: 400, opacity: 0.5, fontSize: 12 }}>via Slack</span>
          </div>
          <div style={{ fontSize: 15, lineHeight: 1.5, opacity: 0.9 }}>
            &ldquo;I don&apos;t know how the finance team held it down today but the numbers are
            perfect. This is why Ramp wins.&rdquo;
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
      <div style={{ fontSize: 42, fontWeight: 900, letterSpacing: -1, color: "#fff" }}>OVERCASHED</div>
      <div style={{ fontSize: 14, opacity: 0.5, maxWidth: 400, textAlign: "center", lineHeight: 1.6, color: "#e8e8ef" }}>
        Two players. One finance team. Walk to a desk and approve or reject every ticket before time runs out.
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
  const [state, setState] = useState<GameState>(() => snap(gameState));
  const [p1Flash, setP1Flash] = useState<string | null>(null);
  const [p2Flash, setP2Flash] = useState<string | null>(null);
  const [shaking, setShaking] = useState(false);
  const [phaseFlash, setPhaseFlash] = useState(false);
  const [debrief, setDebrief] = useState("");
  const [p1AtStation, setP1AtStation] = useState(false);
  const [p2AtStation, setP2AtStation] = useState(false);
  const [p1StationLabel, setP1StationLabel] = useState<string | null>(null);
  const [p2StationLabel, setP2StationLabel] = useState<string | null>(null);
  const prevPhaseRef = useRef(gameState.phase);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track previous station state to assign tickets on arrival
  const prevP1Station = useRef<string | null>(null);
  const prevP2Station = useRef<string | null>(null);

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
        const text = generateDebrief(s.wrongDecisions, s.totalDollarImpact);
        setDebrief(text);
        resetTimerRef.current = setTimeout(() => {
          resetGame();
          resetTimerRef.current = null;
          setDebrief("");
          prevPhaseRef.current = 1;
          prevP1Station.current = null;
          prevP2Station.current = null;
        }, 10_000);
      }
    });
  }, []);

  // Movement input — full WASD + arrows. state.ts decides which keys
  // actually produce movement based on station proximity.
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
      setP1AtStation(s1 !== null);
      setP2AtStation(s2 !== null);
      setP1StationLabel(s1?.label ?? null);
      setP2StationLabel(s2?.label ?? null);

      // Assign ticket when player arrives at a station (wasn't at one before)
      if (gameState.isRunning) {
        const s1Id = s1?.id ?? null;
        const s2Id = s2?.id ?? null;

        if (s1Id && s1Id !== prevP1Station.current && !gameState.p1.activeTicket) {
          gameState.p1.activeTicket = drawTicket(gameState.phase);
        }
        if (!s1Id && prevP1Station.current) {
          // Left station — clear ticket
          gameState.p1.activeTicket = null;
        }

        if (s2Id && s2Id !== prevP2Station.current && !gameState.p2.activeTicket) {
          gameState.p2.activeTicket = drawTicket(gameState.phase);
        }
        if (!s2Id && prevP2Station.current) {
          gameState.p2.activeTicket = null;
        }

        prevP1Station.current = s1Id;
        prevP2Station.current = s2Id;
      }

      if (gameState.isRunning) setState(snap(gameState));
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
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

  // Ticket keybinds — only fire when that player is at a station
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();

      if (!gameState.isRunning && !gameState.isOver) {
        initGame();
        e.preventDefault();
        return;
      }

      if (!gameState.isRunning) return;

      // P1: A = approve, D = reject — only when at station
      if (key === "a" && playerStations[0]) {
        e.preventDefault();
        flash("p1", submitAnswer("p1", "approve"));
        return;
      }
      if (key === "d" && playerStations[0]) {
        e.preventDefault();
        flash("p1", submitAnswer("p1", "reject"));
        return;
      }

      // P2: Left = approve, Right = reject — only when at station
      if (key === "arrowleft" && playerStations[1]) {
        e.preventDefault();
        flash("p2", submitAnswer("p2", "approve"));
        return;
      }
      if (key === "arrowright" && playerStations[1]) {
        e.preventDefault();
        flash("p2", submitAnswer("p2", "reject"));
        return;
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [flash]);

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
        <WorldContents />
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

      {isPlaying && (
        <>
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 30 }}>
            <TopBar health={state.sharedHealth} time={state.sharedTime} phase={state.phase} />
          </div>

          <div style={{ position: "absolute", top: 56, left: 0, right: 0, bottom: 0, zIndex: 25 }}>
            <PlayerHUD
              player="P1"
              state={state.p1}
              flashClass={p1Flash}
              approveKey="A"
              rejectKey="D"
              moveKeys="WASD"
              color="#4f9dff"
              side="left"
              atStation={p1AtStation}
              stationLabel={p1StationLabel}
            />
            <PlayerHUD
              player="P2"
              state={state.p2}
              flashClass={p2Flash}
              approveKey="←"
              rejectKey="→"
              moveKeys="Arrow Keys"
              color="#ff7a59"
              side="right"
              atStation={p2AtStation}
              stationLabel={p2StationLabel}
            />
          </div>
        </>
      )}

      {state.isOver && state.didWin && <WinScreen state={state} debrief={debrief} />}
      {state.isOver && !state.didWin && <LoseScreen state={state} debrief={debrief} />}
    </div>
  );
}
