'use client';

import { useEffect, useRef, useState } from 'react';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { beatClock } from '@/lib/utils/beatClock';

const STRING_COUNT = 6;
const POINTS_PER_STRING = 48;
const STIFFNESS = 0.35;
const DAMPING = 0.88;
const MAX_VY = 10;
const TWO_PI = Math.PI * 2;

type ScaleId = 'guitar' | 'pentatonic' | 'blues';

const SCALES: Record<ScaleId, { label: string; freqs: number[] }> = {
  guitar: { label: 'Guitar', freqs: [82.41, 110.0, 146.83, 196.0, 246.94, 329.63] },
  pentatonic: { label: 'Pentatonic', freqs: [261.63, 293.66, 329.63, 392.0, 440.0, 523.25] },
  blues: { label: 'Blues', freqs: [261.63, 311.13, 349.23, 369.99, 392.0, 466.16] },
};

interface StringPoint {
  x: number;
  y: number;
  restY: number;
  vy: number;
}

interface StringData {
  points: StringPoint[];
  hue: number;
  tension: number;
  pluckIntensity: number;
}

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  hue: number;
}

let audioCtx: AudioContext | null = null;

function getAudioCtx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function playNote(freq: number, intensity: number) {
  try {
    const ctx = getAudioCtx();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now);

    const gain = ctx.createGain();
    const vol = 0.15 + intensity * 0.25;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(vol, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(vol * 0.4, now + 0.15);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.85);
  } catch {
    // Audio not available
  }
}

function createString(y: number, w: number, index: number): StringData {
  const hueBase = (index / STRING_COUNT) * 280 + 180;
  const points: StringPoint[] = [];
  for (let i = 0; i < POINTS_PER_STRING; i++) {
    const x = (i / (POINTS_PER_STRING - 1)) * w;
    points.push({ x, y, restY: y, vy: 0 });
  }
  return {
    points,
    hue: hueBase % 360,
    tension: 0.8 + (index / STRING_COUNT) * 0.4,
    pluckIntensity: 0,
  };
}

export function StringMode() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef(0);
  const stringsRef = useRef<StringData[]>([]);
  const sparksRef = useRef<Spark[]>([]);
  const lastFrameRef = useRef(performance.now());
  const lastBeatRef = useRef(-1);
  const dragRef = useRef<{ active: boolean; stringIdx: number; pointIdx: number; lastY: number }>({
    active: false, stringIdx: -1, pointIdx: -1, lastY: 0,
  });
  const prevMouseRef = useRef({ x: 0, y: 0 });
  const scaleRef = useRef<ScaleId>('guitar');
  const [scale, setScale] = useState<ScaleId>('guitar');

  useEffect(() => { scaleRef.current = scale; }, [scale]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const p = canvas.parentElement;
      if (!p) return;
      const w = p.clientWidth;
      const h = p.clientHeight;
      canvas.width = w;
      canvas.height = h;

      const margin = h * 0.15;
      const spacing = (h - margin * 2) / (STRING_COUNT - 1);
      stringsRef.current = Array.from({ length: STRING_COUNT }, (_, i) =>
        createString(margin + i * spacing, w, i)
      );
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const findString = (mx: number, my: number): { si: number; pi: number } | null => {
      const strings = stringsRef.current;
      let bestDist = 30;
      let bestSi = -1;
      let bestPi = -1;

      for (let si = 0; si < strings.length; si++) {
        const pts = strings[si].points;
        for (let pi = 1; pi < pts.length - 1; pi++) {
          const dy = Math.abs(pts[pi].y - my);
          const dx = Math.abs(pts[pi].x - mx);
          if (dx < 15 && dy < bestDist) {
            bestDist = dy;
            bestSi = si;
            bestPi = pi;
          }
        }
      }

      return bestSi >= 0 ? { si: bestSi, pi: bestPi } : null;
    };

    const pluckAt = (si: number, pi: number, force: number) => {
      const s = stringsRef.current[si];
      if (!s) return;
      s.pluckIntensity = Math.min(1, s.pluckIntensity + 0.5);

      const freqs = SCALES[scaleRef.current].freqs;
      const freq = freqs[si % freqs.length];
      playNote(freq, force);

      const pt = s.points[pi];
      const sparkCount = Math.floor(6 + force * 12);
      for (let i = 0; i < sparkCount; i++) {
        sparksRef.current.push({
          x: pt.x,
          y: pt.y,
          vx: (Math.random() - 0.5) * 4,
          vy: -Math.random() * 5 - 1.5,
          life: 0.4 + Math.random() * 0.4,
          hue: s.hue,
        });
      }
    };

    const getPos = (e: MouseEvent | Touch) => {
      const r = canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };

    const onDown = (e: MouseEvent) => {
      const p = getPos(e);
      prevMouseRef.current = p;
      const hit = findString(p.x, p.y);
      if (hit) {
        dragRef.current = { active: true, stringIdx: hit.si, pointIdx: hit.pi, lastY: p.y };
      }
    };

    const onMove = (e: MouseEvent) => {
      const p = getPos(e);

      if (dragRef.current.active) {
        const s = stringsRef.current[dragRef.current.stringIdx];
        if (s) {
          const pt = s.points[dragRef.current.pointIdx];
          pt.y = p.y;
          const spread = 5;
          for (let d = 1; d <= spread; d++) {
            const factor = 1 - d / (spread + 1);
            const left = dragRef.current.pointIdx - d;
            const right = dragRef.current.pointIdx + d;
            if (left > 0) s.points[left].y = s.points[left].restY + (p.y - pt.restY) * factor;
            if (right < POINTS_PER_STRING - 1) s.points[right].y = s.points[right].restY + (p.y - pt.restY) * factor;
          }
        }
      } else {
        const prevY = prevMouseRef.current.y;
        const dy = p.y - prevY;
        if (Math.abs(dy) > 5) {
          for (let si = 0; si < stringsRef.current.length; si++) {
            const s = stringsRef.current[si];
            const stringY = s.points[Math.floor(POINTS_PER_STRING / 2)].restY;
            if ((prevY < stringY && p.y > stringY) || (prevY > stringY && p.y < stringY)) {
              let closestPi = 0;
              let closestDist = Infinity;
              for (let pi = 0; pi < s.points.length; pi++) {
                const d = Math.abs(s.points[pi].x - p.x);
                if (d < closestDist) { closestDist = d; closestPi = pi; }
              }
              if (closestPi > 0 && closestPi < POINTS_PER_STRING - 1) {
                const force = Math.min(Math.abs(dy) / 25, 1);
                s.points[closestPi].vy += dy * 0.15;
                pluckAt(si, closestPi, force);
              }
            }
          }
        }
      }
      prevMouseRef.current = p;
    };

    const onUp = () => {
      if (dragRef.current.active) {
        const s = stringsRef.current[dragRef.current.stringIdx];
        if (s) {
          const displacement = Math.abs(s.points[dragRef.current.pointIdx].y - s.points[dragRef.current.pointIdx].restY);
          pluckAt(dragRef.current.stringIdx, dragRef.current.pointIdx, Math.min(displacement / 50, 1));
        }
      }
      dragRef.current.active = false;
    };

    const onTouchStart = (e: TouchEvent) => {
      const p = getPos(e.touches[0]);
      prevMouseRef.current = p;
      const hit = findString(p.x, p.y);
      if (hit) {
        dragRef.current = { active: true, stringIdx: hit.si, pointIdx: hit.pi, lastY: p.y };
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      const fakeEvent = { clientX: e.touches[0].clientX, clientY: e.touches[0].clientY } as MouseEvent;
      onMove(fakeEvent);
    };

    const onTouchEnd = () => onUp();

    canvas.addEventListener('mousedown', onDown);
    canvas.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    canvas.addEventListener('touchstart', onTouchStart, { passive: true });
    canvas.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd);

    return () => {
      canvas.removeEventListener('mousedown', onDown);
      canvas.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
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

      const energy = audioFeatures?.energy ?? 0.5;
      const tempo = audioFeatures?.tempo ?? 120;
      const valence = audioFeatures?.valence ?? 0.5;
      const kick = beatClock.kick(tempo);
      const beat = beatClock.beatIndex(tempo);

      lastBeatRef.current = beat;

      const stiffnessMod = STIFFNESS;

      for (let si = 0; si < stringsRef.current.length; si++) {
        const s = stringsRef.current[si];
        const pts = s.points;

        for (let i = 1; i < pts.length - 1; i++) {
          if (dragRef.current.active && dragRef.current.stringIdx === si) {
            if (Math.abs(i - dragRef.current.pointIdx) <= 5) continue;
          }

          const left = pts[i - 1].y;
          const right = pts[i + 1].y;
          const avg = (left + right) / 2;
          const displacement = avg - pts[i].y;
          const restPull = (pts[i].restY - pts[i].y) * 0.12;

          pts[i].vy += (displacement * stiffnessMod * s.tension + restPull);
          pts[i].vy *= DAMPING;
          pts[i].vy = Math.max(-MAX_VY, Math.min(MAX_VY, pts[i].vy));
          pts[i].y += pts[i].vy;

          if (Math.abs(pts[i].y - pts[i].restY) < 0.3 && Math.abs(pts[i].vy) < 0.15) {
            pts[i].y = pts[i].restY;
            pts[i].vy = 0;
          }
        }

        s.pluckIntensity *= 0.96;
      }

      // --- Render ---
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = '#08080f';
      ctx.fillRect(0, 0, w, h);

      for (const s of stringsRef.current) {
        const pts = s.points;
        const hue = s.hue + valence * 30;
        let maxDisp = 0;
        for (let i = 0; i < pts.length; i++) {
          const d = Math.abs(pts[i].y - pts[i].restY);
          if (d > maxDisp) maxDisp = d;
        }
        const vibration = Math.min(maxDisp / 30, 1);
        const baseAlpha = 0.5 + vibration * 0.5 + kick * 0.25;

        ctx.globalCompositeOperation = 'lighter';
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length - 1; i += 2) {
          const cp = pts[i];
          const next = pts[Math.min(i + 1, pts.length - 1)];
          ctx.quadraticCurveTo(cp.x, cp.y, next.x, next.y);
        }
        ctx.strokeStyle = `hsla(${hue}, 80%, 60%, ${baseAlpha * 0.25 * glowIntensity})`;
        ctx.lineWidth = 14 + vibration * 12;
        ctx.lineCap = 'round';
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length - 1; i += 2) {
          const cp = pts[i];
          const next = pts[Math.min(i + 1, pts.length - 1)];
          ctx.quadraticCurveTo(cp.x, cp.y, next.x, next.y);
        }
        ctx.strokeStyle = `hsla(${hue}, 70%, 70%, ${baseAlpha * 0.55})`;
        ctx.lineWidth = 3.5 + vibration * 2.5;
        ctx.stroke();

        ctx.globalCompositeOperation = 'source-over';
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length - 1; i += 2) {
          const cp = pts[i];
          const next = pts[Math.min(i + 1, pts.length - 1)];
          ctx.quadraticCurveTo(cp.x, cp.y, next.x, next.y);
        }
        ctx.strokeStyle = `hsla(${hue}, 30%, 92%, ${baseAlpha * 0.85})`;
        ctx.lineWidth = 1 + vibration * 0.5;
        ctx.stroke();

        for (const end of [pts[0], pts[pts.length - 1]]) {
          ctx.globalCompositeOperation = 'lighter';
          ctx.beginPath();
          ctx.arc(end.x, end.y, 3 + kick, 0, TWO_PI);
          ctx.fillStyle = `hsla(${hue}, 50%, 60%, ${0.25 * glowIntensity})`;
          ctx.fill();
          ctx.globalCompositeOperation = 'source-over';
          ctx.beginPath();
          ctx.arc(end.x, end.y, 2, 0, TWO_PI);
          ctx.fillStyle = `hsla(${hue}, 30%, 80%, 0.5)`;
          ctx.fill();
        }
      }

      ctx.globalCompositeOperation = 'lighter';
      for (let i = sparksRef.current.length - 1; i >= 0; i--) {
        const sp = sparksRef.current[i];
        sp.x += sp.vx;
        sp.y += sp.vy;
        sp.vy += 0.08;
        sp.life -= dt * 2;

        if (sp.life <= 0) {
          sparksRef.current.splice(i, 1);
          continue;
        }

        const alpha = sp.life * 0.6;
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, 1.5 * sp.life, 0, TWO_PI);
        ctx.fillStyle = `hsla(${sp.hue}, 90%, 80%, ${Math.min(1, alpha * 1.3 * glowIntensity)})`;
        ctx.fill();
      }

      if (kick > 0.6) {
        const fa = (kick - 0.6) * 0.03 * energy * glowIntensity;
        ctx.fillStyle = `rgba(200, 220, 255, ${Math.min(0.04, fa)})`;
        ctx.fillRect(0, 0, w, h);
      }

      ctx.globalCompositeOperation = 'source-over';
      const vg = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.7);
      vg.addColorStop(0, 'transparent');
      vg.addColorStop(1, 'rgba(0, 0, 0, 0.3)');
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, w, h);

      ctx.globalCompositeOperation = 'source-over';
      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  return (
    <div className="w-full h-full relative overflow-hidden bg-[#08080f]">
      <canvas ref={canvasRef} className="w-full h-full cursor-pointer" />

      {/* Scale selector */}
      <div className="absolute bottom-14 right-4 z-10 flex gap-1.5 p-1 bg-white/[0.05] backdrop-blur-xl rounded-lg border border-white/[0.08]">
        {(Object.keys(SCALES) as ScaleId[]).map((id) => (
          <button
            key={id}
            onClick={() => setScale(id)}
            className={`px-2.5 py-1 rounded-md text-[10px] font-medium tracking-wide transition-all duration-200 ${
              scale === id
                ? 'bg-[#1DB954] text-black'
                : 'text-zinc-500 hover:text-white hover:bg-white/[0.08]'
            }`}
          >
            {SCALES[id].label}
          </button>
        ))}
      </div>

      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-3 text-[10px] text-white/15 pointer-events-none select-none tracking-[0.2em] uppercase font-light">
        <span>Drag to pluck</span>
        <span className="w-px h-2.5 bg-white/10" />
        <span>Swipe across to strum</span>
        <span className="w-px h-2.5 bg-white/10" />
        <span>Strings play real notes</span>
      </div>
    </div>
  );
}
