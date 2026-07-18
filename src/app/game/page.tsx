"use client";

import dynamic from "next/dynamic";

// Split-screen local co-op — self-contained Three.js/React, no gateway.
const CoopGame = dynamic(
  () => import("@/features/coop-game/CoopGame").then((m) => m.CoopGame),
  { ssr: false },
);

export default function GamePage() {
  return <CoopGame />;
}
