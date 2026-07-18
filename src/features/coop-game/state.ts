// Single source of truth for the co-op sim. One loop writes here; both
// split-screen canvases read from here. Everything is in CANVAS coordinates
// (0..1800) so it lines up with the office furniture + AgentModel rendering.

import type { RefObject } from "react";
import type { FurnitureItem, RenderAgent } from "@/features/retro-office/core/types";
import { createAgentAvatarProfileFromSeed } from "@/lib/avatars/profile";
import {
  buildColliders,
  buildOfficeFurniture,
  CANVAS_BOUNDS,
  PLAYER_CANVAS_RADIUS,
  SPAWN_POINTS,
  type CanvasAabb,
} from "./officeLayout";

export const FURNITURE: FurnitureItem[] = buildOfficeFurniture();
const COLLIDERS: CanvasAabb[] = buildColliders(FURNITURE);

const SPEED = 320; // canvas units / second — keep desk rotations fast-paced
const R = PLAYER_CANVAS_RADIUS;

// Two distinct skins (different seeds → different avatars).
export const PLAYER_SKINS = [
  { seed: "coop-player-blue", color: "#4f9dff" },
  { seed: "coop-player-orange", color: "#ff7a59" },
];

const makePlayer = (index: number): RenderAgent => {
  const spawn = SPAWN_POINTS[index];
  const skin = PLAYER_SKINS[index];
  return {
    id: `player-${index + 1}`,
    name: index === 0 ? "Player 1" : "Player 2",
    subtitle: null,
    status: "idle",
    color: skin.color,
    item: "coffee",
    avatarProfile: createAgentAvatarProfileFromSeed(skin.seed),
    x: spawn.x,
    y: spawn.y,
    targetX: spawn.x,
    targetY: spawn.y,
    path: [],
    facing: spawn.facing,
    frame: 0,
    walkSpeed: 0,
    phaseOffset: index * Math.PI,
    state: "standing",
  };
};

export const players: RenderAgent[] = [makePlayer(0), makePlayer(1)];
export const playersRef: RefObject<RenderAgent[]> = { current: players };

export const keys = new Set<string>();

// ─── Review Stations ────────────────────────────────────────────────────────
// Desk cubicle positions from furnitureDefaults.ts — players walk to a desk
// to get a ticket. Each station is the center of a desk_cubicle.

export type Station = {
  id: string;
  x: number;
  y: number;
  label: string;
};

export const STATIONS: Station[] = [
  { id: "desk_0", x: 140, y: 320, label: "Desk A1" },
  { id: "desk_1", x: 340, y: 320, label: "Desk A2" },
  { id: "desk_2", x: 540, y: 320, label: "Desk A3" },
  { id: "desk_3", x: 740, y: 320, label: "Desk A4" },
  { id: "desk_4", x: 140, y: 520, label: "Desk B1" },
  { id: "desk_5", x: 340, y: 520, label: "Desk B2" },
  { id: "desk_6", x: 540, y: 520, label: "Desk B3" },
  { id: "desk_7", x: 740, y: 520, label: "Desk B4" },
];

const STATION_RADIUS = 70; // canvas units — how close you need to be

/** Returns the station a player is near, or null if roaming. */
export function nearestStation(px: number, py: number): Station | null {
  for (const s of STATIONS) {
    const d = Math.hypot(px - s.x, py - s.y);
    if (d <= STATION_RADIUS) return s;
  }
  return null;
}

/** Per-player station state — read by the UI each frame. */
export const playerStations: [Station | null, Station | null] = [null, null];

// ─── Movement ───────────────────────────────────────────────────────────────
// Movement is never locked at a station. CoopGame removes an action key from
// this shared set when it is consumed as approve/reject, so the same physical
// keys can still be used for movement while roaming.

const P1_KEYS_FULL = { up: "w", down: "s", left: "a", right: "d" };
const P2_KEYS_FULL = { up: "arrowup", down: "arrowdown", left: "arrowleft", right: "arrowright" };

const readAxis = (map: { up: string; down: string; left: string; right: string }) => {
  let dx = 0;
  let dy = 0;
  if (keys.has(map.up)) dy -= 1;
  if (keys.has(map.down)) dy += 1;
  if (keys.has(map.left)) dx -= 1;
  if (keys.has(map.right)) dx += 1;
  return { dx, dy };
};

const resolveAabb = (px: number, py: number, box: CanvasAabb): [number, number] => {
  const cx = Math.max(box.minX, Math.min(px, box.maxX));
  const cy = Math.max(box.minY, Math.min(py, box.maxY));
  const dx = px - cx;
  const dy = py - cy;
  const d2 = dx * dx + dy * dy;
  if (d2 >= R * R) return [px, py];
  if (d2 > 1e-6) {
    const d = Math.sqrt(d2);
    const push = R - d;
    return [px + (dx / d) * push, py + (dy / d) * push];
  }
  const toLeft = px - box.minX;
  const toRight = box.maxX - px;
  const toTop = py - box.minY;
  const toBottom = box.maxY - py;
  const m = Math.min(toLeft, toRight, toTop, toBottom);
  if (m === toLeft) return [box.minX - R, py];
  if (m === toRight) return [box.maxX + R, py];
  if (m === toTop) return [px, box.minY - R];
  return [px, box.maxY + R];
};

const clamp = (v: number, max: number) => Math.max(R, Math.min(max - R, v));

export const stepGame = (dt: number) => {
  const maps = [P1_KEYS_FULL, P2_KEYS_FULL];

  for (let i = 0; i < players.length; i++) {
    const p = players[i];
    const { dx, dy } = readAxis(maps[i]);
    const len = Math.hypot(dx, dy);
    if (len > 0) {
      const nx = dx / len;
      const ny = dy / len;
      p.x = clamp(p.x + nx * SPEED * dt, CANVAS_BOUNDS.w);
      p.y = clamp(p.y + ny * SPEED * dt, CANVAS_BOUNDS.h);
      p.facing = Math.atan2(nx, ny);
      p.state = "walking";
      p.frame += dt * 22;
      p.walkSpeed = SPEED;
    } else {
      p.state = "standing";
      p.walkSpeed = 0;
    }
    for (const box of COLLIDERS) {
      [p.x, p.y] = resolveAabb(p.x, p.y, box);
    }

    // Update station proximity
    playerStations[i] = nearestStation(p.x, p.y);
  }

  // Player-vs-player soft separation.
  const [a, b] = players;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dist = Math.hypot(dx, dy);
  const min = R * 2;
  if (dist > 1e-6 && dist < min) {
    const push = (min - dist) / 2;
    const ux = dx / dist;
    const uy = dy / dist;
    a.x = clamp(a.x - ux * push, CANVAS_BOUNDS.w);
    a.y = clamp(a.y - uy * push, CANVAS_BOUNDS.h);
    b.x = clamp(b.x + ux * push, CANVAS_BOUNDS.w);
    b.y = clamp(b.y + uy * push, CANVAS_BOUNDS.h);
  }
};
