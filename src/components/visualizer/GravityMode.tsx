'use client';

import { useEffect, useRef } from 'react';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { beatClock } from '@/lib/utils/beatClock';
import { interpolateHsl } from 'd3-interpolate';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  hue: number;
  size: number;
}

interface Well {
  x: number;
  y: number;
  strength: number;
  type: 'attract' | 'repel';
  age: number;
  id: number;
}

const PARTICLE_COUNT = 500;
const MAX_WELLS = 10;
const TWO_PI = Math.PI * 2;
const WELL_DECAY = 0.996;

function makeParticle(cx: number, cy: number, spread: number): Particle {
  const angle = Math.random() * TWO_PI;
  const dist = Math.random() * spread;
  return {
    x: cx + Math.cos(angle) * dist,
    y: cy + Math.sin(angle) * dist,
    vx: (Math.random() - 0.5) * 0.8,
    vy: (Math.random() - 0.5) * 0.8,
    life: 1,
    maxLife: 200 + Math.random() * 300,
    hue: Math.random(),
    size: 0.8 + Math.random() * 1.5,
  };
}

export function GravityMode() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef(0);
  const particlesRef = useRef<Particle[]>([]);
  const wellsRef = useRef<Well[]>([]);
  const wellIdRef = useRef(0);
  const lastFrameRef = useRef(performance.now());
  const lastBeatRef = useRef(-1);
  const mouseRef = useRef({ x: 0, y: 0, down: false, rightDown: false });
  const dragWellRef = useRef<number | null>(null);

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

    const cx = (canvas.parentElement?.clientWidth ?? 800) / 2;
    const cy = (canvas.parentElement?.clientHeight ?? 600) / 2;
    particlesRef.current = Array.from({ length: PARTICLE_COUNT }, () => makeParticle(cx, cy, 150));
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const getPos = (e: MouseEvent | Touch) => {
      const r = canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };

    const findWellAt = (x: number, y: number): number | null => {
      for (const w of wellsRef.current) {
        const dx = w.x - x, dy = w.y - y;
        if (dx * dx + dy * dy < 900) return w.id;
      }
      return null;
    };

    const onMouseMove = (e: MouseEvent) => {
      const p = getPos(e);
      mouseRef.current.x = p.x;
      mouseRef.current.y = p.y;
      if (dragWellRef.current !== null) {
        const w = wellsRef.current.find(w => w.id === dragWellRef.current);
        if (w) { w.x = p.x; w.y = p.y; }
      }
    };

    const onMouseDown = (e: MouseEvent) => {
      const p = getPos(e);
      mouseRef.current.x = p.x;
      mouseRef.current.y = p.y;

      // Check if clicking an existing well to drag
      const existingId = findWellAt(p.x, p.y);
      if (existingId !== null) {
        dragWellRef.current = existingId;
        return;
      }

      const isRight = e.button === 2;
      if (wellsRef.current.length < MAX_WELLS) {
        const id = wellIdRef.current++;
        wellsRef.current.push({
          x: p.x, y: p.y,
          strength: isRight ? -2.5 : 2.5,
          type: isRight ? 'repel' : 'attract',
          age: 0,
          id,
        });
      }
    };

    const onMouseUp = () => {
      mouseRef.current.down = false;
      dragWellRef.current = null;
    };

    const onDblClick = (e: MouseEvent) => {
      const p = getPos(e);
      const id = findWellAt(p.x, p.y);
      if (id !== null) {
        wellsRef.current = wellsRef.current.filter(w => w.id !== id);
      }
    };

    const onTouchStart = (e: TouchEvent) => {
      const t = e.touches[0];
      const p = getPos(t);
      mouseRef.current.x = p.x;
      mouseRef.current.y = p.y;

      const existingId = findWellAt(p.x, p.y);
      if (existingId !== null) {
        dragWellRef.current = existingId;
        return;
      }

      if (wellsRef.current.length < MAX_WELLS) {
        wellsRef.current.push({
          x: p.x, y: p.y, strength: 2.5, type: 'attract',
          age: 0, id: wellIdRef.current++,
        });
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      const p = getPos(e.touches[0]);
      mouseRef.current.x = p.x;
      mouseRef.current.y = p.y;
      if (dragWellRef.current !== null) {
        const w = wellsRef.current.find(w => w.id === dragWellRef.current);
        if (w) { w.x = p.x; w.y = p.y; }
      }
    };

    const onTouchEnd = () => { dragWellRef.current = null; };
    const block = (e: Event) => e.preventDefault();

    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('dblclick', onDblClick);
    canvas.addEventListener('touchstart', onTouchStart, { passive: true });
    canvas.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd);
    canvas.addEventListener('contextmenu', block);

    return () => {
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      canvas.removeEventListener('dblclick', onDblClick);
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      canvas.removeEventListener('contextmenu', block);
    };
  }, []);

  useEffect(() => {
    const colorBlend = (v: number, hue: number) => {
      const cool = `hsl(${210 + hue * 40}, 70%, 60%)`;
      const warm = `hsl(${20 + hue * 40}, 80%, 60%)`;
      return interpolateHsl(cool, warm)(v);
    };

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

      const energy = audioFeatures?.energy ?? 0.5;
      const tempo = audioFeatures?.tempo ?? 120;
      const valence = audioFeatures?.valence ?? 0.5;
      const kick = beatClock.kick(tempo);
      const beat = beatClock.beatIndex(tempo);

      // Beat burst: spawn particles from center
      const isBeat = beat !== lastBeatRef.current && isPlaying;
      if (isBeat) {
        lastBeatRef.current = beat;
        const burstCount = Math.floor(25 + energy * 35);
        for (let i = 0; i < burstCount; i++) {
          const angle = Math.random() * TWO_PI;
          const speed = 4 + energy * 10;
          const p = makeParticle(cx, cy, 20);
          p.vx = Math.cos(angle) * speed;
          p.vy = Math.sin(angle) * speed;
          p.size = 1.5 + Math.random() * 3;
          if (particlesRef.current.length < 800) {
            particlesRef.current.push(p);
          } else {
            const deadIdx = particlesRef.current.findIndex(pp => pp.life <= 0);
            if (deadIdx >= 0) particlesRef.current[deadIdx] = p;
          }
        }
      }

      // Clear with trail
      ctx.fillStyle = `rgba(6, 6, 12, ${0.2 + kick * 0.05})`;
      ctx.fillRect(0, 0, w, h);

      // Age wells
      for (const well of wellsRef.current) {
        well.age += dt;
        well.strength *= WELL_DECAY;
      }
      wellsRef.current = wellsRef.current.filter(w => Math.abs(w.strength) > 0.05);

      // --- Draw wells ---
      ctx.globalCompositeOperation = 'lighter';
      for (const well of wellsRef.current) {
        const pulse = 1 + kick * 0.3;
        const baseR = 40 * pulse;
        const absStr = Math.abs(well.strength);
        const isAttract = well.type === 'attract';
        const hue = isAttract ? 200 + valence * 60 : 0 + valence * 30;

        // Spiral arms / pulsing rings
        const time = beatClock.now;
        for (let ring = 0; ring < 3; ring++) {
          const r = baseR * (0.6 + ring * 0.5) + Math.sin(time * 3 + ring) * 5;
          const alpha = absStr * 0.08 * (1 - ring * 0.25) * glowIntensity;
          ctx.beginPath();
          ctx.arc(well.x, well.y, r, 0, TWO_PI);
          ctx.strokeStyle = `hsla(${hue}, 70%, 60%, ${alpha})`;
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }

        // Core glow
        const coreGrad = ctx.createRadialGradient(well.x, well.y, 0, well.x, well.y, baseR);
        coreGrad.addColorStop(0, `hsla(${hue}, 80%, 65%, ${Math.min(0.15, absStr * 0.06) * glowIntensity})`);
        coreGrad.addColorStop(0.5, `hsla(${hue}, 60%, 50%, ${Math.min(0.06, absStr * 0.02) * glowIntensity})`);
        coreGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = coreGrad;
        ctx.beginPath();
        ctx.arc(well.x, well.y, baseR, 0, TWO_PI);
        ctx.fill();

        // Center dot
        ctx.beginPath();
        ctx.arc(well.x, well.y, 2.5 + kick * 1.5, 0, TWO_PI);
        ctx.fillStyle = `hsla(${hue}, 90%, 80%, ${Math.min(0.5, absStr * 0.25)})`;
        ctx.fill();
      }

      // --- Update and draw particles ---
      ctx.globalCompositeOperation = 'lighter';

      for (let i = 0; i < particlesRef.current.length; i++) {
        const p = particlesRef.current[i];

        // Apply well forces
        for (const well of wellsRef.current) {
          const dx = well.x - p.x;
          const dy = well.y - p.y;
          const distSq = dx * dx + dy * dy;
          const dist = Math.sqrt(distSq) || 1;
          const minDist = 15;
          const eff = Math.max(dist, minDist);
          const force = well.strength * 500 / (eff * eff) * (0.5 + energy);
          p.vx += (dx / dist) * force * dt;
          p.vy += (dy / dist) * force * dt;
        }

        // Gentle center drift when no wells
        if (wellsRef.current.length === 0) {
          const dx = cx - p.x;
          const dy = cy - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          if (dist > 100) {
            p.vx += (dx / dist) * 0.1 * dt;
            p.vy += (dy / dist) * 0.1 * dt;
          }
        }

        const beatBoost = 1 + kick * 0.3 * energy;
        p.x += p.vx * beatBoost;
        p.y += p.vy * beatBoost;

        p.vx *= 0.992;
        p.vy *= 0.992;

        p.life -= 1 / p.maxLife;

        // Reset dead or OOB
        if (p.life <= 0 || p.x < -80 || p.x > w + 80 || p.y < -80 || p.y > h + 80) {
          particlesRef.current[i] = makeParticle(cx, cy, 100);
          continue;
        }

        const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        const alpha = Math.min(1, p.life * (0.5 + energy * 0.5 + Math.min(speed * 0.08, 0.5)));
        const size = p.size * (1 + kick * 0.3);
        const color = colorBlend(valence, p.hue);

        // Subtle glow for close particles only
        if (size > 1.5 && alpha > 0.4) {
          const gr = size * 3;
          const gg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, gr);
          gg.addColorStop(0, color.replace(')', `, ${alpha * 0.06 * glowIntensity})`).replace('rgb(', 'rgba('));
          gg.addColorStop(1, 'transparent');
          ctx.fillStyle = gg;
          ctx.beginPath();
          ctx.arc(p.x, p.y, gr, 0, TWO_PI);
          ctx.fill();
        }

        // Core
        ctx.beginPath();
        ctx.arc(p.x, p.y, size, 0, TWO_PI);
        ctx.fillStyle = color.replace(')', `, ${alpha})`).replace('rgb(', 'rgba(');
        ctx.fill();

        // Constellation lines to nearby particles (only check next ~20 for perf)
        const lineThreshold = 90 + energy * 60;
        const lineTSq = lineThreshold * lineThreshold;
        for (let j = i + 1; j < Math.min(i + 20, particlesRef.current.length); j++) {
          const q = particlesRef.current[j];
          const ddx = p.x - q.x, ddy = p.y - q.y;
          const dSq = ddx * ddx + ddy * ddy;
          if (dSq < lineTSq) {
            const lineAlpha = (1 - dSq / lineTSq) * 0.2 * alpha * glowIntensity;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.strokeStyle = `rgba(255, 255, 255, ${lineAlpha})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      // --- Beat flash (subtle) ---
      if (kick > 0.6) {
        const fa = (kick - 0.6) * 0.04 * energy * glowIntensity;
        ctx.fillStyle = `rgba(200, 220, 255, ${Math.min(0.04, fa)})`;
        ctx.fillRect(0, 0, w, h);
      }

      // --- Vignette ---
      ctx.globalCompositeOperation = 'source-over';
      const vg = ctx.createRadialGradient(cx, cy, Math.min(w, h) * 0.35, cx, cy, Math.max(w, h) * 0.7);
      vg.addColorStop(0, 'transparent');
      vg.addColorStop(1, 'rgba(0, 0, 0, 0.35)');
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, w, h);

      ctx.globalCompositeOperation = 'source-over';
      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  return (
    <div className="w-full h-full relative overflow-hidden bg-[#06060c]">
      <canvas ref={canvasRef} className="w-full h-full cursor-crosshair" />
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-3 text-[10px] text-white/15 pointer-events-none select-none tracking-[0.2em] uppercase font-light">
        <span>Click to attract</span>
        <span className="w-px h-2.5 bg-white/10" />
        <span>Right-click to repel</span>
        <span className="w-px h-2.5 bg-white/10" />
        <span>Drag to move</span>
        <span className="w-px h-2.5 bg-white/10" />
        <span>Double-click to remove</span>
      </div>
    </div>
  );
}
