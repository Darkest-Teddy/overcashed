"use client";

import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { toWorld } from "@/features/retro-office/core/geometry";
import { players } from "./state";

const OFFSET = new THREE.Vector3(0, 7.5, 8);

const placeCamera = (cam: THREE.PerspectiveCamera, index: number, lerp: number, look: THREE.Vector3, desired: THREE.Vector3) => {
  const p = players[index];
  const [wx, , wz] = toWorld(p.x, p.y);
  desired.set(wx + OFFSET.x, OFFSET.y, wz + OFFSET.z);
  if (lerp >= 1) cam.position.copy(desired);
  else cam.position.lerp(desired, lerp);
  look.set(wx, 0.6, wz);
  cam.lookAt(look);
};

// Split-screen via a SINGLE WebGL context: render the shared scene twice into
// left/right scissored viewports with two follow cameras. One context avoids
// the multi-canvas context-loss that leaves one half black.
export function SplitScreenRenderer() {
  const { gl, scene, size } = useThree();
  const look = useRef(new THREE.Vector3());
  const desired = useRef(new THREE.Vector3());

  const cams = useMemo(
    () => [
      new THREE.PerspectiveCamera(50, 1, 0.1, 300),
      new THREE.PerspectiveCamera(50, 1, 0.1, 300),
    ],
    [],
  );

  // Snap cameras to their players on first mount.
  useMemo(() => {
    placeCamera(cams[0], 0, 1, look.current, desired.current);
    placeCamera(cams[1], 1, 1, look.current, desired.current);
  }, [cams]);

  // priority 1 → R3F stops auto-rendering; we drive the render loop here.
  useFrame(() => {
    const pr = gl.getPixelRatio();
    const w = Math.floor(size.width * pr);
    const h = Math.floor(size.height * pr);
    const halfW = Math.floor(w / 2);
    const aspect = halfW / h;

    gl.setRenderTarget(null);
    gl.setScissorTest(true);

    for (let i = 0; i < 2; i++) {
      const cam = cams[i];
      placeCamera(cam, i, 0.12, look.current, desired.current);
      if (cam.aspect !== aspect) {
        cam.aspect = aspect;
        cam.updateProjectionMatrix();
      }
      const x = i === 0 ? 0 : halfW;
      gl.setViewport(x, 0, halfW, h);
      gl.setScissor(x, 0, halfW, h);
      gl.render(scene, cam);
    }

    gl.setScissorTest(false);
  }, 1);

  return null;
}
