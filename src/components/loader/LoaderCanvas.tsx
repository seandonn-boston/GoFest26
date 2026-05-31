"use client";

import { Canvas } from "@react-three/fiber";
import { LoaderScene } from "./LoaderScene";
import { MISSINGNO_VOXELS, SUBSTITUTE_VOXELS } from "./voxelData";

export default function LoaderCanvas({
  isGlitch,
  onComplete,
}: {
  isGlitch: boolean;
  onComplete: () => void;
}) {
  return (
    <Canvas camera={{ position: [0, 1, 16], fov: 45 }} dpr={[1, 2]} gl={{ antialias: true }}>
      <color attach="background" args={["#0b1020"]} />
      <LoaderScene voxels={isGlitch ? MISSINGNO_VOXELS : SUBSTITUTE_VOXELS} onComplete={onComplete} />
    </Canvas>
  );
}
