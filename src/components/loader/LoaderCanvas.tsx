"use client";

import { Canvas } from "@react-three/fiber";
import { LoaderScene } from "./LoaderScene";
import type { Voxel } from "./voxelData";

export default function LoaderCanvas({
  voxels,
  onComplete,
}: {
  voxels: Voxel[];
  onComplete: () => void;
}) {
  return (
    <Canvas camera={{ position: [0, 1, 16], fov: 45 }} dpr={[1, 2]} gl={{ antialias: true }}>
      <color attach="background" args={["#0b1020"]} />
      <LoaderScene voxels={voxels} onComplete={onComplete} />
    </Canvas>
  );
}
