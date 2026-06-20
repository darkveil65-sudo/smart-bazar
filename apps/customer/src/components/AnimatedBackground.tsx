'use client';

import { useEffect, useRef } from 'react';

/* ═══════════════════════════════════════════════════════════
   ANIMATED BACKGROUND — Canvas floating orbs + particles
   GPU-accelerated, pauses when tab is hidden.
   ═══════════════════════════════════════════════════════════ */

interface Orb {
  x: number; y: number;
  vx: number; vy: number;
  radius: number;
  color: string;
  alpha: number;
}

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  alpha: number;
  life: number; maxLife: number;
  radius: number;
}

const ORB_COLORS = [
  'rgba(0,200,83',    // primary green
  'rgba(20,184,166',  // teal
  'rgba(0,200,83',    // primary green again
  'rgba(110,231,183', // emerald light
  'rgba(255,171,0',   // amber accent
];

export default function AnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef   = useRef<number>(0);
  const orbsRef   = useRef<Orb[]>([]);
  const particlesRef = useRef<Particle[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const DPR = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      const W = window.innerWidth;
      const H = window.innerHeight;
      canvas.width  = W * DPR;
      canvas.height = H * DPR;
      canvas.style.width  = `${W}px`;
      canvas.style.height = `${H}px`;
      ctx.scale(DPR, DPR);
    };
    resize();
    window.addEventListener('resize', resize);

    // ── Init orbs ──────────────────────────────────────────
    const W = () => canvas.width  / DPR;
    const H = () => canvas.height / DPR;

    const initOrbs = () => {
      orbsRef.current = ORB_COLORS.map((color, i) => ({
        x:      Math.random() * W(),
        y:      Math.random() * H(),
        vx:     (Math.random() - 0.5) * 0.25,
        vy:     (Math.random() - 0.5) * 0.25,
        radius: 120 + i * 30 + Math.random() * 60,
        color,
        alpha:  0.06 + Math.random() * 0.08,
      }));
    };
    initOrbs();

    // ── Spawn particle ─────────────────────────────────────
    let particleTimer = 0;
    const spawnParticle = () => {
      const life = 80 + Math.random() * 80;
      particlesRef.current.push({
        x:       Math.random() * W(),
        y:       H() + 10,
        vx:      (Math.random() - 0.5) * 0.5,
        vy:      -(0.4 + Math.random() * 0.6),
        alpha:   0,
        life:    0,
        maxLife: life,
        radius:  1 + Math.random() * 2,
      });
    };

    // ── Draw loop ──────────────────────────────────────────
    const draw = () => {
      const w = W(), h = H();
      ctx.clearRect(0, 0, w, h);

      // Soft base gradient
      const base = ctx.createLinearGradient(0, 0, w, h);
      base.addColorStop(0,   'rgba(232,255,241,0.4)');
      base.addColorStop(0.5, 'rgba(240,253,244,0.3)');
      base.addColorStop(1,   'rgba(232,255,241,0.4)');
      ctx.fillStyle = base;
      ctx.fillRect(0, 0, w, h);

      // Draw orbs
      orbsRef.current.forEach(orb => {
        orb.x += orb.vx;
        orb.y += orb.vy;
        if (orb.x < -orb.radius)     orb.x = w + orb.radius;
        if (orb.x > w + orb.radius)  orb.x = -orb.radius;
        if (orb.y < -orb.radius)     orb.y = h + orb.radius;
        if (orb.y > h + orb.radius)  orb.y = -orb.radius;

        const gradient = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, orb.radius);
        gradient.addColorStop(0,   `${orb.color},${orb.alpha})`);
        gradient.addColorStop(0.5, `${orb.color},${orb.alpha * 0.5})`);
        gradient.addColorStop(1,   `${orb.color},0)`);
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(orb.x, orb.y, orb.radius, 0, Math.PI * 2);
        ctx.fill();
      });

      // Spawn + draw particles
      particleTimer++;
      if (particleTimer % 4 === 0) spawnParticle();
      particlesRef.current = particlesRef.current.filter(p => p.life < p.maxLife);
      particlesRef.current.forEach(p => {
        p.life++;
        p.x += p.vx;
        p.y += p.vy;
        const progress = p.life / p.maxLife;
        p.alpha = progress < 0.2
          ? progress / 0.2
          : progress > 0.8
            ? (1 - progress) / 0.2
            : 1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0,200,83,${p.alpha * 0.25})`;
        ctx.fill();
      });

      animRef.current = requestAnimationFrame(draw);
    };

    draw();

    // Pause when tab hidden
    const handleVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(animRef.current);
      } else {
        draw();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        opacity: 1,
      }}
    />
  );
}
