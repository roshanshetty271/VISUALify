'use client';

import { useEffect, useRef } from 'react';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { beatClock } from '@/lib/utils/beatClock';

interface Star {
  x: number;
  y: number;
  z: number;
  pz: number;
  brightness: number;
  temp: number;
}

interface Planet {
  x: number;
  y: number;
  z: number;
  radius: number;
  hue: number;
  sat: number;
  lit: number;
  hasRing: boolean;
}

const STAR_COUNT = 1200;
const PLANET_COUNT = 4;
const FAR = 150;
const NEAR = 0.5;
const TWO_PI = Math.PI * 2;

const NEBULA_DATA = [
  { x: -0.3, y: -0.2, radius: 0.4, hue: 270, drift: 0.1 },
  { x: 0.4, y: 0.3, radius: 0.35, hue: 200, drift: -0.08 },
  { x: -0.1, y: 0.4, radius: 0.3, hue: 320, drift: 0.12 },
];

const PLANET_HUES = [20, 30, 180, 210, 280, 340];

function makeStar(): Star {
  return {
    x: (Math.random() - 0.5) * 2.5,
    y: (Math.random() - 0.5) * 2.5,
    z: Math.random() * FAR + 1,
    pz: 0,
    brightness: 0.4 + Math.random() * 0.6,
    temp: Math.random(),
  };
}

function makePlanet(): Planet {
  return {
    x: (Math.random() - 0.5) * 1.2,
    y: (Math.random() - 0.5) * 0.8,
    z: FAR + Math.random() * 60,
    radius: 0.025 + Math.random() * 0.06,
    hue: PLANET_HUES[Math.floor(Math.random() * PLANET_HUES.length)],
    sat: 40 + Math.random() * 30,
    lit: 40 + Math.random() * 20,
    hasRing: Math.random() > 0.5,
  };
}

export function StarfieldMode() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef(0);
  const starsRef = useRef<Star[]>([]);
  const planetsRef = useRef<Planet[]>([]);
  const lastFrameRef = useRef(performance.now());
  const mouseRef = useRef({ x: 0.5, y: 0.5 });
  const vpRef = useRef({ x: 0, y: 0 });
  const warpRef = useRef({ active: false, speed: 0 });
  const beatPulseRef = useRef(0);
  const lastBeatRef = useRef(-1);

  useEffect(() => {
    starsRef.current = Array.from({ length: STAR_COUNT }, makeStar);
    planetsRef.current = Array.from({ length: PLANET_COUNT }, makePlanet);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const p = canvas.parentElement;
      if (p) { canvas.width = p.clientWidth; canvas.height = p.clientHeight; }
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onMove = (e: MouseEvent) => {
      mouseRef.current.x = e.clientX / window.innerWidth;
      mouseRef.current.y = e.clientY / window.innerHeight;
    };
    const onDown = () => { warpRef.current.active = true; };
    const onUp = () => { warpRef.current.active = false; };
    const onTouchMove = (e: TouchEvent) => {
      const t = e.touches[0];
      mouseRef.current.x = t.clientX / window.innerWidth;
      mouseRef.current.y = t.clientY / window.innerHeight;
    };
    const onTouchStart = (e: TouchEvent) => { warpRef.current.active = true; onTouchMove(e); };
    const onTouchEnd = () => { warpRef.current.active = false; };
    const block = (e: Event) => e.preventDefault();

    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('mousedown', onDown);
    window.addEventListener('mouseup', onUp);
    canvas.addEventListener('touchmove', onTouchMove, { passive: true });
    canvas.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchend', onTouchEnd);
    canvas.addEventListener('contextmenu', block);

    return () => {
      canvas.removeEventListener('mousemove', onMove);
      canvas.removeEventListener('mousedown', onDown);
      window.removeEventListener('mouseup', onUp);
      canvas.removeEventListener('touchmove', onTouchMove);
      canvas.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchend', onTouchEnd);
      canvas.removeEventListener('contextmenu', block);
    };
  }, []);

  useEffect(() => {
    const animate = () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) { animRef.current = requestAnimationFrame(animate); return; }

      const now = performance.now();
      const rawDt = Math.min((now - lastFrameRef.current) / 1000, 0.05);
      lastFrameRef.current = now;

      const { audioFeatures, isPlaying } = usePlayerStore.getState();
      const { animationSpeed, glowIntensity } = useSettingsStore.getState();

      const dt = rawDt * animationSpeed;
      beatClock.tick(dt, isPlaying);

      const w = canvas.width;
      const h = canvas.height;
      if (w === 0 || h === 0) { animRef.current = requestAnimationFrame(animate); return; }

      const cx = w / 2;
      const cy = h / 2;
      const fl = w * 0.5;

      const energy = audioFeatures?.energy ?? 0.5;
      const tempo = audioFeatures?.tempo ?? 120;
      const valence = audioFeatures?.valence ?? 0.5;

      const kick = beatClock.kick(tempo);
      const beat = beatClock.beatIndex(tempo);

      if (beat !== lastBeatRef.current && isPlaying) {
        lastBeatRef.current = beat;
        beatPulseRef.current = 1;
      }
      beatPulseRef.current *= 0.9;
      const bp = beatPulseRef.current;

      // Warp lerp (ramps smoothly to 4, so speed multiplier goes up to 1+4*3=13x)
      const wt = warpRef.current.active ? 4 : 0;
      warpRef.current.speed += (wt - warpRef.current.speed) * 0.04;
      const ws = warpRef.current.speed;

      // Vanishing point lerp
      const tvx = (mouseRef.current.x - 0.5) * 0.6;
      const tvy = (mouseRef.current.y - 0.5) * 0.6;
      vpRef.current.x += (tvx - vpRef.current.x) * 0.03;
      vpRef.current.y += (tvy - vpRef.current.y) * 0.03;
      const vx = vpRef.current.x;
      const vy = vpRef.current.y;

      const baseSpeed = 15 + energy * 25;
      const beatBoost = bp * energy * 20;
      const speed = (baseSpeed + beatBoost) * (1 + ws * 3);

      // At rest: fully clear each frame. During warp: leave trails for streak effect.
      if (ws < 0.1) {
        ctx.fillStyle = '#02020a';
        ctx.fillRect(0, 0, w, h);
      } else {
        const trailAlpha = 0.12 + (1 - Math.min(ws, 4) / 4) * 0.4;
        ctx.fillStyle = `rgba(2, 2, 10, ${trailAlpha})`;
        ctx.fillRect(0, 0, w, h);
      }

      const time = beatClock.now;

      // --- Nebulae (very subtle, background only) ---
      ctx.globalCompositeOperation = 'lighter';
      for (const neb of NEBULA_DATA) {
        const nx = (neb.x + Math.sin(time * neb.drift) * 0.04 + vx * 0.2) * w + cx;
        const ny = (neb.y + Math.cos(time * neb.drift * 1.3) * 0.03 + vy * 0.2) * h + cy;
        const nr = neb.radius * Math.min(w, h);
        const na = (0.015 + kick * 0.008) * glowIntensity;
        const hShift = valence * 30;

        const g = ctx.createRadialGradient(nx, ny, 0, nx, ny, nr);
        g.addColorStop(0, `hsla(${neb.hue + hShift}, 50%, 40%, ${na})`);
        g.addColorStop(0.6, `hsla(${neb.hue + hShift}, 30%, 20%, ${na * 0.2})`);
        g.addColorStop(1, 'transparent');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(nx, ny, nr, 0, TWO_PI);
        ctx.fill();
      }

      ctx.globalCompositeOperation = 'source-over';

      // --- Stars as clean streaks ---
      for (const star of starsRef.current) {
        star.pz = star.z;
        star.z -= speed * dt;

        if (star.z < NEAR) {
          Object.assign(star, makeStar());
          star.z = FAR;
          star.pz = FAR;
          continue;
        }

        const sx = (star.x - vx) / star.z * fl + cx;
        const sy = (star.y - vy) / star.z * fl + cy;

        if (sx < -80 || sx > w + 80 || sy < -80 || sy > h + 80) continue;

        const depth = 1 - star.z / FAR;
        const alpha = Math.min(1, depth * depth * star.brightness * (0.8 + kick * 0.4));

        // Mostly white, subtle tint on some
        let r = 255, g2 = 255, b = 255;
        if (star.temp < 0.2) { r = 200; g2 = 220; b = 255; }
        else if (star.temp > 0.8) { r = 255; g2 = 240; b = 200 + valence * 30; }

        // Streak from previous to current position
        const px = (star.x - vx) / star.pz * fl + cx;
        const py = (star.y - vy) / star.pz * fl + cy;

        const streakW = 0.5 + depth * 1.5 * star.brightness;

        // Always draw streak line (the core visual)
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(sx, sy);
        ctx.strokeStyle = `rgba(${r}, ${g2}, ${b}, ${alpha})`;
        ctx.lineWidth = streakW;
        ctx.lineCap = 'round';
        ctx.stroke();

        // Bright head dot at the leading edge (close stars only)
        if (depth > 0.4) {
          const dotR = 0.5 + depth * 1.2 * star.brightness;
          ctx.beginPath();
          ctx.arc(sx, sy, dotR, 0, TWO_PI);
          ctx.fillStyle = `rgba(${r}, ${g2}, ${b}, ${Math.min(1, alpha * 1.3)})`;
          ctx.fill();
        }
      }

      // --- Planets ---
      ctx.globalCompositeOperation = 'source-over';
      for (let i = 0; i < planetsRef.current.length; i++) {
        const p = planetsRef.current[i];
        p.z -= speed * dt * 0.6;

        if (p.z < NEAR * 3) {
          planetsRef.current[i] = makePlanet();
          continue;
        }

        const px = (p.x - vx) / p.z * fl + cx;
        const py = (p.y - vy) / p.z * fl + cy;
        const sr = p.radius / p.z * fl;

        if (sr < 0.8 || px < -sr * 3 || px > w + sr * 3 || py < -sr * 3 || py > h + sr * 3) continue;

        // Atmosphere glow (subtle)
        ctx.globalCompositeOperation = 'lighter';
        const ag = ctx.createRadialGradient(px, py, sr * 0.9, px, py, sr * 2);
        ag.addColorStop(0, `hsla(${p.hue}, ${p.sat}%, ${p.lit}%, ${0.08 * glowIntensity})`);
        ag.addColorStop(1, 'transparent');
        ctx.fillStyle = ag;
        ctx.beginPath();
        ctx.arc(px, py, sr * 2.5, 0, TWO_PI);
        ctx.fill();

        // Body
        ctx.globalCompositeOperation = 'source-over';
        const bg = ctx.createRadialGradient(px - sr * 0.3, py - sr * 0.3, 0, px, py, sr);
        bg.addColorStop(0, `hsl(${p.hue}, ${p.sat + 10}%, ${p.lit + 20}%)`);
        bg.addColorStop(0.7, `hsl(${p.hue}, ${p.sat}%, ${p.lit}%)`);
        bg.addColorStop(1, `hsl(${p.hue}, ${p.sat}%, ${Math.max(10, p.lit - 15)}%)`);
        ctx.fillStyle = bg;
        ctx.beginPath();
        ctx.arc(px, py, sr, 0, TWO_PI);
        ctx.fill();

        // Ring
        if (p.hasRing && sr > 4) {
          ctx.save();
          ctx.translate(px, py);
          ctx.scale(1, 0.3);
          ctx.beginPath();
          ctx.arc(0, 0, sr * 1.8, 0, TWO_PI);
          ctx.strokeStyle = `hsla(${p.hue}, 20%, 70%, 0.3)`;
          ctx.lineWidth = Math.max(1, sr * 0.12);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(0, 0, sr * 1.5, 0, TWO_PI);
          ctx.strokeStyle = `hsla(${p.hue}, 15%, 60%, 0.2)`;
          ctx.lineWidth = Math.max(0.5, sr * 0.08);
          ctx.stroke();
          ctx.restore();
        }

        // Specular
        ctx.beginPath();
        ctx.arc(px - sr * 0.25, py - sr * 0.25, sr * 0.18, 0, TWO_PI);
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.fill();
      }

      // --- Warp tunnel (subtle ring glow when holding) ---
      if (ws > 0.3) {
        ctx.globalCompositeOperation = 'lighter';
        const vpSx = vx * w + cx;
        const vpSy = vy * h + cy;
        const ta = Math.min(0.06, (ws - 0.3) * 0.015) * glowIntensity;

        for (let i = 0; i < 3; i++) {
          const r = (100 + i * 90) * (1 + ws * 0.3);
          const tg = ctx.createRadialGradient(vpSx, vpSy, r * 0.5, vpSx, vpSy, r);
          tg.addColorStop(0, 'transparent');
          tg.addColorStop(0.7, `rgba(100, 160, 255, ${ta * (1 - i * 0.25)})`);
          tg.addColorStop(1, 'transparent');
          ctx.fillStyle = tg;
          ctx.beginPath();
          ctx.arc(vpSx, vpSy, r, 0, TWO_PI);
          ctx.fill();
        }
      }

      // --- Beat flash (barely perceptible pulse, no white-out) ---
      if (bp > 0.4) {
        ctx.globalCompositeOperation = 'lighter';
        const fa = (bp - 0.4) * 0.03 * energy * glowIntensity;
        ctx.fillStyle = `rgba(180, 200, 255, ${Math.min(0.04, fa)})`;
        ctx.fillRect(0, 0, w, h);
      }

      // --- Vignette ---
      ctx.globalCompositeOperation = 'source-over';
      const vg = ctx.createRadialGradient(cx, cy, Math.min(w, h) * 0.4, cx, cy, Math.max(w, h) * 0.72);
      vg.addColorStop(0, 'transparent');
      vg.addColorStop(1, 'rgba(0, 0, 0, 0.55)');
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, w, h);

      ctx.globalCompositeOperation = 'source-over';
      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  return (
    <div className="w-full h-full relative overflow-hidden bg-[#04040f]">
      <canvas ref={canvasRef} className="w-full h-full cursor-crosshair" />
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-3 text-[10px] text-white/15 pointer-events-none select-none tracking-[0.2em] uppercase font-light">
        <span>Move to steer</span>
        <span className="w-px h-2.5 bg-white/10" />
        <span>Hold to warp</span>
      </div>
    </div>
  );
}
