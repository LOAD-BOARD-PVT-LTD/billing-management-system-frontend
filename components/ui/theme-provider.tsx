'use client';

import * as React from 'react';
import { createContext, useContext, useEffect } from 'react';
import { organizationConfig } from '@/constants/organization';
import type { OrganizationConfig } from '@/constants/organization';

type ThemeProviderProps = {
  children: React.ReactNode;
  storageKey?: string;
};

type ThemeProviderState = {
  theme: 'light';
};

const initialState: ThemeProviderState = {
  theme: 'light',
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const clean = hex.replace('#', '');
  const bigint = parseInt(clean, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;

  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;

  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  let h = 0, s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rNorm: h = (gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0); break;
      case gNorm: h = (bNorm - rNorm) / d + 2; break;
      case bNorm: h = (rNorm - gNorm) / d + 4; break;
    }
    h /= 6;
  }

  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function hslToCss({ h, s, l }: { h: number; s: number; l: number }): string {
  return `hsl(${h} ${s}% ${l}%)`;
}

function adjustLightness(hsl: { h: number; s: number; l: number }, delta: number) {
  return { ...hsl, l: Math.max(0, Math.min(100, hsl.l + delta)) };
}

function isLight(hex: string): boolean {
  const clean = hex.replace('#', '');
  const bigint = parseInt(clean, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
                        
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6;
}

function isHexColor(value: string): boolean {
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/iu.test(value.trim());
}

function guessForegroundForCssColor(raw: string): string {
  const value = raw.trim();
  if (isHexColor(value)) return isLight(value) ? '#111111' : '#ffffff';
  const match = value.match(/oklch\(\s*([0-9]*\.?[0-9]+)\s+/iu);
  if (match?.[1]) {
    const lightness = Number(match[1]);
    if (Number.isFinite(lightness)) return lightness >= 0.78 ? '#111111' : '#ffffff';
  }
  return '#ffffff';
}

export function ThemeProvider({
  children,
  storageKey = 'membership-billing-ui-theme',
  ...props
}: ThemeProviderProps) {
  const config: OrganizationConfig & { secondaryColor?: string } = organizationConfig;

                                              
  useEffect(() => {
    if (typeof window !== 'undefined') {
                                      
      localStorage.setItem(storageKey, 'light');

                                             
      const root = document.documentElement;
      root.classList.remove('dark');
      root.classList.add('light');

                                 
      root.setAttribute('data-theme', 'light');
    }
  }, [storageKey]);

                                                                           
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!config) return;

    const root = document.documentElement;

              
    let primaryHandled = false;
    if (config.primaryColor) {
      const raw = config.primaryColor.trim();
      if (!isHexColor(raw)) {
        const fg = guessForegroundForCssColor(raw);
        root.style.setProperty('--primary', raw);
        root.style.setProperty('--primary-hover', raw);
        root.style.setProperty('--primary-active', raw);
        root.style.setProperty('--primary-foreground', fg);
        root.style.setProperty('--ring', raw);
        root.style.setProperty('--border-focus', raw);
        root.style.setProperty('--mb-primary', raw);
        root.style.setProperty('--mb-primary-foreground', fg);
        root.style.setProperty('--mb-border-focus', raw);
        primaryHandled = true;
      }

      if (!primaryHandled) {
        const baseHsl = hexToHsl(raw);

                                                                                               
        const safeBase = baseHsl.l >= 85 ? { ...baseHsl, l: 55 } : baseHsl;
        const hover = adjustLightness(safeBase, -5);
        const active = adjustLightness(safeBase, -10);
        const fg = isLight(raw) ? '#111111' : '#ffffff';

        const primaryCss = hslToCss(safeBase);
        root.style.setProperty('--primary', primaryCss);
        root.style.setProperty('--primary-hover', hslToCss(hover));
        root.style.setProperty('--primary-active', hslToCss(active));
        root.style.setProperty('--primary-foreground', fg);
        root.style.setProperty('--ring', primaryCss);
        root.style.setProperty('--border-focus', primaryCss);

                                                                                                
        root.style.setProperty('--mb-primary', primaryCss);
        root.style.setProperty('--mb-primary-foreground', fg);
        root.style.setProperty('--mb-border-focus', primaryCss);
      }
    }

                
    if (config.secondaryColor) {
      const hsl = hexToHsl(config.secondaryColor);
      const hover = adjustLightness(hsl, 5);
      const fg = isLight(config.secondaryColor) ? '#111111' : '#ffffff';

      root.style.setProperty('--secondary', hslToCss(hsl));
      root.style.setProperty('--secondary-hover', hslToCss(hover));
      root.style.setProperty('--secondary-foreground', fg);
    }
  }, [config]);

  return (
    <ThemeProviderContext.Provider {...props} value={initialState}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined) throw new Error('useTheme must be used within a ThemeProvider');

  return context;
};
