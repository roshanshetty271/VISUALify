'use client';

import { THEMES, ThemeName, useThemeStore } from '@/stores/useThemeStore';

export function ThemeSelector() {
    const { currentTheme, setTheme } = useThemeStore();

    return (
        <div className="flex items-center gap-1">
            {(Object.keys(THEMES) as ThemeName[]).map((themeName) => {
                const theme = THEMES[themeName];
                const isActive = currentTheme === themeName;

                return (
                    <button
                        key={themeName}
                        onClick={() => setTheme(themeName)}
                        className={`
                group relative flex flex-col items-center gap-1 p-2 rounded-lg
                transition-all duration-200
                ${isActive ? 'bg-white/10 ring-2 ring-white/30' : 'hover:bg-white/5'}
              `}
                        title={theme.label}
                    >
                        {/* Color swatch */}
                        <div
                            className="w-6 h-6 rounded-full shadow-lg transition-transform group-hover:scale-110"
                            style={{
                                background: `linear-gradient(135deg, ${theme.primary} 0%, ${theme.secondary} 100%)`,
                                boxShadow: isActive ? `0 0 12px ${theme.primary}` : undefined,
                            }}
                        />
                    </button>
                );
            })}
        </div>
    );
}
