'use client';

import { useEffect, type ReactNode } from 'react';
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
  '--radius',
] as const;

type HslColor = { h: number; s: number; l: number };

function parseHexColor(value: string): HslColor | null {
  const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/iu.exec(value.trim());
  if (!match?.[1]) return null;

  const hex = match[1].length === 3
    ? match[1].split('').map((digit) => `${digit}${digit}`).join('')
    : match[1];
  const red = Number.parseInt(hex.slice(0, 2), 16) / 255;
  const green = Number.parseInt(hex.slice(2, 4), 16) / 255;
  const blue = Number.parseInt(hex.slice(4, 6), 16) / 255;
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

function foregroundFor(color: HslColor): string {
  return color.l >= 60 ? '#111111' : '#ffffff';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { organization, organizationId } = useOrganization();

  useEffect(() => {
    const root = document.documentElement;
    themeProperties.forEach((property) => root.style.removeProperty(property));
    if (organizationId) root.setAttribute('data-organization-id', organizationId);
    else root.removeAttribute('data-organization-id');

    const primary = parseHexColor(organization.primaryColor);
    if (primary) {
      const safePrimary = primary.l >= 85 ? { ...primary, l: 55 } : primary;
      const cssPrimary = toCssHsl(safePrimary);
      const foreground = foregroundFor(safePrimary);
      root.style.setProperty('--primary', cssPrimary);
      root.style.setProperty('--primary-hover', toCssHsl(adjustLightness(safePrimary, -5)));
      root.style.setProperty('--primary-active', toCssHsl(adjustLightness(safePrimary, -10)));
      root.style.setProperty('--primary-foreground', foreground);
      root.style.setProperty('--ring', cssPrimary);
      root.style.setProperty('--border-focus', cssPrimary);
      root.style.setProperty('--mb-primary', cssPrimary);
      root.style.setProperty('--mb-primary-foreground', foreground);
      root.style.setProperty('--mb-border-focus', cssPrimary);
    }

    const secondary = organization.secondaryColor
      ? parseHexColor(organization.secondaryColor)
      : null;
    if (secondary) {
      root.style.setProperty('--secondary', toCssHsl(secondary));
      root.style.setProperty('--secondary-hover', toCssHsl(adjustLightness(secondary, 5)));
      root.style.setProperty('--secondary-foreground', foregroundFor(secondary));
    }

    const radiusBySize = {
      compact: '0.375rem',
      comfortable: '0.625rem',
      rounded: '0.875rem',
    } as const;
    if (organization.borderRadius) {
      root.style.setProperty('--radius', radiusBySize[organization.borderRadius]);
    }

    root.classList.remove('dark');
    root.classList.add('light');
    root.setAttribute('data-theme', 'light');
  }, [
    organizationId,
    organization.primaryColor,
    organization.secondaryColor,
    organization.borderRadius,
  ]);

  return children;
}
