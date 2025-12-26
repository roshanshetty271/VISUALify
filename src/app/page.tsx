'use client';

import { LoginButton } from '@/components/auth';
import { useEffect, useState, useMemo } from 'react';

// Generate stable sparkle positions
function generateSparkles(count: number) {
  const sparkles = [];
  for (let i = 0; i < count; i++) {
    sparkles.push({
      id: i,
      left: `${(i * 17 + 5) % 100}%`,
      top: `${(i * 23 + 10) % 100}%`,
      size: 2 + (i % 3),
      delay: (i * 0.3) % 5,
      duration: 3 + (i % 4),
    });
  }
  return sparkles;
}

const FEATURES = [
  {
    icon: '🌌',
    title: 'Galaxy Mode',
    description: 'Your tracks orbit as planets around a pulsing sun',
  },
  {
    icon: '⛰️',
    title: 'Terrain Mode',
    description: 'Synthwave mountains that react to energy levels',
  },
  {
    icon: '🧠',
    title: 'Neural Mode',
    description: 'Connected nodes form a living neural network',
  },
  {
    icon: '🌊',
    title: 'River Mode',
    description: 'Flowing waves carry your listening history',
  },
  {
    icon: '📊',
    title: 'Waveform Mode',
    description: 'Classic audio bars with a modern twist',
  },
  {
    icon: '✨',
    title: 'Particles Mode',
    description: 'Thousands of particles dance to your music',
  },
];

const VISUALIZER_PREVIEWS = [
  { mode: 'GALAXY', color: '#1DB954' },
  { mode: 'TERRAIN', color: '#8B5CF6' },
  { mode: 'NEURAL', color: '#3B82F6' },
  { mode: 'RIVER', color: '#06B6D4' },
];

export default function Home() {
  const [activePreview, setActivePreview] = useState(0);
  const [scrollY, setScrollY] = useState(0);
  
  // Stable sparkles - generated once
  const sparkles = useMemo(() => generateSparkles(30), []);

  useEffect(() => {
    const interval = setInterval(() => {
      setActivePreview((prev) => (prev + 1) % VISUALIZER_PREVIEWS.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const currentColor = VISUALIZER_PREVIEWS[activePreview].color;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#030305]">
      {/* Hero Section */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-4">
        {/* Dynamic animated background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Main center glow - follows color */}
          <div 
            className="absolute w-[1000px] h-[1000px] rounded-full blur-[200px] transition-all duration-1000 ease-in-out"
            style={{
              background: `radial-gradient(circle, ${currentColor}20 0%, ${currentColor}08 40%, transparent 70%)`,
              top: '40%',
              left: '50%',
              transform: `translate(-50%, -50%) scale(${1 + scrollY * 0.0005})`,
            }}
          />
          
          {/* Upper left accent glow */}
          <div 
            className="absolute w-[600px] h-[600px] rounded-full blur-[150px] transition-all duration-1000"
            style={{
              background: `radial-gradient(circle, ${currentColor}15 0%, transparent 60%)`,
              top: '-10%',
              left: '-10%',
            }}
          />
          
          {/* Lower right accent glow */}
          <div 
            className="absolute w-[500px] h-[500px] rounded-full blur-[120px] transition-all duration-1000"
            style={{
              background: `radial-gradient(circle, ${currentColor}10 0%, transparent 60%)`,
              bottom: '0%',
              right: '-5%',
            }}
          />
          
          
          {/* Sparkles */}
          {sparkles.map((sparkle) => (
            <div
              key={sparkle.id}
              className="absolute rounded-full animate-pulse"
              style={{
                left: sparkle.left,
                top: sparkle.top,
                width: `${sparkle.size}px`,
                height: `${sparkle.size}px`,
                background: currentColor,
                opacity: 0.3 + (sparkle.id % 5) * 0.1,
                boxShadow: `0 0 ${sparkle.size * 3}px ${currentColor}`,
                animationDelay: `${sparkle.delay}s`,
                animationDuration: `${sparkle.duration}s`,
                transition: 'background 1s, box-shadow 1s',
              }}
            />
          ))}
          
          {/* Larger floating orbs */}
          <div 
            className="absolute w-3 h-3 rounded-full blur-[1px] animate-float transition-all duration-1000"
            style={{
              background: currentColor,
              opacity: 0.4,
              boxShadow: `0 0 20px ${currentColor}`,
              left: '15%',
              top: '25%',
            }}
          />
          <div 
            className="absolute w-2 h-2 rounded-full blur-[1px] animate-float-slow transition-all duration-1000"
            style={{
              background: currentColor,
              opacity: 0.3,
              boxShadow: `0 0 15px ${currentColor}`,
              right: '20%',
              top: '30%',
            }}
          />
          <div 
            className="absolute w-4 h-4 rounded-full blur-[2px] animate-float-slower transition-all duration-1000"
            style={{
              background: currentColor,
              opacity: 0.2,
              boxShadow: `0 0 25px ${currentColor}`,
              left: '75%',
              bottom: '25%',
            }}
          />
          <div 
            className="absolute w-2 h-2 rounded-full blur-[1px] animate-float transition-all duration-1000"
            style={{
              background: currentColor,
              opacity: 0.35,
              boxShadow: `0 0 12px ${currentColor}`,
              left: '30%',
              bottom: '35%',
            }}
          />
          
          {/* Subtle grid overlay */}
          <div 
            className="absolute inset-0 opacity-[0.015]"
            style={{
              backgroundImage: `
                linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)
              `,
              backgroundSize: '60px 60px',
            }}
          />
        </div>

        {/* Hero content */}
        <div className="relative z-10 text-center space-y-6 max-w-4xl mx-auto">
          {/* Mode indicator */}
          <div className="flex items-center justify-center gap-2 mb-8">
            {VISUALIZER_PREVIEWS.map((preview, i) => (
              <button
                key={preview.mode}
                onClick={() => setActivePreview(i)}
                className={`px-3 py-1 text-xs font-mono rounded-full transition-all duration-300 ${
                  i === activePreview 
                    ? 'bg-white/10 text-white' 
                    : 'text-gray-600 hover:text-gray-400'
                }`}
              >
                {preview.mode}
              </button>
            ))}
          </div>

          {/* Logo */}
          <h1 className="text-7xl md:text-8xl lg:text-9xl font-bold tracking-tight">
            <span className="text-white">VISUAL</span>
            <span 
              className="transition-colors duration-500"
              style={{ color: VISUALIZER_PREVIEWS[activePreview].color }}
            >
              ify
            </span>
          </h1>

          {/* Main tagline */}
          <p className="text-2xl md:text-3xl lg:text-4xl text-gray-300 font-light tracking-wide">
            Transform your Spotify into art
          </p>

          {/* Description */}
          <p className="text-lg text-gray-500 max-w-2xl mx-auto leading-relaxed">
            Real-time music visualization that turns your listening experience 
            into stunning animated graphics. 6 unique modes, each reacting to 
            tempo, energy, and mood of your music.
          </p>

          {/* CTA */}
          <div className="pt-8 flex flex-col items-center gap-4">
            <LoginButton />
            <p className="text-sm text-gray-600">
              Free • No credit card • Requires Spotify account
            </p>
          </div>
        </div>

      </section>

      {/* Features Section */}
      <section className="relative py-32 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Section header */}
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              6 Stunning Visualization Modes
            </h2>
            <p className="text-gray-500 text-lg max-w-2xl mx-auto">
              Each mode creates a unique visual experience based on your music's 
              characteristics — tempo, energy, danceability, and mood.
            </p>
          </div>

          {/* Features grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((feature, i) => (
              <div
                key={feature.title}
                className="group relative p-6 rounded-2xl bg-white/[0.02] border border-white/[0.05] hover:border-white/[0.1] hover:bg-white/[0.04] transition-all duration-300"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                {/* Icon */}
                <div className="text-4xl mb-4">{feature.icon}</div>
                
                {/* Title */}
                <h3 className="text-xl font-semibold text-white mb-2 group-hover:text-spotify-green transition-colors">
                  {feature.title}
                </h3>
                
                {/* Description */}
                <p className="text-gray-500 text-sm leading-relaxed">
                  {feature.description}
                </p>

                {/* Hover glow */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-spotify-green/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works section */}
      <section className="relative py-32 px-4 border-t border-white/[0.05]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              How It Works
            </h2>
          </div>

          <div className="space-y-12 max-w-4xl mx-auto">
            {[
              {
                step: '01',
                title: 'Connect Spotify',
                description: 'One-click login with your Spotify account. We only read your currently playing track — nothing else.',
              },
              {
                step: '02',
                title: 'Play Music',
                description: 'Start playing any song on Spotify. It works with the desktop app, web player, or mobile.',
              },
              {
                step: '03',
                title: 'Watch It Come Alive',
                description: 'Your visualization instantly syncs to your music, reacting to beats, tempo, and energy in real-time.',
              },
            ].map((item) => (
              <div key={item.step} className="flex gap-6 md:gap-8 items-start">
                <div 
                  className="flex-shrink-0 w-14 h-14 md:w-16 md:h-16 rounded-full bg-spotify-green/10 flex items-center justify-center text-spotify-green font-mono text-base md:text-lg font-bold"
                >
                  {item.step}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-xl md:text-2xl font-semibold text-white mb-2">{item.title}</h3>
                  <p className="text-gray-500 text-base md:text-lg leading-relaxed">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative py-32 px-4">
        <div className="max-w-4xl mx-auto text-center">
          {/* Glow effect */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-spotify-green/10 rounded-full blur-[150px] pointer-events-none" />
          
          <div className="relative z-10 flex flex-col items-center">
            <h2 className="text-4xl md:text-6xl font-bold text-white mb-6">
              Ready to see your music?
            </h2>
            <p className="text-xl text-gray-400 mb-10">
              Join thousands of music lovers who visualize their listening experience.
            </p>
            <LoginButton />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative py-8 px-4 border-t border-white/[0.05]">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-gray-600 text-sm">
          <div className="flex items-center">
            <span className="font-bold text-white">VISUAL</span>
            <span className="text-spotify-green">ify</span>
          </div>
          <div className="flex items-center gap-6">
            <span>Powered by Spotify Web API</span>
            <span>•</span>
            <span>Built with Next.js & D3.js</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
