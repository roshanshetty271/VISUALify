'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { beatClock } from '@/lib/utils/beatClock';

type BrushStyle = 'splash' | 'line' | 'dots';

interface Splash {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  hue: number;
  sat: number;
  lit: number;
  alpha: number;
  birth: number;
  onBeat: boolean;
  rings: number[];
}

const TWO_PI = Math.PI * 2;
const MAX_SPLASHES = 200;

const COLOR_PRESETS = [
  { id: 'auto', label: 'Auto', value: null },
  { id: 'white', label: '', value: { h: 0, s: 0, l: 95 } },
  { id: 'red', label: '', value: { h: 0, s: 80, l: 55 } },
  { id: 'orange', label: '', value: { h: 30, s: 85, l: 55 } },
  { id: 'yellow', label: '', value: { h: 50, s: 85, l: 60 } },
  { id: 'green', label: '', value: { h: 140, s: 70, l: 50 } },
  { id: 'cyan', label: '', value: { h: 185, s: 75, l: 55 } },
  { id: 'blue', label: '', value: { h: 220, s: 80, l: 60 } },
  { id: 'purple', label: '', value: { h: 270, s: 75, l: 60 } },
  { id: 'pink', label: '', value: { h: 330, s: 80, l: 65 } },
] as const;

function getAutoHue(valence: number): number {
  if (valence < 0.3) return 220 + Math.random() * 40;
  if (valence > 0.7) return 10 + Math.random() * 40;
  return 140 + Math.random() * 80;
}

export function BeatCanvasMode() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const persistRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef(0);
  const splashesRef = useRef<Splash[]>([]);
  const lastFrameRef = useRef(performance.now());
  const lastBeatRef = useRef(-1);
  const brushRef = useRef({ active: false, x: 0, y: 0 });
  const prevPointsRef = useRef<{ x: number; y: number }[]>([]);
  const [canSave, setCanSave] = useState(false);
  const brandingDrawnRef = useRef(false);
  const hasInteractedRef = useRef(false);

  const [brushStyle, setBrushStyle] = useState<BrushStyle>('splash');
  const [colorId, setColorId] = useState('auto');
  const [brushSize, setBrushSize] = useState(2); // 1=S, 2=M, 3=L

  const brushStyleRef = useRef<BrushStyle>('splash');
  const colorIdRef = useRef('auto');
  const brushSizeRef = useRef(2);

  useEffect(() => { brushStyleRef.current = brushStyle; }, [brushStyle]);
  useEffect(() => { colorIdRef.current = colorId; }, [colorId]);
  useEffect(() => { brushSizeRef.current = brushSize; }, [brushSize]);

  const getColor = useCallback((): { h: number; s: number; l: number } => {
    const preset = COLOR_PRESETS.find(c => c.id === colorIdRef.current);
    if (preset?.value) return { ...preset.value };
    const { audioFeatures } = usePlayerStore.getState();
    const valence = audioFeatures?.valence ?? 0.5;
    return { h: getAutoHue(valence), s: 60 + Math.random() * 20, l: 50 + Math.random() * 15 };
  }, []);

  const getSizeMultiplier = useCallback((): number => {
    const s = brushSizeRef.current;
    return s === 1 ? 0.5 : s === 3 ? 1.8 : 1;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const persist = persistRef.current;
    if (!canvas || !persist) return;
    const resize = () => {
      const p = canvas.parentElement;
      if (!p) return;
      const w = p.clientWidth;
      const h = p.clientHeight;
      canvas.width = w; canvas.height = h;
      persist.width = w; persist.height = h;
      brandingDrawnRef.current = false;
    };
    resize();

    const drawBranding = () => {
      if (brandingDrawnRef.current) return;
      const pCtx = persist.getContext('2d');
      if (!pCtx || persist.width === 0) return;
      brandingDrawnRef.current = true;
      const cx = persist.width / 2;
      const cy = persist.height / 2;
      pCtx.save();
      pCtx.textAlign = 'center';
      pCtx.textBaseline = 'middle';
      pCtx.font = '800 120px "Inter", system-ui, sans-serif';
      pCtx.fillStyle = 'rgba(255, 255, 255, 0.04)';
      pCtx.fillText('VISUALify', cx, cy - 20);
      pCtx.font = '400 18px "Inter", system-ui, sans-serif';
      pCtx.fillStyle = 'rgba(255, 255, 255, 0.03)';
      pCtx.fillText('tap anywhere to paint', cx, cy + 50);
      pCtx.restore();
    };
    drawBranding();

    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  const clearBrandingOnce = useCallback(() => {
    if (hasInteractedRef.current) return;
    hasInteractedRef.current = true;
    const persist = persistRef.current;
    const pCtx = persist?.getContext('2d');
    if (persist && pCtx) {
      pCtx.clearRect(0, 0, persist.width, persist.height);
    }
  }, []);

  const addSplash = useCallback((x: number, y: number, size: number) => {
    clearBrandingOnce();
    const tempo = usePlayerStore.getState().audioFeatures?.tempo ?? 120;
    const kick = beatClock.kick(tempo);
    const onBeat = kick > 0.3;
    const color = getColor();
    const mult = getSizeMultiplier();

    const splash: Splash = {
      x, y,
      radius: 0,
      maxRadius: (onBeat ? size * 2.5 : size) * (0.9 + Math.random() * 0.5) * mult,
      hue: color.h,
      sat: color.s,
      lit: color.l,
      alpha: onBeat ? 0.9 : 0.55,
      birth: beatClock.now,
      onBeat,
      rings: [],
    };

    splashesRef.current.push(splash);
    if (splashesRef.current.length > MAX_SPLASHES) splashesRef.current.shift();
    setCanSave(true);
  }, [getColor, getSizeMultiplier, clearBrandingOnce]);

  const drawLineSegment = useCallback((x1: number, y1: number, x2: number, y2: number) => {
    clearBrandingOnce();
    const persist = persistRef.current;
    const pCtx = persist?.getContext('2d');
    if (!pCtx || !persist) return;

    const color = getColor();
    const mult = getSizeMultiplier();
    const tempo = usePlayerStore.getState().audioFeatures?.tempo ?? 120;
    const kick = beatClock.kick(tempo);
    const baseWidth = (3 + kick * 4) * mult;

    pCtx.globalCompositeOperation = 'lighter';

    // Outer glow
    pCtx.beginPath();
    pCtx.moveTo(x1, y1);
    pCtx.lineTo(x2, y2);
    pCtx.strokeStyle = `hsla(${color.h}, ${color.s}%, ${color.l}%, 0.08)`;
    pCtx.lineWidth = baseWidth * 8;
    pCtx.lineCap = 'round';
    pCtx.lineJoin = 'round';
    pCtx.stroke();

    // Mid glow
    pCtx.beginPath();
    pCtx.moveTo(x1, y1);
    pCtx.lineTo(x2, y2);
    pCtx.strokeStyle = `hsla(${color.h}, ${color.s}%, ${color.l}%, 0.2)`;
    pCtx.lineWidth = baseWidth * 4;
    pCtx.lineCap = 'round';
    pCtx.lineJoin = 'round';
    pCtx.stroke();

    // Inner glow
    pCtx.beginPath();
    pCtx.moveTo(x1, y1);
    pCtx.lineTo(x2, y2);
    pCtx.strokeStyle = `hsla(${color.h}, ${color.s}%, ${color.l + 10}%, 0.4)`;
    pCtx.lineWidth = baseWidth * 2;
    pCtx.lineCap = 'round';
    pCtx.lineJoin = 'round';
    pCtx.stroke();

    // Core line
    pCtx.beginPath();
    pCtx.moveTo(x1, y1);
    pCtx.lineTo(x2, y2);
    pCtx.strokeStyle = `hsla(${color.h}, ${color.s}%, ${Math.min(color.l + 25, 95)}%, 0.8)`;
    pCtx.lineWidth = baseWidth;
    pCtx.lineCap = 'round';
    pCtx.lineJoin = 'round';
    pCtx.stroke();

    pCtx.globalCompositeOperation = 'source-over';
    setCanSave(true);
  }, [getColor, getSizeMultiplier, clearBrandingOnce]);

  const drawDot = useCallback((x: number, y: number) => {
    clearBrandingOnce();
    const persist = persistRef.current;
    const pCtx = persist?.getContext('2d');
    if (!pCtx || !persist) return;

    const color = getColor();
    const mult = getSizeMultiplier();
    const tempo = usePlayerStore.getState().audioFeatures?.tempo ?? 120;
    const kick = beatClock.kick(tempo);
    const r = (3 + kick * 5 + Math.random() * 3) * mult;

    pCtx.globalCompositeOperation = 'lighter';

    // Outer glow
    const outerGrad = pCtx.createRadialGradient(x, y, 0, x, y, r * 6);
    outerGrad.addColorStop(0, `hsla(${color.h}, ${color.s}%, ${color.l}%, 0.12)`);
    outerGrad.addColorStop(0.5, `hsla(${color.h}, ${color.s}%, ${color.l}%, 0.04)`);
    outerGrad.addColorStop(1, 'transparent');
    pCtx.fillStyle = outerGrad;
    pCtx.beginPath();
    pCtx.arc(x, y, r * 6, 0, TWO_PI);
    pCtx.fill();

    // Inner glow
    const innerGrad = pCtx.createRadialGradient(x, y, 0, x, y, r * 3);
    innerGrad.addColorStop(0, `hsla(${color.h}, ${color.s}%, ${color.l}%, 0.35)`);
    innerGrad.addColorStop(1, 'transparent');
    pCtx.fillStyle = innerGrad;
    pCtx.beginPath();
    pCtx.arc(x, y, r * 3, 0, TWO_PI);
    pCtx.fill();

    // Core dot
    pCtx.beginPath();
    pCtx.arc(x, y, r, 0, TWO_PI);
    pCtx.fillStyle = `hsla(${color.h}, ${color.s}%, ${Math.min(color.l + 20, 95)}%, 0.85)`;
    pCtx.fill();

    pCtx.globalCompositeOperation = 'source-over';
    setCanSave(true);
  }, [getColor, getSizeMultiplier, clearBrandingOnce]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const getPos = (e: MouseEvent | Touch) => {
      const r = canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };

    const onDown = (e: MouseEvent) => {
      const p = getPos(e);
      brushRef.current = { active: true, x: p.x, y: p.y };
      prevPointsRef.current = [p];

      const style = brushStyleRef.current;
      if (style === 'splash') {
        addSplash(p.x, p.y, 100 + Math.random() * 60);
      } else if (style === 'dots') {
        drawDot(p.x, p.y);
      }
    };

    const onMove = (e: MouseEvent) => {
      if (!brushRef.current.active) return;
      const p = getPos(e);
      const prev = brushRef.current;
      const dx = p.x - prev.x;
      const dy = p.y - prev.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      const style = brushStyleRef.current;

      if (style === 'line') {
        if (dist > 2) {
          drawLineSegment(prev.x, prev.y, p.x, p.y);
          brushRef.current.x = p.x;
          brushRef.current.y = p.y;
        }
      } else if (style === 'dots') {
        if (dist > 12) {
          drawDot(p.x, p.y);
          brushRef.current.x = p.x;
          brushRef.current.y = p.y;
        }
      } else {
        if (dist > 20) {
          brushRef.current.x = p.x;
          brushRef.current.y = p.y;
          addSplash(p.x, p.y, 40 + Math.random() * 35);
        }
      }
    };

    const onUp = () => {
      brushRef.current.active = false;
      prevPointsRef.current = [];
    };

    const onTouchStart = (e: TouchEvent) => {
      const p = getPos(e.touches[0]);
      brushRef.current = { active: true, x: p.x, y: p.y };
      prevPointsRef.current = [p];
      const style = brushStyleRef.current;
      if (style === 'splash') addSplash(p.x, p.y, 100 + Math.random() * 60);
      else if (style === 'dots') drawDot(p.x, p.y);
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!brushRef.current.active) return;
      const p = getPos(e.touches[0]);
      const prev = brushRef.current;
      const dx = p.x - prev.x;
      const dy = p.y - prev.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const style = brushStyleRef.current;

      if (style === 'line') {
        if (dist > 2) {
          drawLineSegment(prev.x, prev.y, p.x, p.y);
          brushRef.current.x = p.x;
          brushRef.current.y = p.y;
        }
      } else if (style === 'dots') {
        if (dist > 12) {
          drawDot(p.x, p.y);
          brushRef.current.x = p.x;
          brushRef.current.y = p.y;
        }
      } else {
        if (dist * dist > 400) {
          brushRef.current.x = p.x;
          brushRef.current.y = p.y;
          addSplash(p.x, p.y, 25 + Math.random() * 20);
        }
      }
    };

    const onTouchEnd = () => {
      brushRef.current.active = false;
      prevPointsRef.current = [];
    };

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
  }, [addSplash, drawLineSegment, drawDot]);

  useEffect(() => {
    const animate = () => {
      const canvas = canvasRef.current;
      const persist = persistRef.current;
      const ctx = canvas?.getContext('2d');
      const pCtx = persist?.getContext('2d');
      if (!canvas || !persist || !ctx || !pCtx) {
        animRef.current = requestAnimationFrame(animate);
        return;
      }

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
      const kick = beatClock.kick(tempo);
      const beat = beatClock.beatIndex(tempo);

      if (beat !== lastBeatRef.current && isPlaying) {
        lastBeatRef.current = beat;
        for (const s of splashesRef.current) {
          if (s.rings.length < 5 && s.alpha > 0.05) {
            s.rings.push(s.radius);
          }
        }
      }

      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(persist, 0, 0);

      if (kick > 0.3) {
        ctx.fillStyle = `rgba(200, 220, 255, ${Math.min(0.05, (kick - 0.5) * 0.03 * energy * glowIntensity)})`;
        ctx.fillRect(0, 0, w, h);
      }

      const time = beatClock.now;

      for (let i = splashesRef.current.length - 1; i >= 0; i--) {
        const s = splashesRef.current[i];
        const age = time - s.birth;

        if (s.radius < s.maxRadius) {
          s.radius += (s.maxRadius - s.radius) * 0.08 * animationSpeed;
        }

        const breathe = 1 + kick * 0.05 * energy;
        const drawR = s.radius * breathe;

        s.alpha *= 0.9995;

        if (s.alpha < 0.01) {
          const grad = pCtx.createRadialGradient(s.x, s.y, 0, s.x, s.y, drawR);
          grad.addColorStop(0, `hsla(${s.hue}, ${s.sat}%, ${s.lit}%, 0.03)`);
          grad.addColorStop(0.4, `hsla(${s.hue}, ${s.sat}%, ${s.lit}%, 0.015)`);
          grad.addColorStop(1, 'transparent');
          pCtx.globalCompositeOperation = 'lighter';
          pCtx.fillStyle = grad;
          pCtx.beginPath();
          pCtx.arc(s.x, s.y, drawR, 0, TWO_PI);
          pCtx.fill();
          pCtx.globalCompositeOperation = 'source-over';
          splashesRef.current.splice(i, 1);
          continue;
        }

        ctx.globalCompositeOperation = 'lighter';
        const grad = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, drawR);
        const a = s.alpha * glowIntensity;
        grad.addColorStop(0, `hsla(${s.hue}, ${s.sat + 10}%, ${s.lit + 15}%, ${a})`);
        grad.addColorStop(0.25, `hsla(${s.hue}, ${s.sat}%, ${s.lit + 5}%, ${a * 0.6})`);
        grad.addColorStop(0.6, `hsla(${s.hue}, ${s.sat - 5}%, ${s.lit}%, ${a * 0.2})`);
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(s.x, s.y, drawR, 0, TWO_PI);
        ctx.fill();

        if (age < 0.5) {
          const coreA = (1 - age * 2) * s.alpha * 0.8;
          ctx.beginPath();
          ctx.arc(s.x, s.y, drawR * 0.1, 0, TWO_PI);
          ctx.fillStyle = `rgba(255, 255, 255, ${coreA})`;
          ctx.fill();
        }

        for (let r = s.rings.length - 1; r >= 0; r--) {
          s.rings[r] += 1.5 * animationSpeed;
          const ringR = s.rings[r];
          const ringLife = 1 - (ringR - s.radius) / (s.maxRadius * 0.8);
          if (ringLife <= 0) { s.rings.splice(r, 1); continue; }
          ctx.beginPath();
          ctx.arc(s.x, s.y, ringR, 0, TWO_PI);
          ctx.strokeStyle = `hsla(${s.hue}, ${s.sat}%, ${s.lit + 15}%, ${ringLife * 0.15 * s.alpha * glowIntensity})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }

        if (s.onBeat && age < 1) {
          const sparkleA = (1 - age) * 0.4 * s.alpha;
          for (let sp = 0; sp < 4; sp++) {
            const angle = (sp / 4) * TWO_PI + age * 2;
            const dist = drawR * 0.4 * age;
            ctx.beginPath();
            ctx.arc(s.x + Math.cos(angle) * dist, s.y + Math.sin(angle) * dist, 1.5, 0, TWO_PI);
            ctx.fillStyle = `rgba(255, 255, 255, ${sparkleA})`;
            ctx.fill();
          }
        }
      }

      ctx.globalCompositeOperation = 'source-over';
      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  const handleSave = useCallback(() => {
    const canvas = canvasRef.current;
    const persist = persistRef.current;
    if (!canvas || !persist) return;
    const exp = document.createElement('canvas');
    exp.width = canvas.width;
    exp.height = canvas.height;
    const eCtx = exp.getContext('2d');
    if (!eCtx) return;
    eCtx.fillStyle = '#06060c';
    eCtx.fillRect(0, 0, exp.width, exp.height);
    eCtx.drawImage(persist, 0, 0);
    eCtx.drawImage(canvas, 0, 0);
    const link = document.createElement('a');
    link.download = `visualify-canvas-${Date.now()}.png`;
    link.href = exp.toDataURL('image/png');
    link.click();
  }, []);

  const handleClear = useCallback(() => {
    const persist = persistRef.current;
    const pCtx = persist?.getContext('2d');
    if (persist && pCtx) pCtx.clearRect(0, 0, persist.width, persist.height);
    splashesRef.current = [];
    setCanSave(false);
    brandingDrawnRef.current = false;
    // Redraw branding
    if (persist) {
      const cx = persist.width / 2;
      const cy = persist.height / 2;
      const pc = persist.getContext('2d');
      if (pc) {
        pc.save();
        pc.textAlign = 'center';
        pc.textBaseline = 'middle';
        pc.font = '800 120px "Inter", system-ui, sans-serif';
        pc.fillStyle = 'rgba(255, 255, 255, 0.04)';
        pc.fillText('VISUALify', cx, cy - 20);
        pc.font = '400 18px "Inter", system-ui, sans-serif';
        pc.fillStyle = 'rgba(255, 255, 255, 0.03)';
        pc.fillText('tap anywhere to paint', cx, cy + 50);
        pc.restore();
        brandingDrawnRef.current = true;
      }
    }
  }, []);



  return (
    <div className="w-full h-full relative overflow-hidden bg-[#06060c]">
      <canvas ref={persistRef} className="absolute inset-0 w-full h-full pointer-events-none" />
      <canvas ref={canvasRef} className="w-full h-full cursor-crosshair relative z-[1]" />

      {/* Toolbar */}
      <div className="absolute top-20 right-4 z-10 flex flex-col gap-2.5">
        {/* Brush style */}
        <div className="flex flex-col gap-1 p-1.5 bg-white/[0.05] backdrop-blur-xl rounded-xl border border-white/[0.08]">
          {(['splash', 'line', 'dots'] as BrushStyle[]).map((s) => (
            <button
              key={s}
              onClick={() => setBrushStyle(s)}
              className={`px-2.5 py-1.5 rounded-lg text-[10px] font-medium tracking-wide transition-all duration-150 ${brushStyle === s
                  ? 'bg-[#1DB954] text-black'
                  : 'text-zinc-500 hover:text-white hover:bg-white/[0.08]'
                }`}
            >
              {s === 'splash' ? 'Splash' : s === 'line' ? 'Line' : 'Dots'}
            </button>
          ))}
        </div>

        {/* Color palette */}
        <div className="flex flex-col gap-1.5 p-1.5 bg-white/[0.05] backdrop-blur-xl rounded-xl border border-white/[0.08]">
          <span className="text-[8px] text-white/20 uppercase tracking-widest text-center">Color</span>
          <div className="grid grid-cols-2 gap-1">
            {COLOR_PRESETS.map((c) => (
              <button
                key={c.id}
                onClick={() => setColorId(c.id)}
                className={`w-6 h-6 rounded-md border transition-all duration-150 ${colorId === c.id
                    ? 'border-white scale-110 shadow-[0_0_8px_rgba(255,255,255,0.3)]'
                    : 'border-white/10 hover:border-white/30'
                  }`}
                style={{
                  background: c.value
                    ? `hsl(${c.value.h}, ${c.value.s}%, ${c.value.l}%)`
                    : 'conic-gradient(from 0deg, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)',
                }}
                title={c.id === 'auto' ? 'Music-reactive' : c.id}
              />
            ))}
          </div>
        </div>

        {/* Brush size */}
        <div className="flex gap-1 p-1.5 bg-white/[0.05] backdrop-blur-xl rounded-xl border border-white/[0.08]">
          {[1, 2, 3].map((s) => (
            <button
              key={s}
              onClick={() => setBrushSize(s)}
              className={`flex-1 flex items-center justify-center py-1 rounded-md transition-all duration-150 ${brushSize === s
                  ? 'bg-white/15 text-white'
                  : 'text-zinc-600 hover:text-white hover:bg-white/[0.06]'
                }`}
            >
              <div
                className="rounded-full bg-current"
                style={{ width: s * 4 + 2, height: s * 4 + 2 }}
              />
            </button>
          ))}
        </div>

        {/* Save/Clear */}
        {canSave && (
          <>
            <button
              onClick={handleSave}
              className="px-3 py-2 rounded-xl bg-white/[0.06] backdrop-blur-xl border border-white/[0.08] text-[10px] text-white/50 hover:text-white hover:bg-white/[0.1] transition-all tracking-widest uppercase"
            >
              Save
            </button>
            <button
              onClick={handleClear}
              className="px-3 py-2 rounded-xl bg-white/[0.06] backdrop-blur-xl border border-white/[0.08] text-[10px] text-white/50 hover:text-white hover:bg-white/[0.1] transition-all tracking-widest uppercase"
            >
              Clear
            </button>
          </>
        )}
      </div>

      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-3 text-[10px] text-white/15 pointer-events-none select-none tracking-[0.2em] uppercase font-light">
        <span>Click to splash</span>
        <span className="w-px h-2.5 bg-white/10" />
        <span>Drag to paint</span>
        <span className="w-px h-2.5 bg-white/10" />
        <span>Tap on beat for bigger splashes</span>
      </div>
    </div>
  );
}
