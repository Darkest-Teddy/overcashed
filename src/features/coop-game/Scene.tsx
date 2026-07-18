"use client";

import { AgentModel } from "@/features/retro-office/objects/agents";
import { OfficeWorld } from "@/features/retro-office/scene/OfficeWorld";
import { FURNITURE, players, playersRef } from "./state";

function PlayerAvatar({ index }: { index: number }) {
  const p = players[index];
  return (
    <AgentModel
      agentId={p.id}
      name={p.name}
      subtitle={null}
      status={p.status}
      color={p.color}
      appearance={"avatarProfile" in p ? p.avatarProfile ?? null : null}
      agentsRef={playersRef}
      showSpeech={false}
      suppressSpeechBubble
    />
  );
}

// The shared world (no camera — SplitScreenRenderer supplies both cameras).
export function WorldContents() {
  return (
    <>
      <color attach="background" args={["#0b0b12"]} />
      <fog attach="fog" args={["#0b0b12", 26, 60]} />
      <hemisphereLight args={["#aab4ff", "#20141a", 0.75]} />
      <ambientLight intensity={0.5} />
      <directionalLight
        position={[10, 18, 8]}
        intensity={1.15}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <directionalLight position={[-6, 10, -5]} intensity={0.4} color="#7090ff" />
      <OfficeWorld furniture={FURNITURE} />
      <PlayerAvatar index={0} />
      <PlayerAvatar index={1} />
    </>
  );
}
