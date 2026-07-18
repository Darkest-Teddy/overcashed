"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { AgentModel } from "@/features/retro-office/objects/agents";
import { OfficeWorld } from "@/features/retro-office/scene/OfficeWorld";
import { toWorld } from "@/features/retro-office/core/geometry";
import { FURNITURE, players, playersRef, STATIONS } from "./state";

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

/** Glowing pulsing ring at a player's currently assigned desk. */
function DeskMarker({ x, y, color }: { x: number; y: number; color: string }) {
  const ref = useRef<THREE.Mesh>(null);
  const [wx, , wz] = toWorld(x, y);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    // Gentle pulse scale
    const s = 1 + 0.15 * Math.sin(t * 2.5);
    ref.current.scale.set(s, 1, s);
    // Pulse opacity
    const mat = ref.current.material as THREE.MeshBasicMaterial;
    mat.opacity = 0.35 + 0.2 * Math.sin(t * 3);
  });

  return (
    <mesh ref={ref} position={[wx, 0.05, wz]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.6, 0.9, 32]} />
      <meshBasicMaterial color={color} transparent opacity={0.4} side={THREE.DoubleSide} />
    </mesh>
  );
}

// The shared world (no camera — SplitScreenRenderer supplies both cameras).
export function WorldContents({
  targetStationIds,
}: {
  targetStationIds: [string | null, string | null];
}) {
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
      {targetStationIds.map((stationId, playerIndex) => {
        const station = STATIONS.find((candidate) => candidate.id === stationId);
        if (!station) return null;
        return (
          <DeskMarker
            key={`${playerIndex}-${station.id}`}
            x={station.x}
            y={station.y}
            color={playerIndex === 0 ? "#4f9dff" : "#ff7a59"}
          />
        );
      })}
      <PlayerAvatar index={0} />
      <PlayerAvatar index={1} />
    </>
  );
}
