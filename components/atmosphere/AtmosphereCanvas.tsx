"use client";

import { useEffect, useRef } from "react";
import { useAtmosphere } from "./AtmosphereProvider";
import { MAX_PARTICLES } from "./moods";
import type { MoodConfig, Particle } from "./types";

/** Lerp a single number toward target */
function lerp(current: number, target: number, t: number): number {
  return current + (target - current) * t;
}

/** Lerp an RGB tuple */
function lerpColor(
  current: [number, number, number],
  target: [number, number, number],
  t: number,
): [number, number, number] {
  return [
    lerp(current[0], target[0], t),
    lerp(current[1], target[1], t),
    lerp(current[2], target[2], t),
  ];
}

/** Lerp all mood config values */
function lerpMood(current: MoodConfig, target: MoodConfig, t: number): MoodConfig {
  return {
    particleDensity: lerp(current.particleDensity, target.particleDensity, t),
    particleSpeed: lerp(current.particleSpeed, target.particleSpeed, t),
    rayOpacity: lerp(current.rayOpacity, target.rayOpacity, t),
    rayColor: lerpColor(current.rayColor, target.rayColor, t),
    fogHeight: lerp(current.fogHeight, target.fogHeight, t),
    fogOpacity: lerp(current.fogOpacity, target.fogOpacity, t),
    bgTint: lerpColor(current.bgTint, target.bgTint, t),
  };
}

function createParticle(width: number, height: number): Particle {
  return {
    x: Math.random() * width,
    y: Math.random() * height,
    radius: 1 + Math.random() * 2,
    opacity: 0.05 + Math.random() * 0.1,
    phase: Math.random() * Math.PI * 2,
    angle: -Math.PI / 2 + (Math.random() - 0.5) * 0.6, // mostly upward
    speed: 0.1 + Math.random() * 0.2,
  };
}

export function AtmosphereCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { mood: targetMood, flash, clearFlash, dim, clearDim } = useAtmosphere();

  // All mutable render state lives in refs to avoid re-renders
  const stateRef = useRef({
    particles: [] as Particle[],
    currentMood: { ...targetMood },
    flashOpacity: 0,
    dimOpacity: 0,
    frameCount: 0,
    width: 0,
    height: 0,
  });

  // Sync flash trigger
  useEffect(() => {
    if (flash > 0) {
      stateRef.current.flashOpacity = flash;
      clearFlash();
    }
  }, [flash, clearFlash]);

  useEffect(() => {
    if (dim) {
      stateRef.current.dimOpacity = 0.15;
      clearDim();
    }
  }, [dim, clearDim]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;

    function resize() {
      const s = stateRef.current;
      s.width = window.innerWidth;
      s.height = window.innerHeight;
      canvas!.width = s.width;
      canvas!.height = s.height;
    }

    let resizeTimer: ReturnType<typeof setTimeout>;
    function handleResize() {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resize, 200);
    }

    resize();
    window.addEventListener("resize", handleResize);

    // Initialize particles
    const s = stateRef.current;
    s.particles = [];
    for (let i = 0; i < MAX_PARTICLES; i++) {
      s.particles.push(createParticle(s.width, s.height));
    }

    function render() {
      animId = requestAnimationFrame(render);

      const s = stateRef.current;
      s.frameCount++;

      // 30fps cap: skip odd frames
      if (s.frameCount % 2 !== 0) return;

      // Pause when tab hidden
      if (document.hidden) return;

      const { width: w, height: h } = s;
      if (w === 0 || h === 0) return;

      // Lerp toward target mood
      const lerpSpeed = 0.015; // ~2s to converge at 30fps
      s.currentMood = lerpMood(s.currentMood, targetMood, lerpSpeed);
      const m = s.currentMood;

      // Clear with tinted background
      const [br, bg, bb] = m.bgTint;
      ctx!.fillStyle = `rgb(${br},${bg},${bb})`;
      ctx!.fillRect(0, 0, w, h);

      // ── Shared time value ──
      const time = s.frameCount * 0.03;

      // ── Ambient glow pools (soft radial gradients that drift slowly) ──
      const [rr, rg, rb] = m.rayColor;
      const op = m.rayOpacity * 0.35;
      const drift = Math.sin(time * 0.15) * 30; // slow horizontal drift

      const glows = [
        { x: w * 0.25 + drift, y: h * 0.15, r: w * 0.22 },
        { x: w * 0.6 - drift * 0.7, y: h * 0.1, r: w * 0.18 },
        { x: w * 0.8 + drift * 0.4, y: h * 0.35, r: w * 0.15 },
      ];

      for (const glow of glows) {
        const grad = ctx!.createRadialGradient(glow.x, glow.y, 0, glow.x, glow.y, glow.r);
        grad.addColorStop(0, `rgba(${rr},${rg},${rb},${op})`);
        grad.addColorStop(0.5, `rgba(${rr},${rg},${rb},${op * 0.3})`);
        grad.addColorStop(1, `rgba(${rr},${rg},${rb},0)`);
        ctx!.fillStyle = grad;
        ctx!.fillRect(glow.x - glow.r, glow.y - glow.r, glow.r * 2, glow.r * 2);
      }

      // ── Particles ──
      const activeCount = Math.floor(MAX_PARTICLES * m.particleDensity);

      for (let i = 0; i < MAX_PARTICLES; i++) {
        const p = s.particles[i];
        if (i >= activeCount) continue;

        // Move
        p.x += Math.cos(p.angle) * p.speed * (m.particleSpeed / 0.15);
        p.y += Math.sin(p.angle) * p.speed * (m.particleSpeed / 0.15);

        // Wrap around viewport
        if (p.y < -10) { p.y = h + 10; p.x = Math.random() * w; }
        if (p.y > h + 10) { p.y = -10; p.x = Math.random() * w; }
        if (p.x < -10) p.x = w + 10;
        if (p.x > w + 10) p.x = -10;

        // Oscillating opacity
        const osc = 0.5 + 0.5 * Math.sin(time + p.phase);
        const alpha = p.opacity * osc;

        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(237,233,225,${alpha})`;
        ctx!.fill();
      }

      // ── Fog layer ──
      const fogY = h * (1 - m.fogHeight);
      const fogGrad = ctx!.createLinearGradient(0, fogY, 0, h);
      fogGrad.addColorStop(0, `rgba(${br},${bg},${bb},0)`);
      fogGrad.addColorStop(0.4, `rgba(${br},${bg},${bb},${m.fogOpacity * 0.5})`);
      fogGrad.addColorStop(1, `rgba(${br},${bg},${bb},${m.fogOpacity})`);
      ctx!.fillStyle = fogGrad;
      ctx!.fillRect(0, fogY, w, h - fogY);

      // ── Flash overlay ──
      if (s.flashOpacity > 0.001) {
        ctx!.fillStyle = `rgba(237,233,225,${s.flashOpacity})`;
        ctx!.fillRect(0, 0, w, h);
        s.flashOpacity *= 0.88; // decay ~0.6s at 30fps
      }

      // ── Dim overlay (deliberation transition) ──
      if (s.dimOpacity > 0.001) {
        ctx!.fillStyle = `rgba(0,0,0,${s.dimOpacity})`;
        ctx!.fillRect(0, 0, w, h);
        s.dimOpacity *= 0.95; // slower decay ~1s at 30fps
      }
    }

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
      clearTimeout(resizeTimer);
    };
  }, [targetMood, flash, clearFlash]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 -z-10"
      style={{ willChange: "transform" }}
      aria-hidden="true"
    />
  );
}
