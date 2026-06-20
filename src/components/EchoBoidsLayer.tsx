"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

type Boid = {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  scale: number;
  color: THREE.Color;
};

const SETTINGS = {
  minSpeed: 0.22,
  maxSpeed: 0.62,
  maxTurnRate: 0.82,
  perceptionRadius: 3.7,
  avoidanceRadius: 1.08,
  maxSteerForce: 0.42,
  alignWeight: 0.72,
  cohesionWeight: 0.5,
  separateWeight: 1.4,
  boundaryWeight: 1.35,
  boundaryMargin: 2.6,
};

const FORWARD = new THREE.Vector3(0, 0, 1);

export function EchoBoidsLayer() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const host = mount;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return;

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "low-power",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.style.pointerEvents = "none";
    renderer.domElement.style.display = "block";

    const scene = new THREE.Scene();
    scene.background = null;

    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(0, 0.8, 25);

    const bounds = new THREE.Vector3(18, 7.6, 10);
    const isMobile = window.innerWidth < 760;
    const count = isMobile ? 22 : 58;
    const boids = createBoids(count, bounds);

    const geometry = createFishShadowGeometry();
    const material = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
    });
    const mesh = new THREE.InstancedMesh(geometry, material, count);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(mesh);

    const dummy = new THREE.Object3D();
    const clock = new THREE.Clock();
    let frame = 0;
    let width = 0;
    let height = 0;

    function resize() {
      width = host.clientWidth || window.innerWidth;
      height = host.clientHeight || window.innerHeight;
      renderer.setSize(width, height, false);
      camera.aspect = width / Math.max(height, 1);
      camera.updateProjectionMatrix();
    }

    resize();
    host.appendChild(renderer.domElement);

    const observer = new ResizeObserver(resize);
    observer.observe(host);

    function animate() {
      const dt = Math.min(clock.getDelta(), 1 / 24);
      updateBoids(boids, bounds, dt);
      const slowDrift = performance.now() * 0.00006;

      for (let i = 0; i < boids.length; i += 1) {
        const boid = boids[i];
        dummy.position.copy(boid.position);
        dummy.position.x += Math.sin(slowDrift + i) * 0.12;
        dummy.position.y += Math.cos(slowDrift * 0.7 + i * 1.7) * 0.06;
        dummy.quaternion.setFromUnitVectors(FORWARD, boid.velocity.clone().normalize());
        dummy.scale.setScalar(boid.scale);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        mesh.setColorAt(i, boid.color);
      }

      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      renderer.render(scene, camera);
      frame = requestAnimationFrame(animate);
    }

    animate();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      mesh.clear();
      scene.clear();
      renderer.domElement.remove();
    };
  }, []);

  return <div ref={mountRef} className="echo-boids-layer" aria-hidden />;
}

function createBoids(count: number, bounds: THREE.Vector3) {
  const boids: Boid[] = [];
  const blue = new THREE.Color("#afc7e8");
  const paper = new THREE.Color("#d8d0c2");
  const teal = new THREE.Color("#8ed6d1");

  for (let i = 0; i < count; i += 1) {
    const position = new THREE.Vector3(
      randomBetween(-bounds.x * 0.72, bounds.x * 0.72),
      randomBetween(-bounds.y * 0.58, bounds.y * 0.62),
      randomBetween(-bounds.z * 0.85, bounds.z * 0.1),
    );
    const direction = randomUnitVector();
    const speed = randomBetween(SETTINGS.minSpeed, SETTINGS.maxSpeed);
    const color = blue.clone().lerp(i % 7 === 0 ? paper : teal, i % 7 === 0 ? 0.5 : 0.18);

    boids.push({
      position,
      velocity: direction.multiplyScalar(speed),
      scale: randomBetween(0.34, 0.74) * (i % 7 === 0 ? 1.18 : 1),
      color,
    });
  }

  return boids;
}

function updateBoids(boids: Boid[], bounds: THREE.Vector3, dt: number) {
  const nextVelocities: THREE.Vector3[] = [];
  const nextPositions: THREE.Vector3[] = [];

  for (let i = 0; i < boids.length; i += 1) {
    const boid = boids[i];
    const acceleration = new THREE.Vector3();
    const heading = new THREE.Vector3();
    const center = new THREE.Vector3();
    const avoidance = new THREE.Vector3();
    let neighbors = 0;

    for (let j = 0; j < boids.length; j += 1) {
      if (i === j) continue;
      const other = boids[j];
      const offset = other.position.clone().sub(boid.position);
      const distanceSq = offset.lengthSq();

      if (distanceSq < SETTINGS.perceptionRadius * SETTINGS.perceptionRadius) {
        neighbors += 1;
        heading.add(other.velocity.clone().normalize());
        center.add(other.position);

        if (distanceSq < SETTINGS.avoidanceRadius * SETTINGS.avoidanceRadius) {
          const distance = Math.sqrt(Math.max(distanceSq, 0.0001));
          avoidance.add(offset.multiplyScalar(-1 / distance));
        }
      }
    }

    if (neighbors > 0) {
      center.multiplyScalar(1 / neighbors);
      acceleration.add(steerTowards(heading, boid.velocity).multiplyScalar(SETTINGS.alignWeight));
      acceleration.add(steerTowards(center.sub(boid.position), boid.velocity).multiplyScalar(SETTINGS.cohesionWeight));
      acceleration.add(steerTowards(avoidance, boid.velocity).multiplyScalar(SETTINGS.separateWeight));
    }

    const boundary = boundarySteer(boid.position, bounds, SETTINGS.boundaryMargin);
    if (boundary.lengthSq() > 0) {
      acceleration.add(steerTowards(boundary, boid.velocity).multiplyScalar(SETTINGS.boundaryWeight));
    }

    const desired = boid.velocity.clone().add(acceleration.multiplyScalar(dt));
    const speed = THREE.MathUtils.clamp(desired.length(), SETTINGS.minSpeed, SETTINGS.maxSpeed);
    desired.normalize().multiplyScalar(speed);

    const velocity = limitTurn(boid.velocity, desired, dt);
    nextVelocities[i] = velocity;
    nextPositions[i] = boid.position.clone().addScaledVector(velocity, dt);
  }

  for (let i = 0; i < boids.length; i += 1) {
    boids[i].velocity.copy(nextVelocities[i]);
    boids[i].position.copy(nextPositions[i]);
  }
}

function steerTowards(vector: THREE.Vector3, velocity: THREE.Vector3) {
  if (vector.lengthSq() < 0.000001) return new THREE.Vector3();
  const desired = vector.clone().normalize().multiplyScalar(SETTINGS.maxSpeed);
  return desired.sub(velocity).clampLength(0, SETTINGS.maxSteerForce);
}

function limitTurn(currentVelocity: THREE.Vector3, desiredVelocity: THREE.Vector3, dt: number) {
  const currentDirection = currentVelocity.clone().normalize();
  const desiredDirection = desiredVelocity.clone().normalize();
  const angle = currentDirection.angleTo(desiredDirection);
  const maxAngle = SETTINGS.maxTurnRate * dt;

  if (angle <= maxAngle || angle < 0.000001) return desiredVelocity;

  const t = maxAngle / angle;
  return currentDirection.lerp(desiredDirection, t).normalize().multiplyScalar(desiredVelocity.length());
}

function boundarySteer(position: THREE.Vector3, bounds: THREE.Vector3, margin: number) {
  const steer = new THREE.Vector3();
  (["x", "y", "z"] as const).forEach((axis) => {
    const inner = bounds[axis] - margin;
    if (position[axis] > inner) steer[axis] -= (position[axis] - inner) / margin;
    if (position[axis] < -inner) steer[axis] += (-inner - position[axis]) / margin;
  });
  return steer;
}

function createFishShadowGeometry() {
  const geometry = new THREE.BufferGeometry();
  const vertices = new Float32Array([
    0, 0, 0.62,
    -0.18, 0.045, -0.18,
    0.18, -0.045, -0.18,
    -0.12, 0.025, -0.15,
    -0.34, 0.075, -0.5,
    -0.22, 0, -0.38,
    0.12, -0.025, -0.15,
    0.34, -0.075, -0.5,
    0.22, 0, -0.38,
  ]);
  geometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
  geometry.computeVertexNormals();
  return geometry;
}

function randomUnitVector() {
  return new THREE.Vector3(randomBetween(-1, 1), randomBetween(-0.35, 0.35), randomBetween(-1, 1)).normalize();
}

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}
