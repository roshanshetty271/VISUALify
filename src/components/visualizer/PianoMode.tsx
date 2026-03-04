'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { useThemeStore } from '@/stores/useThemeStore';
import { beatClock } from '@/lib/utils/beatClock';

// Piano Configuration
const OCTAVES = 2;
const START_NOTE = 48; // C3
const KEY_COUNT = OCTAVES * 12 + 1; // 25 keys for 2 octaves (C3 to C5)
const WHITE_KEYS = [0, 2, 4, 5, 7, 9, 11]; // Indices in an octave
const KEY_WIDTH_RATIO = 1 / 15; // Width relative to canvas
const FALL_SPEED_BASE = 0.3;

// Helpers
const isBlackKey = (idx: number) => !WHITE_KEYS.includes(idx % 12);
const getNoteFreq = (idx: number) => 440 * Math.pow(2, (idx + START_NOTE - 69) / 12);
const WHITE_KEY_COUNT = Array.from({ length: KEY_COUNT }, (_, i) => i).filter(idx => !isBlackKey(idx)).length;

// Simple hex color mixer for Canvas compatibility
const mixHex = (hex1: string, hex2: string, weight: number) => {
    try {
        const d2h = (d: number) => d.toString(16).padStart(2, '0');
        const h2d = (h: string) => parseInt(h, 16);

        const r1 = h2d(hex1.substring(1, 3));
        const g1 = h2d(hex1.substring(3, 5));
        const b1 = h2d(hex1.substring(5, 7));

        const r2 = h2d(hex2.substring(1, 3));
        const g2 = h2d(hex2.substring(3, 5));
        const b2 = h2d(hex2.substring(5, 7));

        const r = Math.floor(r1 * weight + r2 * (1 - weight));
        const g = Math.floor(g1 * weight + g2 * (1 - weight));
        const b = Math.floor(b1 * weight + b2 * (1 - weight));

        return `#${d2h(r)}${d2h(g)}${d2h(b)}`;
    } catch (e) {
        return hex1;
    }
};

interface PianoNote {
    id: string;
    keyIndex: number;
    y: number;
    height: number;
    velocity: number;
    opacity: number;
    color: string;
}

interface ActiveKey {
    index: number;
    startTime: number;
    intensity: number;
}

export function PianoMode() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animRef = useRef(0);
    const notesRef = useRef<PianoNote[]>([]);
    const activeKeysRef = useRef<Map<number, ActiveKey>>(new Map());
    const lastFrameRef = useRef(performance.now());
    const lastBeatRef = useRef(-1);

    const [hoverKey, setHoverKey] = useState<number | null>(null);

    // Audio Context Management
    const audioCtxRef = useRef<AudioContext | null>(null);

    const getAudioCtx = () => {
        if (!audioCtxRef.current) {
            audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        if (audioCtxRef.current.state === 'suspended') {
            audioCtxRef.current.resume();
        }
        return audioCtxRef.current;
    };

    const playNote = (index: number, intensity: number) => {
        try {
            const ctx = getAudioCtx();
            const freq = getNoteFreq(index);
            const now = ctx.currentTime;

            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            // Simple piano-ish synthesis
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now);

            // Sub-harmonic for "body"
            const osc2 = ctx.createOscillator();
            const gain2 = ctx.createGain();
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(freq / 2, now);

            const vol = 0.4 * intensity; // Increased from 0.1 for "loud" play
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(vol, now + 0.01);
            gain.gain.exponentialRampToValueAtTime(vol * 0.1, now + 0.5);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

            gain2.gain.setValueAtTime(0, now);
            gain2.gain.linearRampToValueAtTime(vol * 0.8, now + 0.01); // Boosted body volume
            gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

            osc.connect(gain);
            osc2.connect(gain2);
            gain.connect(ctx.destination);
            gain2.connect(ctx.destination);

            osc.start(now);
            osc2.start(now);
            osc.stop(now + 1.3);
            osc2.stop(now + 1.3);
        } catch (e) {
            console.warn('Audio play failed', e);
        }
    };

    const spawnNote = useCallback((keyIndex: number, intensity: number, themeColor: string) => {
        const id = Math.random().toString(36).substring(7);
        notesRef.current.push({
            id,
            keyIndex,
            y: -50,
            height: 20 + intensity * 80,
            velocity: FALL_SPEED_BASE + (Math.random() * 0.2),
            opacity: 0.8,
            color: themeColor,
        });
    }, []);

    const triggerKey = useCallback((index: number, intensity: number, withSound = false) => {
        activeKeysRef.current.set(index, {
            index,
            startTime: performance.now(),
            intensity: Math.max(0.2, intensity),
        });

        if (withSound) {
            playNote(index, intensity);
        }
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const resize = () => {
            const p = canvas.parentElement;
            if (!p) return;
            canvas.width = p.clientWidth;
            canvas.height = p.clientHeight;
        };
        resize();
        window.addEventListener('resize', resize);
        return () => window.removeEventListener('resize', resize);
    }, []);

    useEffect(() => {
        const animate = () => {
            const canvas = canvasRef.current;
            const ctx = canvas?.getContext('2d');
            if (!canvas || !ctx) {
                animRef.current = requestAnimationFrame(animate);
                return;
            }

            const now = performance.now();
            const rawDt = Math.min((now - lastFrameRef.current) / 1000, 0.05);
            lastFrameRef.current = now;

            const { audioFeatures, isPlaying } = usePlayerStore.getState();
            const { animationSpeed, glowIntensity } = useSettingsStore.getState();
            const theme = useThemeStore.getState().getTheme();

            const dt = rawDt * animationSpeed;
            beatClock.tick(dt, isPlaying);

            const w = canvas.width;
            const h = canvas.height;
            if (w === 0 || h === 0) {
                animRef.current = requestAnimationFrame(animate);
                return;
            }

            const energy = audioFeatures?.energy || 0.5;
            const tempo = audioFeatures?.tempo || 120;
            const kick = beatClock.kick(tempo);
            const beat = beatClock.beatIndex(tempo);

            // Automatic note spawning removed as per user request
            if (isPlaying && beat !== lastBeatRef.current) {
                lastBeatRef.current = beat;
            }

            // Physics: Update notes
            for (let i = notesRef.current.length - 1; i >= 0; i--) {
                const note = notesRef.current[i];
                note.y += note.velocity * dt * 500;

                // Check if note hit the keyboard (keyboard is roughly at bottom 20% of screen)
                const keyboardTop = h * 0.8;
                if (note.y > keyboardTop - note.height && note.y < keyboardTop) {
                    // Light up key briefly when note "passes through" the top edge
                    if (!activeKeysRef.current.has(note.keyIndex)) {
                        triggerKey(note.keyIndex, 0.5, false);
                    }
                }

                if (note.y > h + 100) {
                    notesRef.current.splice(i, 1);
                }
            }

            // Cleanup expired active keys
            activeKeysRef.current.forEach((val, key) => {
                if (now - val.startTime > 500) {
                    activeKeysRef.current.delete(key);
                }
            });

            // --- RENDER ---
            ctx.clearRect(0, 0, w, h);

            // Background gradient
            const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
            bgGrad.addColorStop(0, '#06060c');
            bgGrad.addColorStop(1, '#0c0c1a');
            ctx.fillStyle = bgGrad;
            ctx.fillRect(0, 0, w, h);

            // Falling notes rendering removed as per user request

            ctx.globalAlpha = 1;
            ctx.globalCompositeOperation = 'source-over';

            // Draw Keyboard
            const headerHeight = 85;
            const keyboardTop = Math.max(headerHeight, h * 0.12); // Prevent overlapping the header
            const keyboardHeight = h - keyboardTop - 10; // Leave tiny gap at bottom
            const whiteKeysOnly = Array.from({ length: KEY_COUNT }, (_, i) => i).filter(idx => !isBlackKey(idx));
            const whiteKeyWidth = w / WHITE_KEY_COUNT;

            // 1. Draw White Keys
            whiteKeysOnly.forEach((idx, wkIdx) => {
                const x = wkIdx * whiteKeyWidth;
                const active = activeKeysRef.current.get(idx);

                // Pure white for base, theme color for active
                const baseColor = '#ffffff';
                const activeColor = theme.primary;

                // Subtle gradient for 3D effect
                const keyGrad = ctx.createLinearGradient(x, keyboardTop, x, h);
                if (active) {
                    keyGrad.addColorStop(0, theme.primary);
                    keyGrad.addColorStop(1, '#000000');
                } else {
                    keyGrad.addColorStop(0, '#ffffff'); // Top edge highlight
                    keyGrad.addColorStop(0.2, '#ffffff');
                    keyGrad.addColorStop(1, '#dddddd'); // Subtle grey at bottom for 3D
                }

                ctx.fillStyle = keyGrad;
                ctx.strokeStyle = 'rgba(0,0,0,0.15)';
                ctx.lineWidth = 1;

                ctx.beginPath();
                ctx.roundRect(x + 1, keyboardTop, whiteKeyWidth - 2, keyboardHeight, [0, 0, 12, 12]);
                ctx.fill();
                ctx.stroke();

                // Ivory-style shadow/highlight on the sides
                ctx.globalAlpha = 0.1;
                ctx.fillStyle = '#000';
                ctx.fillRect(x + whiteKeyWidth - 2, keyboardTop, 1, keyboardHeight);
                ctx.globalAlpha = 1;

                // Highlight top edge
                if (active) {
                    ctx.fillStyle = '#fff';
                    ctx.globalAlpha = 0.6;
                    ctx.fillRect(x + 1, keyboardTop, whiteKeyWidth - 2, 8);
                    ctx.globalAlpha = 1;
                }
            });

            // 2. Draw Black Keys
            let wkCounter = 0;
            for (let i = 0; i < KEY_COUNT; i++) {
                if (isBlackKey(i)) {
                    const x = wkCounter * whiteKeyWidth - (whiteKeyWidth * 0.35);
                    const active = activeKeysRef.current.get(i);
                    const bh = keyboardHeight * 0.6; // Slightly longer keys
                    const bw = whiteKeyWidth * 0.7;

                    const keyGrad = ctx.createLinearGradient(x, keyboardTop, x, keyboardTop + bh);
                    if (active) {
                        keyGrad.addColorStop(0, theme.primary);
                        keyGrad.addColorStop(1, '#000000');
                    } else {
                        keyGrad.addColorStop(0, '#333');
                        keyGrad.addColorStop(0.8, '#111');
                        keyGrad.addColorStop(1, '#000');
                    }

                    ctx.fillStyle = keyGrad;
                    ctx.beginPath();
                    ctx.roundRect(x, keyboardTop, bw, bh, [0, 0, 6, 6]);
                    ctx.fill();

                    if (active) {
                        ctx.fillStyle = '#fff';
                        ctx.globalAlpha = 0.4;
                        ctx.fillRect(x + 2, keyboardTop, bw - 4, 4);
                        ctx.globalAlpha = 1;
                    }
                } else {
                    wkCounter++;
                }
            }

            animRef.current = requestAnimationFrame(animate);
        };

        animRef.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animRef.current);
    }, []);

    const handlePointerDown = (e: React.PointerEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const r = canvas.getBoundingClientRect();
        const x = e.clientX - r.left;
        const y = e.clientY - r.top;

        // Check if clicked in keyboard area
        const headerHeight = 85;
        const keyboardTop = Math.max(headerHeight, canvas.height * 0.12);
        if (y > keyboardTop) {
            const whiteKeyWidth = canvas.width / WHITE_KEY_COUNT;
            const keyboardHeight = canvas.height - keyboardTop;

            // 1. Check black keys first (they are on top)
            let wkCounter = 0;
            let hitKey: number | null = null;

            for (let i = 0; i < KEY_COUNT; i++) {
                if (isBlackKey(i)) {
                    const bx = wkCounter * whiteKeyWidth - (whiteKeyWidth * 0.35);
                    const bw = whiteKeyWidth * 0.7;
                    const bh = keyboardHeight * 0.6;
                    if (x >= bx && x <= bx + bw && y >= keyboardTop && y <= keyboardTop + bh) {
                        hitKey = i;
                        break;
                    }
                } else {
                    wkCounter++;
                }
            }

            // 2. Check white keys if no black key was hit
            if (hitKey === null) {
                const wkIdx = Math.floor(x / whiteKeyWidth);
                const whiteKeysOnly = Array.from({ length: KEY_COUNT }, (_, i) => i).filter(idx => !isBlackKey(idx));
                if (wkIdx >= 0 && wkIdx < whiteKeysOnly.length) {
                    hitKey = whiteKeysOnly[wkIdx];
                }
            }

            if (hitKey !== null) {
                triggerKey(hitKey, 1, true);
            }
        }
    };

    return (
        <div className="w-full h-full relative overflow-hidden bg-[#06060c]">
            <canvas
                ref={canvasRef}
                className="w-full h-full cursor-pointer"
                onPointerDown={handlePointerDown}
            />

            <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-3 text-[10px] text-white/15 pointer-events-none select-none tracking-[0.2em] uppercase font-light">
                <span>Click keys to play</span>
                <span className="w-px h-2.5 bg-white/10" />
                <span>Piano reacts to music</span>
                <span className="w-px h-2.5 bg-white/10" />
                <span>Theme-matched visuals</span>
            </div>
        </div>
    );
}
