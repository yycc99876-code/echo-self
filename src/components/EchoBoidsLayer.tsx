"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

type Boid = {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  scale: number;
  color: THREE.Color;
};

type PredatorState = {
  position: THREE.Vector3;
  target: THREE.Vector3;
  active: boolean;
  intensity: number;
  lastMoveAt: number;
};

const SETTINGS = {
  minSpeed: 0.18,
  maxSpeed: 0.48,
  maxTurnRate: 0.82,
  perceptionRadius: 3.7,
  avoidanceRadius: 1.08,
  maxSteerForce: 0.42,
  alignWeight: 0.72,
  cohesionWeight: 0.5,
  separateWeight: 1.4,
  boundaryWeight: 1.35,
  boundaryMargin: 2.6,
  predatorRadius: 5.4,
  predatorWeight: 2.9,
  panicCohesionWeight: 0.72,
  millingWeight: 0.95,
  idleCenterWeight: 0.1,
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

    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    camera.position.set(0, 0.6, 20);

    const bounds = new THREE.Vector3(15, 6.6, 8);
    const isMobile = window.innerWidth < 760;
    const count = isMobile ? 24 : 64;
    const boids = createBoids(count, bounds);

    const geometry = createFishShadowGeometry();
    const material = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
      blending: THREE.NormalBlending,
      vertexColors: true,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.InstancedMesh(geometry, material, count);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(mesh);

    const fishTexture = createFishTexture();
    const sprites = boids.map((boid, index) => {
      const spriteMaterial = new THREE.SpriteMaterial({
        map: fishTexture,
        color: boid.color,
        transparent: true,
        opacity: index % 7 === 0 ? 0.42 : 0.36,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const sprite = new THREE.Sprite(spriteMaterial);
      sprite.scale.setScalar(boid.scale * 0.72);
      scene.add(sprite);
      return sprite;
    });

    const trailGeometry = new THREE.BufferGeometry();
    const trailPositions = new Float32Array(count * 3);
    const trailColors = new Float32Array(count * 3);
    trailGeometry.setAttribute("position", new THREE.BufferAttribute(trailPositions, 3));
    trailGeometry.setAttribute("color", new THREE.BufferAttribute(trailColors, 3));
    const trailMaterial = new THREE.PointsMaterial({
      size: isMobile ? 0.035 : 0.05,
      transparent: true,
      opacity: 0.52,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
    });
    const trails = new THREE.Points(trailGeometry, trailMaterial);
    scene.add(trails);

    const predator = createPredatorState();
    const predatorVisual = createPredatorVisual();
    scene.add(predatorVisual);
    const raycaster = new THREE.Raycaster();
    const mouseNdc = new THREE.Vector2();
    const interactionPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);

    function handlePointerMove(event: PointerEvent) {
      const rect = host.getBoundingClientRect();
      mouseNdc.x = ((event.clientX - rect.left) / Math.max(rect.width, 1)) * 2 - 1;
      mouseNdc.y = -(((event.clientY - rect.top) / Math.max(rect.height, 1)) * 2 - 1);
      raycaster.setFromCamera(mouseNdc, camera);
      raycaster.ray.intersectPlane(interactionPlane, predator.target);
      predator.active = true;
      predator.intensity = 1;
      predator.lastMoveAt = performance.now();
    }

    window.addEventListener("pointermove", handlePointerMove, { passive: true });

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
      const now = performance.now();
      const inactiveFor = now - predator.lastMoveAt;
      if (inactiveFor > 120) {
        predator.intensity = Math.max(0, predator.intensity - dt * 0.9);
      }
      predator.active = predator.intensity > 0.02;
      predator.position.lerp(predator.target, 1 - Math.pow(0.001, dt));
      predatorVisual.position.copy(predator.position);
      predatorVisual.visible = predator.active;
      predatorVisual.scale.setScalar(0.75 + predator.intensity * 0.55);
      (predatorVisual.material as THREE.SpriteMaterial).opacity = 0.12 + predator.intensity * 0.2;

      updateBoids(boids, bounds, dt, predator);
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

        const sprite = sprites[i];
        sprite.position.copy(boid.position);
        sprite.scale.set(boid.scale * 0.95, boid.scale * 0.36, 1);
        (sprite.material as THREE.SpriteMaterial).rotation = Math.atan2(boid.velocity.y, boid.velocity.x);

        const trailIndex = i * 3;
        const trail = boid.position.clone().addScaledVector(boid.velocity.clone().normalize(), -0.62);
        trailPositions[trailIndex] = trail.x;
        trailPositions[trailIndex + 1] = trail.y;
        trailPositions[trailIndex + 2] = trail.z;
        trailColors[trailIndex] = boid.color.r;
        trailColors[trailIndex + 1] = boid.color.g;
        trailColors[trailIndex + 2] = boid.color.b;
      }

      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      trailGeometry.attributes.position.needsUpdate = true;
      trailGeometry.attributes.color.needsUpdate = true;
      renderer.render(scene, camera);
      frame = requestAnimationFrame(animate);
    }

    animate();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("pointermove", handlePointerMove);
      geometry.dispose();
      material.dispose();
      trailGeometry.dispose();
      trailMaterial.dispose();
      fishTexture.dispose();
      (predatorVisual.material as THREE.SpriteMaterial).map?.dispose();
      (predatorVisual.material as THREE.SpriteMaterial).dispose();
      sprites.forEach((sprite) => {
        (sprite.material as THREE.SpriteMaterial).dispose();
      });
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
      randomBetween(-bounds.x * 0.88, bounds.x * 0.88),
      randomBetween(-bounds.y * 0.74, bounds.y * 0.42),
      randomBetween(-bounds.z * 0.68, bounds.z * 0.18),
    );
    const direction = randomUnitVector();
    const speed = randomBetween(SETTINGS.minSpeed, SETTINGS.maxSpeed);
    const color = blue.clone().lerp(i % 7 === 0 ? paper : teal, i % 7 === 0 ? 0.5 : 0.18);

    boids.push({
      position,
      velocity: direction.multiplyScalar(speed),
      scale: randomBetween(0.74, 1.28) * (i % 7 === 0 ? 1.14 : 1),
      color,
    });
  }

  return boids;
}

function updateBoids(boids: Boid[], bounds: THREE.Vector3, dt: number, predator: PredatorState) {
  const nextVelocities: THREE.Vector3[] = [];
  const nextPositions: THREE.Vector3[] = [];
  const schoolCenter = new THREE.Vector3();
  boids.forEach((boid) => schoolCenter.add(boid.position));
  schoolCenter.multiplyScalar(1 / Math.max(boids.length, 1));

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

    acceleration.add(steerTowards(schoolCenter.clone().sub(boid.position), boid.velocity).multiplyScalar(SETTINGS.idleCenterWeight));

    if (predator.active) {
      const predatorOffset = boid.position.clone().sub(predator.position);
      const distance = Math.max(predatorOffset.length(), 0.001);
      const pressure = Math.max(0, 1 - distance / SETTINGS.predatorRadius) * predator.intensity;

      if (pressure > 0) {
        const flee = predatorOffset.normalize().multiplyScalar(pressure);
        acceleration.add(steerTowards(flee, boid.velocity).multiplyScalar(SETTINGS.predatorWeight));
      }

      const toCenter = schoolCenter.clone().sub(boid.position);
      acceleration.add(steerTowards(toCenter, boid.velocity).multiplyScalar(SETTINGS.panicCohesionWeight * predator.intensity));

      const radial = boid.position.clone().sub(schoolCenter);
      if (radial.lengthSq() > 0.0001) {
        const tangent = new THREE.Vector3(-radial.y, radial.x, 0).normalize();
        acceleration.add(steerTowards(tangent, boid.velocity).multiplyScalar(SETTINGS.millingWeight * predator.intensity));
      }
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

function createPredatorState(): PredatorState {
  const initial = new THREE.Vector3(99, 99, 0);
  return {
    position: initial.clone(),
    target: initial.clone(),
    active: false,
    intensity: 0,
    lastMoveAt: 0,
  };
}

function createPredatorVisual() {
  const texture = createPredatorTexture();
  const material = new THREE.SpriteMaterial({
    map: texture,
    color: new THREE.Color("#f08c8c"),
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const sprite = new THREE.Sprite(material);
  sprite.visible = false;
  sprite.scale.set(1, 1, 1);
  return sprite;
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
    0, 0, 0.72,
    -0.08, 0.045, 0.05,
    0.08, -0.045, 0.05,
    -0.08, 0.035, 0.03,
    -0.48, 0.095, -0.68,
    -0.2, 0, -0.42,
    0.08, -0.035, 0.03,
    0.48, -0.095, -0.68,
    0.2, 0, -0.42,
  ]);
  geometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
  geometry.computeVertexNormals();
  return geometry;
}

function createFishTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 96;
  canvas.height = 40;
  const context = canvas.getContext("2d");
  if (!context) return new THREE.CanvasTexture(canvas);

  const gradient = context.createLinearGradient(12, 20, 88, 20);
  gradient.addColorStop(0, "rgba(255,255,255,0)");
  gradient.addColorStop(0.22, "rgba(175,199,232,0.22)");
  gradient.addColorStop(0.62, "rgba(236,239,242,0.72)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");

  context.fillStyle = gradient;
  context.beginPath();
  context.moveTo(90, 20);
  context.bezierCurveTo(58, 3, 26, 5, 8, 20);
  context.bezierCurveTo(28, 34, 58, 36, 90, 20);
  context.fill();

  context.fillStyle = "rgba(255,255,255,0.34)";
  context.beginPath();
  context.arc(70, 18, 2.2, 0, Math.PI * 2);
  context.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function createPredatorTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 96;
  canvas.height = 96;
  const context = canvas.getContext("2d");
  if (!context) return new THREE.CanvasTexture(canvas);

  const gradient = context.createRadialGradient(48, 48, 0, 48, 48, 42);
  gradient.addColorStop(0, "rgba(240,140,140,0.85)");
  gradient.addColorStop(0.22, "rgba(240,140,140,0.28)");
  gradient.addColorStop(1, "rgba(240,140,140,0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 96, 96);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function randomUnitVector() {
  return new THREE.Vector3(randomBetween(-1, 1), randomBetween(-0.35, 0.35), randomBetween(-1, 1)).normalize();
}

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}
