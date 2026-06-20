"use client";

import { useEffect, useRef } from "react";

interface Particle {
  distance: number;
  currentDistance: number;
  baseAngle: number;
  angle: number;
  size: number;
  color: string;
}

export function NeuralCore({ mode, hasLifeChart }: { mode: string; hasLifeChart: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);

  useEffect(() => {
    const particles: Particle[] = [];
    const totalParticles = 1300;
    const numArms = 5;
    const maxRadius = 420;
    const twistFactor = 0.013;

    for (let i = 0; i < totalParticles; i++) {
      const r = Math.pow(Math.random(), 2.2) * maxRadius;
      const arm = i % numArms;
      const armAngle = arm * ((Math.PI * 2) / numArms);
      const scatterSpread = 0.05 + (r / maxRadius) * 0.15;
      const scatter = (Math.random() - 0.5) * scatterSpread;
      const finalAngle = armAngle + r * twistFactor + scatter;

      let color;
      let alpha = Math.random() * 0.18 + 0.18;
      
      if (r < 30) {
        color = `rgba(255, 255, 255, ${alpha + 0.12})`;
      } else if (r < 90) {
        color = `rgba(250, 219, 95, ${alpha})`;
      } else if (r < 180) {
        color = `rgba(216, 208, 194, ${alpha})`;
      } else if (r < 300) {
        color = `rgba(109, 151, 168, ${alpha})`;
      } else {
        color = `rgba(29, 52, 91, ${alpha * 0.7})`;
      }

      particles.push({
        distance: r,
        currentDistance: r,
        baseAngle: finalAngle,
        angle: finalAngle,
        size: r < 40 ? Math.random() * 1.4 + 0.6 : Math.random() * 1 + 0.3,
        color,
      });
    }

    particlesRef.current = particles;
  }, []);

  // Main Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let width = canvas.offsetWidth;
    let height = canvas.offsetHeight;
    let centerX = width / 2;
    let centerY = height / 2;
    
    const dpr = window.devicePixelRatio || 1;
    const resize = () => {
      width = canvas.offsetWidth;
      height = canvas.offsetHeight;
      centerX = width / 2;
      centerY = height / 2;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    let globalRotation = 0;

    const render = () => {
      let speedMult = (mode === "thinking" || mode === "calibrating") ? 4 : 1;
      
      globalRotation -= 0.00045 * speedMult;

      ctx.clearRect(0, 0, width, height);

      const coreGlow = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 100);
      coreGlow.addColorStop(0, "rgba(255, 255, 255, 0.12)");
      coreGlow.addColorStop(0.35, "rgba(216, 208, 194, 0.07)");
      coreGlow.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = coreGlow;
      ctx.fillRect(centerX - 100, centerY - 100, 200, 200);

      const particles = particlesRef.current;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        p.currentDistance += (p.distance - p.currentDistance) * 0.1;
        const currentAngle = p.baseAngle + globalRotation;
        const x = centerX + Math.cos(currentAngle) * p.currentDistance;
        const y = centerY + Math.sin(currentAngle) * p.currentDistance;

        ctx.fillStyle = p.color;
        
        if (p.distance < 40) {
          ctx.shadowBlur = 5;
          ctx.shadowColor = "rgba(255,255,255,0.42)";
        } else if (p.distance < 100) {
          ctx.shadowBlur = 2;
          ctx.shadowColor = "rgba(216,208,194,0.25)";
        } else {
          ctx.shadowBlur = 0;
        }

        ctx.beginPath();
        ctx.arc(x, y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      animationRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationRef.current);
    };
  }, [mode]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full transition-opacity duration-1000 ${
        hasLifeChart ? "opacity-70" : "opacity-55"
      }`}
      style={{ touchAction: "none", pointerEvents: "none" }}
    />
  );
}
