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
  const mouseRef = useRef({ x: -1000, y: -1000, isActive: false, isClicking: false });

  // Init Crisp Star Spiral
  useEffect(() => {
    const particles: Particle[] = [];
    const totalParticles = 4000; // Optimal density for crisp stars
    const numArms = 5; 
    const maxRadius = 800; // Big enough to fill the screen
    const twistFactor = 0.012; // Elegant curvature

    for (let i = 0; i < totalParticles; i++) {
      // Dense center, spreading outwards
      const r = Math.pow(Math.random(), 2.2) * maxRadius;

      // Select Arm
      const arm = i % numArms;
      const armAngle = arm * ((Math.PI * 2) / numArms);

      // Tight, controlled scatter that slightly flares at the tips
      const scatterSpread = 0.05 + (r / maxRadius) * 0.15;
      const scatter = (Math.random() - 0.5) * scatterSpread;

      // Final angle
      const finalAngle = armAngle + r * twistFactor + scatter;

      // Color mapping exactly matching the design
      let color;
      let alpha = Math.random() * 0.4 + 0.6; // 0.6 to 1.0 opacity
      
      if (r < 30) {
        // Pure white hot core
        color = `rgba(255, 255, 255, ${alpha})`;
      } else if (r < 90) {
        // Star Gold
        color = `rgba(250, 219, 95, ${alpha})`;
      } else if (r < 180) {
        // Deep Gold
        color = `rgba(229, 169, 58, ${alpha})`;
      } else if (r < 300) {
        // Cerulean
        color = `rgba(109, 151, 168, ${alpha})`;
      } else {
        // Prussian Blue fading out
        color = `rgba(29, 52, 91, ${alpha * 0.7})`;
      }

      particles.push({
        distance: r,
        currentDistance: r,
        baseAngle: finalAngle,
        angle: finalAngle,
        // Sharp, tiny dots like real stars
        size: r < 40 ? Math.random() * 2 + 1 : Math.random() * 1.5 + 0.5,
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
      
      // Majestic rotation
      globalRotation -= 0.001 * speedMult;

      ctx.clearRect(0, 0, width, height);

      // Draw a very soft, pure radial glow for the core ONLY, behind the particles
      const coreGlow = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 100);
      coreGlow.addColorStop(0, "rgba(255, 255, 255, 0.4)");
      coreGlow.addColorStop(0.3, "rgba(250, 219, 95, 0.2)");
      coreGlow.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = coreGlow;
      ctx.fillRect(centerX - 100, centerY - 100, 200, 200);

      const particles = particlesRef.current;
      const mouse = mouseRef.current;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Interaction
        let targetDistance = p.distance;
        let targetAngleOffset = 0;

        if (mouse.isClicking) {
          // Implosion
          targetDistance = p.distance * 0.2;
          targetAngleOffset = p.distance * 0.05; 
        } else if (mouse.isActive) {
          // Hover repulse
          const idealX = centerX + Math.cos(p.baseAngle + globalRotation) * p.distance;
          const idealY = centerY + Math.sin(p.baseAngle + globalRotation) * p.distance;
          const distToMouse = Math.sqrt((idealX - mouse.x) ** 2 + (idealY - mouse.y) ** 2);
          
          if (distToMouse < 150) {
            const repulsion = (150 - distToMouse) / 150;
            targetDistance = p.distance + repulsion * 100;
          }
        }

        p.currentDistance += (targetDistance - p.currentDistance) * 0.1;

        const currentAngle = p.baseAngle + globalRotation + targetAngleOffset;
        const x = centerX + Math.cos(currentAngle) * p.currentDistance;
        const y = centerY + Math.sin(currentAngle) * p.currentDistance;

        // Draw crisp star
        ctx.fillStyle = p.color;
        
        // Only inner particles glow to avoid washing out the whole image
        if (p.distance < 40) {
          ctx.shadowBlur = 8;
          ctx.shadowColor = "#FFFFFF";
        } else if (p.distance < 100) {
          ctx.shadowBlur = 4;
          ctx.shadowColor = "#FADB5F";
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

  const handleMouseMove = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    mouseRef.current.x = e.clientX - rect.left;
    mouseRef.current.y = e.clientY - rect.top;
    mouseRef.current.isActive = true;
  };

  const handleMouseLeave = () => {
    mouseRef.current.isActive = false;
    mouseRef.current.isClicking = false;
  };

  const handleMouseDown = () => {
    mouseRef.current.isClicking = true;
  };

  const handleMouseUp = () => {
    mouseRef.current.isClicking = false;
  };

  return (
    <canvas
      ref={canvasRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      className={`absolute inset-0 w-full h-full cursor-crosshair transition-opacity duration-1000 ${
        hasLifeChart ? "opacity-100" : "opacity-90"
      }`}
      style={{ touchAction: "none" }}
    />
  );
}
