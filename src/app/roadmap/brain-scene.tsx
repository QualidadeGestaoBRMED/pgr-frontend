"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

type BrainData = {
  pointPositions: Float32Array;
  pointScales: Float32Array;
  linePositions: Float32Array;
  accentLinePositions: Float32Array;
};

type BrainSceneProps = {
  quality?: number;
  reducedMotion?: boolean;
};

function randomInsideEllipsoid(rx: number, ry: number, rz: number) {
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  const radius = Math.cbrt(Math.random());

  return new THREE.Vector3(
    radius * rx * Math.sin(phi) * Math.cos(theta),
    radius * ry * Math.sin(phi) * Math.sin(theta),
    radius * rz * Math.cos(phi)
  );
}

function randomOnSphere(radius: number) {
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);

  return new THREE.Vector3(
    radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.sin(phi) * Math.sin(theta),
    radius * Math.cos(phi)
  );
}

function buildBrainData(nodeCount = 380, maxConnectionsPerNode = 5, maxDistance = 0.6): BrainData {
  const points: THREE.Vector3[] = [];

  for (let i = 0; i < nodeCount * 0.66; i++) {
    const shell = randomOnSphere(1.34 + Math.random() * 0.14);
    points.push(shell);
  }

  for (let i = 0; i < nodeCount * 0.34; i++) {
    const inner = randomOnSphere(0.86 + Math.random() * 0.28);
    points.push(inner);
  }

  const pointPositions = new Float32Array(points.length * 3);
  const pointScales = new Float32Array(points.length);

  points.forEach((point, index) => {
    pointPositions[index * 3] = point.x;
    pointPositions[index * 3 + 1] = point.y;
    pointPositions[index * 3 + 2] = point.z;
    pointScales[index] = 0.65 + Math.random() * 1.4;
  });

  const linePairs: number[] = [];
  const accentLinePairs: number[] = [];
  const connectionCount = new Array(points.length).fill(0);
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      if (connectionCount[i] >= maxConnectionsPerNode || connectionCount[j] >= maxConnectionsPerNode) {
        continue;
      }

      const distance = points[i].distanceTo(points[j]);
      if (distance > maxDistance) continue;
      if (Math.random() > THREE.MathUtils.mapLinear(distance, 0.14, maxDistance, 0.92, 0.22)) continue;

      linePairs.push(i, j);
      connectionCount[i] += 1;
      connectionCount[j] += 1;

      const highlightConnection =
        Math.abs(points[i].length() - 1.18) < 0.14 &&
        Math.abs(points[j].length() - 1.18) < 0.14 &&
        Math.abs(points[i].z - points[j].z) < 0.16;
      if (highlightConnection && Math.random() > 0.62) {
        accentLinePairs.push(i, j);
      }
    }
  }

  const linePositions = new Float32Array(linePairs.length * 3);

  linePairs.forEach((pointIndex, index) => {
    const point = points[pointIndex];
    linePositions[index * 3] = point.x;
    linePositions[index * 3 + 1] = point.y;
    linePositions[index * 3 + 2] = point.z;
  });

  const accentLinePositions = new Float32Array(accentLinePairs.length * 3);

  accentLinePairs.forEach((pointIndex, index) => {
    const point = points[pointIndex];
    accentLinePositions[index * 3] = point.x;
    accentLinePositions[index * 3 + 1] = point.y;
    accentLinePositions[index * 3 + 2] = point.z;
  });

  return { pointPositions, pointScales, linePositions, accentLinePositions };
}

function NeuralBrain({ quality = 0.7, reducedMotion = false }: BrainSceneProps) {
  const groupRef = useRef<THREE.Group>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const shellRef = useRef<THREE.Group>(null);
  const glowPointsRef = useRef<THREE.Points>(null);
  const mainPointsRef = useRef<THREE.Points>(null);
  const mainLinesRef = useRef<THREE.LineSegments>(null);
  const accentLinesRef = useRef<THREE.LineSegments>(null);
  const clampedQuality = Math.min(1, Math.max(0.3, quality));
  const nodeCount = Math.round(380 * clampedQuality);
  const maxConnectionsPerNode = Math.round(3 + clampedQuality * 4);
  const maxDistance = 0.54 + clampedQuality * 0.12;
  const data = useMemo(
    () => buildBrainData(nodeCount, maxConnectionsPerNode, maxDistance),
    [nodeCount, maxConnectionsPerNode, maxDistance]
  );

  const pointsGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(data.pointPositions, 3));
    geometry.setAttribute("scale", new THREE.BufferAttribute(data.pointScales, 1));
    return geometry;
  }, [data.pointPositions, data.pointScales]);

  const lineGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(data.linePositions, 3));
    return geometry;
  }, [data.linePositions]);
  const accentLineGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(data.accentLinePositions, 3));
    return geometry;
  }, [data.accentLinePositions]);

  useFrame((state, delta) => {
    if (!groupRef.current || !coreRef.current || !shellRef.current) return;

    const motionScale = reducedMotion ? 0.35 : 1;
    const targetY = state.pointer.x * 0.46 * motionScale;
    const targetX =
      -state.pointer.y * 0.22 * motionScale +
      Math.sin(state.clock.elapsedTime * 0.45) * 0.03 * motionScale;

    groupRef.current.rotation.y = THREE.MathUtils.damp(groupRef.current.rotation.y, targetY, 4.2, delta);
    groupRef.current.rotation.x = THREE.MathUtils.damp(groupRef.current.rotation.x, targetX, 4.2, delta);
    groupRef.current.rotation.z = THREE.MathUtils.damp(
      groupRef.current.rotation.z,
      Math.sin(state.clock.elapsedTime * 0.35) * 0.03 * motionScale,
      4,
      delta
    );
    groupRef.current.position.x = THREE.MathUtils.damp(groupRef.current.position.x, -0.16, 4.5, delta);
    groupRef.current.position.y = THREE.MathUtils.damp(groupRef.current.position.y, 0.2, 4.5, delta);

    const pulse = 0.94 + Math.sin(state.clock.elapsedTime * 2.1) * (reducedMotion ? 0.02 : 0.08);
    coreRef.current.scale.setScalar(pulse);
    shellRef.current.rotation.y += delta * (reducedMotion ? 0.02 : 0.06);

    const networkPulse = 0.8 + (Math.sin(state.clock.elapsedTime * 2.1) + 1) * (reducedMotion ? 0.06 : 0.16);
    const accentPulse = 0.58 + (Math.sin(state.clock.elapsedTime * 2.1 + 0.4) + 1) * (reducedMotion ? 0.06 : 0.14);

    if (glowPointsRef.current?.material instanceof THREE.PointsMaterial) {
      glowPointsRef.current.material.opacity = 0.16 + (networkPulse - 0.8) * 0.34;
    }
    if (mainPointsRef.current?.material instanceof THREE.PointsMaterial) {
      mainPointsRef.current.material.opacity = 0.84 + (networkPulse - 0.8) * 0.44;
    }
    if (mainLinesRef.current?.material instanceof THREE.LineBasicMaterial) {
      mainLinesRef.current.material.opacity = 0.28 + (networkPulse - 0.8) * 0.36;
    }
    if (accentLinesRef.current?.material instanceof THREE.LineBasicMaterial) {
      accentLinesRef.current.material.opacity = accentPulse;
    }
  });

  return (
    <group ref={groupRef} scale={0.88}>
      <group ref={shellRef}>
        <points ref={glowPointsRef} geometry={pointsGeometry}>
          <pointsMaterial
            color="#7ebfcc"
            size={0.14}
            sizeAttenuation
            transparent
            opacity={0.18}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </points>

        <points ref={mainPointsRef} geometry={pointsGeometry}>
          <pointsMaterial
            color="#7ebfcc"
            size={0.06}
            sizeAttenuation
            transparent
            opacity={0.96}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </points>

        <lineSegments ref={mainLinesRef} geometry={lineGeometry}>
          <lineBasicMaterial
            color="#7ebfcc"
            transparent
            opacity={0.3}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </lineSegments>

        <lineSegments ref={accentLinesRef} geometry={accentLineGeometry}>
          <lineBasicMaterial
            color="#8fd8ea"
            transparent
            opacity={0.66}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </lineSegments>
      </group>
      <mesh ref={coreRef} position={[0, 0, 0.12]}>
        <torusGeometry args={[0.36, 0.012, 18, 100]} />
        <meshBasicMaterial color="#7ebfcc" transparent opacity={0.46} />
      </mesh>
    </group>
  );
}

export function BrainScene({ quality = 0.7, reducedMotion = false }: BrainSceneProps) {
  const clampedQuality = Math.min(1, Math.max(0.3, quality));
  const dprMax = reducedMotion ? 1.25 : clampedQuality > 0.7 ? 1.6 : 1.35;
  const antialias = clampedQuality > 0.7 && !reducedMotion;
  return (
    <Canvas
      dpr={[1, dprMax]}
      camera={{ position: [0, 0.05, 5.8], fov: 34 }}
      gl={{ antialias, alpha: true, powerPreference: "high-performance" }}
    >
      <ambientLight intensity={0.92} />
      <pointLight position={[0, 0, 4]} intensity={2.1} color="#e7fcff" />
      <pointLight position={[-3.8, 1.2, 3]} intensity={1.35} color="#00a7d4" />
      <pointLight position={[3.8, 1.2, 3]} intensity={1.35} color="#8be3f5" />
      <spotLight position={[0, 5, 6]} intensity={2.6} angle={0.42} penumbra={0.8} color="#d9fbff" />
      <NeuralBrain quality={clampedQuality} reducedMotion={reducedMotion} />
    </Canvas>
  );
}
