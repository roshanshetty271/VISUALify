'use client';

import { useEffect, useRef, useCallback } from 'react';
import Matter from 'matter-js';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { beatClock } from '@/lib/utils/beatClock';
import { fetchLyrics, type SyncedLine } from '@/lib/utils/lrclib';

const LINE_FONT = '700 26px "Inter", system-ui, sans-serif';
const FALLBACK_FONT = '600 20px "Inter", system-ui, sans-serif';
const MAX_BODIES = 150;

interface LineMeta {
  text: string;
  hue: number;
  alpha: number;
  font: string;
}

export function LyricsMode() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef(0);
  const engineRef = useRef<Matter.Engine | null>(null);
  const lineMetaRef = useRef(new Map<number, LineMeta>());
  const lastFrameRef = useRef(performance.now());
  const lastBeatRef = useRef(-1);
  const lastLineRef = useRef(-1);
  const plainIdxRef = useRef(0);
  const lyricsRef = useRef<{ synced: SyncedLine[]; plain: string[] } | null>(null);
  const lyricsStatusRef = useRef<'idle' | 'loading' | 'loaded' | 'none'>('idle');
  const trackIdRef = useRef<string | null>(null);
  const fallbackLinesRef = useRef<string[]>([]);
  const fallbackIdxRef = useRef(0);
  const wallsRef = useRef<Matter.Body[]>([]);

  const setupWalls = useCallback((w: number, h: number) => {
    const engine = engineRef.current;
    if (!engine) return;

    for (const wall of wallsRef.current) {
      Matter.Composite.remove(engine.world, wall);
    }

    const t = 60;
    const walls = [
      Matter.Bodies.rectangle(w / 2, h + t / 2, w + t * 2, t, { isStatic: true }),
      Matter.Bodies.rectangle(-t / 2, h / 2, t, h + t * 2, { isStatic: true }),
      Matter.Bodies.rectangle(w + t / 2, h / 2, t, h + t * 2, { isStatic: true }),
    ];

    walls.forEach(wall => {
      wall.restitution = 0.7;
      wall.friction = 0.02;
    });

    Matter.Composite.add(engine.world, walls);
    wallsRef.current = walls;
  }, []);

  useEffect(() => {
    const engine = Matter.Engine.create({
      gravity: { x: 0, y: 0.4, scale: 0.001 },
    });
    engineRef.current = engine;
    return () => {
      Matter.Engine.clear(engine);
      engineRef.current = null;
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const p = canvas.parentElement;
      if (!p) return;
      canvas.width = p.clientWidth;
      canvas.height = p.clientHeight;
      setupWalls(canvas.width, canvas.height);
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [setupWalls]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const engine = engineRef.current;
    if (!canvas || !engine) return;

    const mouse = Matter.Mouse.create(canvas);
    const mc = Matter.MouseConstraint.create(engine, {
      mouse,
      constraint: {
        stiffness: 0.6,
        render: { visible: false },
      },
    });
    mouse.pixelRatio = 1;
    Matter.Composite.add(engine.world, mc);

    const onMouseDown = (e: MouseEvent) => {
      const r = canvas.getBoundingClientRect();
      const mx = e.clientX - r.left;
      const my = e.clientY - r.top;

      const bodies = Matter.Composite.allBodies(engine.world).filter(b => !b.isStatic);
      for (const b of bodies) {
        const dx = b.position.x - mx;
        const dy = b.position.y - my;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 350 && dist > 10) {
          const force = 0.012 * (1 - dist / 350);
          Matter.Body.applyForce(b, b.position, {
            x: (dx / dist) * force,
            y: (dy / dist) * force,
          });
        }
      }
    };

    canvas.addEventListener('mousedown', onMouseDown);
    return () => {
      canvas.removeEventListener('mousedown', onMouseDown);
      Matter.Composite.remove(engine.world, mc);
    };
  }, []);

  const spawnLine = useCallback((text: string, canvasW: number, canvasH: number, isLyric: boolean) => {
    const engine = engineRef.current;
    if (!engine) return;

    const { audioFeatures } = usePlayerStore.getState();
    const valence = audioFeatures?.valence ?? 0.5;

    const font = isLyric ? LINE_FONT : FALLBACK_FONT;
    const fontSize = isLyric ? 26 : 20;
    const measure = document.createElement('canvas').getContext('2d');
    if (!measure) return;
    measure.font = font;
    const textW = Math.min(measure.measureText(text).width + 24, canvasW * 0.85);
    const textH = fontSize + 18;

    const x = canvasW * 0.2 + Math.random() * canvasW * 0.6;
    const y = -textH;

    const body = Matter.Bodies.rectangle(x, y, textW, textH, {
      restitution: 0.7,
      friction: 0.05,
      frictionAir: 0.003,
      density: 0.0008,
      chamfer: { radius: 6 },
    });

    Matter.Body.setVelocity(body, {
      x: (Math.random() - 0.5) * 2,
      y: 1 + Math.random() * 2,
    });

    const hue = valence < 0.3 ? 200 + Math.random() * 60
      : valence > 0.7 ? 20 + Math.random() * 40
        : 100 + Math.random() * 100;

    lineMetaRef.current.set(body.id, { text, hue, alpha: 1, font });
    Matter.Composite.add(engine.world, body);

    // Remove oldest if over limit
    const allBodies = Matter.Composite.allBodies(engine.world).filter(b => !b.isStatic);
    while (allBodies.length > MAX_BODIES) {
      const oldest = allBodies.shift()!;
      Matter.Composite.remove(engine.world, oldest);
      lineMetaRef.current.delete(oldest.id);
    }
  }, []);

  useEffect(() => {
    const animate = () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      const engine = engineRef.current;
      if (!canvas || !ctx || !engine) {
        animRef.current = requestAnimationFrame(animate);
        return;
      }

      const now = performance.now();
      const rawDt = Math.min((now - lastFrameRef.current) / 1000, 0.05);
      lastFrameRef.current = now;

      const store = usePlayerStore.getState();
      const { animationSpeed } = useSettingsStore.getState();
      const { audioFeatures, isPlaying, currentTrack, progress } = store;

      const dt = rawDt * animationSpeed;
      beatClock.tick(dt, isPlaying);
      Matter.Engine.update(engine, dt * 1000);

      const w = canvas.width;
      const h = canvas.height;
      if (w === 0 || h === 0) { animRef.current = requestAnimationFrame(animate); return; }

      const energy = audioFeatures?.energy ?? 0.5;
      const tempo = audioFeatures?.tempo ?? 120;
      const kick = beatClock.kick(tempo);
      const beat = beatClock.beatIndex(tempo);

      // --- Fetch lyrics on track change ---
      if (currentTrack && currentTrack.id !== trackIdRef.current) {
        trackIdRef.current = currentTrack.id;
        lastLineRef.current = -1;
        plainIdxRef.current = 0;
        lyricsRef.current = null;
        lyricsStatusRef.current = 'loading';

        // Clear all old lyrics from previous song
        const oldBodies = Matter.Composite.allBodies(engine.world).filter(b => !b.isStatic);
        for (const b of oldBodies) {
          Matter.Composite.remove(engine.world, b);
        }
        lineMetaRef.current.clear();

        const trackLines = [
          currentTrack.name ?? '',
          currentTrack.artist ?? '',
          currentTrack.albumName ?? '',
        ].filter(l => l.length > 0);

        const recentLines = (store.recentTracks ?? [])
          .slice(0, 5)
          .map(t => `${t.name ?? ''} - ${t.artist ?? ''}`)
          .filter(l => l.length > 3);

        fallbackLinesRef.current = [...trackLines, ...recentLines];
        if (fallbackLinesRef.current.length === 0) {
          fallbackLinesRef.current = ['music', 'vibes', 'play'];
        }
        fallbackIdxRef.current = 0;

        const dur = (store.duration || currentTrack.duration) / 1000;
        fetchLyrics(currentTrack.name, currentTrack.artist, currentTrack.albumName ?? '', dur)
          .then(result => {
            if (trackIdRef.current === currentTrack.id) {
              lyricsRef.current = result;
              lyricsStatusRef.current = result && (result.synced.length > 0 || result.plain.length > 0)
                ? 'loaded' : 'none';
            }
          })
          .catch(() => {
            if (trackIdRef.current === currentTrack.id) lyricsStatusRef.current = 'none';
          });
      }

      // --- Spawn lyrics as full lines ---
      const lyrics = lyricsRef.current;
      const hasSynced = lyrics && lyrics.synced.length > 0;
      const hasPlain = lyrics && lyrics.plain.length > 0;
      const isNewBeat = beat !== lastBeatRef.current && isPlaying;

      if (hasSynced) {
        let lineIdx = -1;
        for (let i = lyrics.synced.length - 1; i >= 0; i--) {
          if (progress >= lyrics.synced[i].time) { lineIdx = i; break; }
        }
        if (lineIdx > lastLineRef.current && lineIdx >= 0) {
          lastLineRef.current = lineIdx;
          const lineText = lyrics.synced[lineIdx].text;
          if (lineText.trim().length > 0) {
            spawnLine(lineText, w, h, true);
          }
        }
      } else if (hasPlain && isNewBeat && beat % 2 === 0) {
        const line = lyrics.plain[plainIdxRef.current % lyrics.plain.length];
        plainIdxRef.current++;
        if (line.trim().length > 0) {
          spawnLine(line, w, h, true);
        }
      } else if (isNewBeat && fallbackLinesRef.current.length > 0 && beat % 3 === 0) {
        const line = fallbackLinesRef.current[fallbackIdxRef.current % fallbackLinesRef.current.length];
        fallbackIdxRef.current++;
        spawnLine(line, w, h, false);
      }

      // Beat scatter
      if (isNewBeat) {
        lastBeatRef.current = beat;
        if (kick > 0.5) {
          const bodies = Matter.Composite.allBodies(engine.world).filter(b => !b.isStatic);
          const cxC = w / 2, cyC = h / 2;
          for (const b of bodies) {
            const dx = b.position.x - cxC;
            const dy = b.position.y - cyC;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const force = 0.006 * energy;
            Matter.Body.applyForce(b, b.position, {
              x: (dx / dist) * force,
              y: (dy / dist) * force - 0.002,
            });
          }
        }
      }

      // --- Remove only off-screen bodies (no fade) ---
      const bodies = Matter.Composite.allBodies(engine.world).filter(b => !b.isStatic);
      for (const body of bodies) {
        if (body.position.y > h + 120 || body.position.y < -200 ||
          body.position.x < -200 || body.position.x > w + 200) {
          Matter.Composite.remove(engine.world, body);
          lineMetaRef.current.delete(body.id);
        }
      }

      // --- Render ---
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = '#06060c';
      ctx.fillRect(0, 0, w, h);

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const visibleBodies = Matter.Composite.allBodies(engine.world).filter(b => !b.isStatic);

      for (const body of visibleBodies) {
        const meta = lineMetaRef.current.get(body.id);
        if (!meta) continue;

        const { x, y } = body.position;
        const angle = body.angle;

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        ctx.font = meta.font;
        ctx.fillStyle = `hsla(${meta.hue}, 20%, 92%, ${meta.alpha})`;
        ctx.fillText(meta.text, 0, 0);
        ctx.restore();
      }

      // Loading indicator
      if (lyricsStatusRef.current === 'loading') {
        ctx.globalCompositeOperation = 'source-over';
        ctx.font = '500 11px "Inter", system-ui, sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        const dots = '.'.repeat(1 + Math.floor(beatClock.now * 2) % 3);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.fillText(`Loading lyrics${dots}`, 16, 16);
      }

      // Subtle vignette
      const vg = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.4, w / 2, h / 2, Math.max(w, h) * 0.7);
      vg.addColorStop(0, 'transparent');
      vg.addColorStop(1, 'rgba(0, 0, 0, 0.25)');
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, w, h);
      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, [spawnLine, setupWalls]);

  return (
    <div className="w-full h-full relative overflow-hidden bg-[#06060c]">
      <canvas ref={canvasRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-3 text-[10px] text-white/15 pointer-events-none select-none tracking-[0.2em] uppercase font-light">
        <span>Drag lyrics to throw</span>
        <span className="w-px h-2.5 bg-white/10" />
        <span>Click to push</span>
        <span className="w-px h-2.5 bg-white/10" />
        <span>Lyrics sync with song</span>
      </div>
    </div>
  );
}
