"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { Voxel } from "./voxelData";

const _color = new THREE.Color();
const _obj = new THREE.Object3D();

const LOAD_SEC = 2.2;
const FAINT_SEC = 0.95;
const HP_CELLS = 20;

function VoxelInstanced({
  voxels,
  matRef,
  size = 0.82,
}: {
  voxels: Voxel[];
  matRef: React.RefObject<THREE.MeshStandardMaterial | null>;
  size?: number;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    voxels.forEach((v, i) => {
      _obj.position.set(v.position[0], v.position[1], v.position[2]);
      _obj.rotation.set(0, 0, 0);
      _obj.scale.setScalar(1);
      _obj.updateMatrix();
      mesh.setMatrixAt(i, _obj.matrix);
      mesh.setColorAt(i, _color.set(v.color));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [voxels]);

  return (
    <instancedMesh ref={ref} args={[undefined as unknown as THREE.BufferGeometry, undefined as unknown as THREE.Material, voxels.length]}>
      <boxGeometry args={[size, size, size]} />
      <meshStandardMaterial ref={matRef} transparent roughness={0.65} metalness={0.05} />
    </instancedMesh>
  );
}

export function LoaderScene({ voxels, onComplete }: { voxels: Voxel[]; onComplete: () => void }) {
  const charGroup = useRef<THREE.Group>(null);
  const charMat = useRef<THREE.MeshStandardMaterial>(null);
  const bar = useRef<THREE.InstancedMesh>(null);
  const start = useRef<number | null>(null);
  const done = useRef(false);

  // Auto-fit: normalize any model (plushie vs. tall MissingNo) to a target size.
  const fit = useMemo(() => {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const v of voxels) {
      const [x, y] = v.position;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
    const hgt = Math.max(1, maxY - minY + 1);
    const wid = Math.max(1, maxX - minX + 1);
    return { scale: Math.min(8.5 / hgt, 7.5 / wid), cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 };
  }, [voxels]);

  // Initialize HP bar cell transforms once.
  useLayoutEffect(() => {
    const mesh = bar.current;
    if (!mesh) return;
    for (let i = 0; i < HP_CELLS; i++) {
      _obj.position.set((i - (HP_CELLS - 1) / 2) * 0.34, 0, 0);
      _obj.rotation.set(0, 0, 0);
      _obj.scale.set(0.3, 0.55, 0.4);
      _obj.updateMatrix();
      mesh.setMatrixAt(i, _obj.matrix);
      mesh.setColorAt(i, _color.set("#2b2f48"));
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (start.current === null) start.current = t;
    const e = t - start.current;
    const health = Math.max(0, Math.min(1, 1 - e / LOAD_SEC));
    const faint = Math.max(0, Math.min(1, (e - LOAD_SEC) / FAINT_SEC));

    const g = charGroup.current;
    if (g) {
      const bob = Math.sin(t * 2.3) * 0.18 * (1 - faint);
      g.position.y = 1.5 + bob - faint * 6;
      g.rotation.y = Math.sin(t * 0.8) * 0.18 * (1 - faint);
      g.rotation.z = faint * 1.7;
      g.scale.setScalar(fit.scale * (1 - faint * 0.2));
    }
    if (charMat.current) charMat.current.opacity = 1 - faint * faint;

    const b = bar.current;
    if (b) {
      const filled = Math.round(health * HP_CELLS);
      const col = health > 0.5 ? "#57d34a" : health > 0.2 ? "#e8c43a" : "#e2503c";
      for (let i = 0; i < HP_CELLS; i++) {
        b.setColorAt(i, _color.set(i < filled ? col : "#2b2f48"));
      }
      if (b.instanceColor) b.instanceColor.needsUpdate = true;
    }

    if (e >= LOAD_SEC + FAINT_SEC && !done.current) {
      done.current = true;
      onComplete();
    }
  });

  return (
    <>
      <ambientLight intensity={0.75} />
      <directionalLight position={[4, 8, 6]} intensity={1.15} />
      <directionalLight position={[-6, 2, 4]} intensity={0.45} color="#88aaff" />

      <group ref={charGroup} position={[0, 1.5, 0]}>
        <group position={[-fit.cx, -fit.cy, 0]}>
          <VoxelInstanced voxels={voxels} matRef={charMat} />
        </group>
      </group>

      {/* HP bar frame + cells */}
      <mesh position={[0, -3.1, -0.35]}>
        <boxGeometry args={[7.3, 1.05, 0.4]} />
        <meshStandardMaterial color="#151a2e" />
      </mesh>
      <instancedMesh
        ref={bar}
        position={[0, -3.1, 0]}
        args={[undefined as unknown as THREE.BufferGeometry, undefined as unknown as THREE.Material, HP_CELLS]}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial roughness={0.5} />
      </instancedMesh>
    </>
  );
}
