"use client";

import { useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { WorldContents } from "./Scene";
import { SplitScreenRenderer } from "./SplitScreenRenderer";
import { keys, stepGame } from "./state";

const TRACKED_KEYS = new Set([
  "w", "a", "s", "d",
  "arrowup", "arrowdown", "arrowleft", "arrowright",
]);

function ViewLabel({ color, label, keysHint, side }: {
  color: string;
  label: string;
  keysHint: string;
  side: "left" | "right";
}) {
  return (
    <div
      style={{
        position: "absolute",
        top: 12,
        [side]: 14,
        padding: "6px 12px",
        borderRadius: 8,
        background: "rgba(0,0,0,0.55)",
        color,
        fontFamily: "ui-monospace, monospace",
        fontSize: 13,
        fontWeight: 700,
        letterSpacing: 1,
        pointerEvents: "none",
      } as React.CSSProperties}
    >
      {label} <span style={{ opacity: 0.7, fontWeight: 400 }}>· {keysHint}</span>
    </div>
  );
}

export function CoopGame() {
  // Input: shared key set (P1 = WASD, P2 = arrows).
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

  // Single simulation loop drives shared state for both views.
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      stepGame(dt);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div style={{ position: "fixed", inset: 0, background: "#0b0b12", overflow: "hidden" }}>
      <Canvas shadows dpr={[1, 2]} gl={{ antialias: true }}>
        <WorldContents />
        <SplitScreenRenderer />
      </Canvas>

      <ViewLabel color="#4f9dff" label="PLAYER 1" keysHint="WASD" side="left" />
      <ViewLabel color="#ff7a59" label="PLAYER 2" keysHint="ARROWS" side="right" />
      <div
        style={{
          position: "absolute",
          top: 0,
          left: "50%",
          transform: "translateX(-1px)",
          width: 2,
          height: "100%",
          background: "#000",
          boxShadow: "0 0 8px #000",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}
