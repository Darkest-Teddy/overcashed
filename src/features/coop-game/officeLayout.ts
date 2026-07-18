// Builds the EXACT office furniture layout the original app ships with, and
// derives collision boxes (in canvas space) from it.

import {
  ensureOfficeAtm,
  ensureOfficeGymRoom,
  ensureOfficeJukebox,
  ensureOfficeKanbanBoard,
  ensureOfficePhoneBooth,
  ensureOfficePingPongTable,
  ensureOfficeQaLab,
  ensureOfficeServerRoom,
  ensureOfficeSmsBooth,
  materializeDefaults,
} from "@/features/retro-office/core/furnitureDefaults";
import { getItemBounds, resolveItemTypeKey, ITEM_METADATA } from "@/features/retro-office/core/geometry";
import type { FurnitureItem } from "@/features/retro-office/core/types";
import { AGENT_RADIUS, CANVAS_W, CANVAS_H } from "@/features/retro-office/core/constants";

export type CanvasAabb = { minX: number; maxX: number; minY: number; maxY: number };

// Mirror of RetroOffice3D's buildInitialFurnitureLayout, minus localStorage:
// always the canonical default office map.
export const buildOfficeFurniture = (): FurnitureItem[] =>
  ensureOfficeKanbanBoard(
    ensureOfficeJukebox(
      ensureOfficeQaLab(
        ensureOfficeGymRoom(
          ensureOfficeServerRoom(
            ensureOfficePhoneBooth(
              ensureOfficeSmsBooth(
                ensureOfficeAtm(
                  ensureOfficePingPongTable(materializeDefaults("office")),
                ),
              ),
            ),
          ),
        ),
      ),
    ),
  );

// Solid obstacles (canvas-space AABBs) from nav-blocking furniture.
export const buildColliders = (furniture: FurnitureItem[]): CanvasAabb[] => {
  const boxes: CanvasAabb[] = [];
  for (const item of furniture) {
    const meta = ITEM_METADATA[resolveItemTypeKey(item)];
    if (!meta?.blocksNavigation) continue;
    const b = getItemBounds(item);
    const pad = meta.navPadding ?? 0;
    boxes.push({
      minX: b.x - pad,
      maxX: b.x + b.w + pad,
      minY: b.y - pad,
      maxY: b.y + b.h + pad,
    });
  }
  return boxes;
};

export const PLAYER_CANVAS_RADIUS = AGENT_RADIUS; // 20 canvas units
export const CANVAS_BOUNDS = { w: CANVAS_W, h: CANVAS_H };

// Open-floor spawn points — in the corridor between desk rows, away from stations.
export const SPAWN_POINTS: Array<{ x: number; y: number; facing: number }> = [
  { x: 360, y: 420, facing: Math.PI / 2 },
  { x: 560, y: 420, facing: Math.PI / 2 },
];
