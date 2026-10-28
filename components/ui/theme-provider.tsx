'use client';

import { useLayoutEffect, type ReactNode } from 'react';
import { useOrganization } from '@/contexts/organization-context';

const themeProperties = [
  '--primary',
  '--primary-hover',
  '--primary-active',
  '--primary-foreground',
  '--ring',
  '--border-focus',
  '--mb-primary',
  '--mb-primary-foreground',
  '--mb-border-focus',
  '--secondary',
  '--secondary-hover',
  '--secondary-foreground',
  '--accent',
  '--accent-foreground',
  '--success',
  '--success-foreground',
  '--sidebar-primary',
  '--sidebar-primary-foreground',
  '--radius',
] as const;

type HslColor = { h: number; s: number; l: number };
type RgbColor = { r: number; g: number; b: number };

function parseHexColor(value: string): RgbColor | null {
  const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/iu.exec(value.trim());
  if (!match?.[1]) return null;

  const hex = match[1].length === 3
    ? match[1].split('').map((digit) => `${digit}${digit}`).join('')
    : match[1];
  return {
    r: Number.parseInt(hex.slice(0, 2), 16),
    g: Number.parseInt(hex.slice(2, 4), 16),
    b: Number.parseInt(hex.slice(4, 6), 16),
  };
}

function toHsl({ r, g, b }: RgbColor): HslColor {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const maximum = Math.max(red, green, blue);
  const minimum = Math.min(red, green, blue);
  const lightness = (maximum + minimum) / 2;
  let hue = 0;
  let saturation = 0;

  if (maximum !== minimum) {
    const delta = maximum - minimum;
    saturation = lightness > 0.5
      ? delta / (2 - maximum - minimum)
      : delta / (maximum + minimum);
    if (maximum === red) hue = (green - blue) / delta + (green < blue ? 6 : 0);
    else if (maximum === green) hue = (blue - red) / delta + 2;
    else hue = (red - green) / delta + 4;
    hue /= 6;
  }

  return {
    h: Math.round(hue * 360),
    s: Math.round(saturation * 100),
    l: Math.round(lightness * 100),
  };
}

function toCssHsl({ h, s, l }: HslColor): string {
  return `hsl(${h} ${s}% ${l}%)`;
}

function adjustLightness(color: HslColor, amount: number): HslColor {
  return { ...color, l: Math.max(0, Math.min(100, color.l + amount)) };
}

function relativeLuminance({ r, g, b }: RgbColor): number {
  const linearize = (channel: number) => {
    const normalized = channel / 255;
    return normalized <= 0.04045
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}

function foregroundFor(color: RgbColor): string {
  return relativeLuminance(color) > 0.42 ? '#172033' : '#ffffff';
}

function applyTheme(mode: 'light' | 'dark' | 'system'): () => void {
  const root = document.documentElement;
  const systemPreference = window.matchMedia('(prefers-color-scheme: dark)');
  const updateMode = () => {
    const isDark = mode === 'dark' || (mode === 'system' && systemPreference.matches);
    root.classList.toggle('dark', isDark);
    root.classList.toggle('light', !isDark);
    root.setAttribute('data-theme', isDark ? 'dark' : 'light');
    root.style.colorScheme = isDark ? 'dark' : 'light';
  };

  updateMode();
  if (mode === 'system') {
    systemPreference.addEventListener('change', updateMode);
    return () => systemPreference.removeEventListener('change', updateMode);
  }
  return () => {};
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { organization, organizationId } = useOrganization();

  useLayoutEffect(() => {
    const root = document.documentElement;
    themeProperties.forEach((property) => root.style.removeProperty(property));
    if (organizationId) root.setAttribute('data-organization-id', organizationId);
    else root.removeAttribute('data-organization-id');

    const primaryRgb = parseHexColor(organization.primaryColor ?? '');
    if (primaryRgb) {
      const primary = toHsl(primaryRgb);
      const safePrimary = primary.l >= 85 ? { ...primary, l: 55 } : primary;
      const cssPrimary = toCssHsl(safePrimary);
      const foreground = foregroundFor(primaryRgb);
      root.style.setProperty('--primary', cssPrimary);
      root.style.setProperty('--primary-hover', toCssHsl(adjustLightness(safePrimary, -5)));
      root.style.setProperty('--primary-active', toCssHsl(adjustLightness(safePrimary, -10)));
      root.style.setProperty('--primary-foreground', foreground);
      root.style.setProperty('--ring', cssPrimary);
      root.style.setProperty('--border-focus', cssPrimary);
      root.style.setProperty('--mb-primary', cssPrimary);
      root.style.setProperty('--mb-primary-foreground', foreground);
      root.style.setProperty('--mb-border-focus', cssPrimary);
      root.style.setProperty('--sidebar-primary', cssPrimary);
      root.style.setProperty('--sidebar-primary-foreground', foreground);
    }

    const secondaryRgb = parseHexColor(organization.secondaryColor ?? '');
    if (secondaryRgb) {
      const secondary = toHsl(secondaryRgb);
      root.style.setProperty('--secondary', toCssHsl(secondary));
      root.style.setProperty('--secondary-hover', toCssHsl(adjustLightness(secondary, -4)));
      root.style.setProperty('--secondary-foreground', foregroundFor(secondaryRgb));
    }

    const accentColor = organization.accentColor;
    const accentRgb = parseHexColor(accentColor ?? '');
    if (accentRgb && accentColor) {
      root.style.setProperty(
        '--accent',
        `color-mix(in srgb, ${accentColor} 14%, var(--background))`,
      );
      root.style.setProperty('--accent-foreground', 'var(--foreground)');
      root.style.setProperty('--success', accentColor);
      root.style.setProperty('--success-foreground', foregroundFor(accentRgb));
    }

    const radiusBySize = {
      compact: '0.375rem',
      comfortable: '0.625rem',
      rounded: '0.875rem',
    } as const;
    root.style.setProperty('--radius', radiusBySize[organization.borderRadius ?? 'comfortable']);

    return applyTheme(organization.themeMode ?? 'light');
  }, [
    organizationId,
    organization.primaryColor,
    organization.secondaryColor,
    organization.accentColor,
    organization.borderRadius,
    organization.themeMode,
  ]);

  return children;
}
