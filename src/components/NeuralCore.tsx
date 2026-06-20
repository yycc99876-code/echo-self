"use client";

import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  baseAngle: number;
  baseDistance: number;
  speed: number;
  size: number;
  color: string;
}

export function NeuralCore({ mode, hasLifeChart }: { mode: string; hasLifeChart: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);
  const mouseRef = useRef({ x: -1000, y: -1000, isActive: false });

  // Init particles
  useEffect(() => {
    const colors = [
      "rgba(236, 239, 242, 0.8)", // Primary text/white
      "rgba(175, 199, 232, 0.6)", // Accent blue
      "rgba(142, 214, 163, 0.5)", // Success mint
    ];

    particlesRef.current = Array.from({ length: 220 }, (_, i) => {
      const baseAngle = Math.random() * Math.PI * 2;
      const baseDistance = Math.random() * 140 + 20; // Radius spread
      return {
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        baseAngle,
        baseDistance,
        speed: (Math.random() * 0.005 + 0.001) * (Math.random() > 0.5 ? 1 : -1),
        size: Math.random() * 1.5 + 0.5,
        color: colors[i % colors.length],
      };
    });
  }, []);

  // Main render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    // Handle resize
    let width = canvas.offsetWidth;
    let height = canvas.offsetHeight;
    
    // Support high DPI displays
    const dpr = window.devicePixelRatio || 1;
    const resize = () => {
      width = canvas.offsetWidth;
      height = canvas.offsetHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
    };
    resize();
    window.addEventListener("resize", resize);

    const render = () => {
      // Clear with slight trail effect (alpha < 1)
      ctx.clearRect(0, 0, width, height);
      
      const centerX = width / 2;
      const centerY = height / 2;
      const mouse = mouseRef.current;

      // Draw connections (Neural web)
      ctx.beginPath();
      ctx.lineWidth = 0.4;
      ctx.strokeStyle = "rgba(175, 199, 232, 0.08)";
      
      const particles = particlesRef.current;
      
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // 1. Update Base Orbital Position
        // If mode is thinking/calibrating, spin faster
        const speedMultiplier = (mode === "thinking" || mode === "calibrating") ? 3 : 1;
        p.baseAngle += p.speed * speedMultiplier;
        
        const targetX = centerX + Math.cos(p.baseAngle) * p.baseDistance;
        const targetY = centerY + Math.sin(p.baseAngle) * p.baseDistance;

        // 2. Spring Force towards target
        const dx = targetX - p.x;
        const dy = targetY - p.y;
        p.vx += dx * 0.015; // Spring constant
        p.vy += dy * 0.015;

        // 3. Mouse Repulsion
        if (mouse.isActive) {
          const mdx = mouse.x - p.x;
          const mdy = mouse.y - p.y;
          const mDist = Math.sqrt(mdx * mdx + mdy * mdy);
          if (mDist < 120) {
            const force = (120 - mDist) / 120;
            p.vx -= (mdx / mDist) * force * 0.8;
            p.vy -= (mdy / mDist) * force * 0.8;
          }
        }

        // 4. Apply velocity and friction
        p.vx *= 0.88; // Friction
        p.vy *= 0.88;
        
        // Safety bounds to prevent extreme explosion
        if (p.vx > 20) p.vx = 20;
        if (p.vx < -20) p.vx = -20;
        if (p.vy > 20) p.vy = 20;
        if (p.vy < -20) p.vy = -20;

        p.x += p.vx;
        p.y += p.vy;

        // Draw Particle
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();

        // Draw connections to nearby particles
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dist = Math.sqrt((p.x - p2.x) ** 2 + (p.y - p2.y) ** 2);
          if (dist < 35) {
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
          }
        }
      }
      ctx.stroke();

      animationRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationRef.current);
    };
  }, [mode]);

  const handleMouseMove = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    mouseRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      isActive: true,
    };
  };

  const handleMouseLeave = () => {
    mouseRef.current.isActive = false;
  };

  const handleClick = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    
    const centerX = canvas.offsetWidth / 2;
    const centerY = canvas.offsetHeight / 2;
    const distCenter = Math.sqrt((mx - centerX) ** 2 + (my - centerY) ** 2);

    const particles = particlesRef.current;

    // 交互逻辑：点击核心区 -> 神经内爆；点击边缘区 -> 涟漪炸弹
    if (distCenter < 60) {
      // 神经内爆 (Implosion)
      particles.forEach((p) => {
        const dx = centerX - p.x;
        const dy = centerY - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 0) {
          // 产生一个向中心的巨大拉力
          p.vx += (dx / dist) * (Math.random() * 25 + 15);
          p.vy += (dy / dist) * (Math.random() * 25 + 15);
        }
      });
    } else {
      // 涟漪排斥 (Explosion Ripple)
      particles.forEach((p) => {
        const dx = p.x - mx;
        const dy = p.y - my;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 180 && dist > 0) {
          const force = (180 - dist) / 180;
          // 产生一个向外推开的爆发力
          p.vx += (dx / dist) * force * 40;
          p.vy += (dy / dist) * force * 40;
        }
      });
    }
  };

  return (
    <canvas
      ref={canvasRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      className={`absolute inset-0 z-10 w-full h-full cursor-crosshair transition-opacity duration-1000 ${
        hasLifeChart ? "opacity-100" : "opacity-80"
      }`}
      style={{ touchAction: "none" }}
    />
  );
}
