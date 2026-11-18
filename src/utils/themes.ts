import type { ThemeId } from '../types/pos';

export interface ThemeTokens {
  id: ThemeId;
  label: string;
  isDark: boolean;
  swatchStart: string;
  swatchEnd: string;
  bg: string;
  surface: string;
  surfaceSoft: string;
  navBg: string;
  border: string;
  ink: string;
  muted: string;
  accent: string;
  accentHover: string;
  accentSoft: string;
  accentOn: string;
  accentText: string;
}

export const PRESET_THEMES: ThemeTokens[] = [
  {
    id: 'pastel-pink',
    label: 'ชมพูพาสเทล',
    isDark: false,
    swatchStart: '#fce8f0',
    swatchEnd: '#dc6893',
    bg: '#fdf2f6',
    surface: '#ffffff',
    surfaceSoft: '#fef7fa',
    navBg: '#fbeaf1',
    border: '#f5d6e2',
    ink: '#471e2f',
    muted: '#86586b',
    accent: '#c94c7c',
    accentHover: '#b03a68',
    accentSoft: '#fdf0f5',
    accentOn: '#ffffff',
    accentText: '#c94c7c',
  },
  {
    id: 'peach',
    label: 'พีช',
    isDark: false,
    swatchStart: '#fdebe0',
    swatchEnd: '#e07b52',
    bg: '#fdf4ee',
    surface: '#ffffff',
    surfaceSoft: '#fff9f5',
    navBg: '#fbede4',
    border: '#f6dccb',
    ink: '#4a2617',
    muted: '#875f4e',
    accent: '#c75e34',
    accentHover: '#ae4c25',
    accentSoft: '#fdf1ea',
    accentOn: '#ffffff',
    accentText: '#c75e34',
  },
  {
    id: 'butter',
    label: 'เนยเหลือง',
    isDark: false,
    swatchStart: '#fbf1ce',
    swatchEnd: '#d6a432',
    bg: '#fcf8ea',
    surface: '#ffffff',
    surfaceSoft: '#fefcf4',
    navBg: '#f9f2da',
    border: '#efe0b2',
    ink: '#42310f',
    muted: '#7a673f',
    accent: '#9f7014',
    accentHover: '#875d0c',
    accentSoft: '#fbf5e0',
    accentOn: '#ffffff',
    accentText: '#9f7014',
  },
  {
    id: 'mint',
    label: 'มินต์',
    isDark: false,
    swatchStart: '#dff5eb',
    swatchEnd: '#4fa884',
    bg: '#eef8f4',
    surface: '#ffffff',
    surfaceSoft: '#f6fcf9',
    navBg: '#e4f4ed',
    border: '#cae8dc',
    ink: '#153b2d',
    muted: '#4a7565',
    accent: '#23825e',
    accentHover: '#1a6b4d',
    accentSoft: '#eaf7f1',
    accentOn: '#ffffff',
    accentText: '#23825e',
  },
  {
    id: 'sky',
    label: 'ฟ้าใส',
    isDark: false,
    swatchStart: '#e5f0fc',
    swatchEnd: '#689ee6',
    bg: '#eef4fb',
    surface: '#ffffff',
    surfaceSoft: '#f8fbff',
    navBg: '#f2f7fd',
    border: '#dce8f7',
    ink: '#1e3554',
    muted: '#647b99',
    accent: '#3a78cc',
    accentHover: '#2c66b5',
    accentSoft: '#f2f7fe',
    accentOn: '#ffffff',
    accentText: '#3a78cc',
  },
  {
    id: 'lavender',
    label: 'ลาเวนเดอร์',
    isDark: false,
    swatchStart: '#ece6fc',
    swatchEnd: '#9375db',
    bg: '#f4f1fc',
    surface: '#ffffff',
    surfaceSoft: '#faf8fe',
    navBg: '#eee9fb',
    border: '#dfd6f6',
    ink: '#2b1e4b',
    muted: '#695b8d',
    accent: '#6f4ec2',
    accentHover: '#5b3cad',
    accentSoft: '#f4effd',
    accentOn: '#ffffff',
    accentText: '#6f4ec2',
  },
  {
    id: 'dark-pink',
    label: 'ดำชมพู',
    isDark: true,
    swatchStart: '#2a1822',
    swatchEnd: '#d96993',
    bg: '#161116',
    surface: '#211a21',
    surfaceSoft: '#2b212b',
    navBg: '#291f29',
    border: '#413040',
    ink: '#faeff4',
    muted: '#c4a6b4',
    accent: '#cc4e7e',
    accentHover: '#b33d6b',
    accentSoft: '#332230',
    accentOn: '#ffffff',
    accentText: '#f48cb3',
  },
  {
    id: 'dark-peach',
    label: 'ดำพีช',
    isDark: true,
    swatchStart: '#2b1c16',
    swatchEnd: '#db7c56',
    bg: '#171210',
    surface: '#231c19',
    surfaceSoft: '#2d2420',
    navBg: '#2b211d',
    border: '#44342d',
    ink: '#fbf1ec',
    muted: '#c7aa9d',
    accent: '#c96238',
    accentHover: '#b05029',
    accentSoft: '#34241e',
    accentOn: '#ffffff',
    accentText: '#f49a74',
  },
  {
    id: 'dark-butter',
    label: 'ดำเนย',
    isDark: true,
    swatchStart: '#282315',
    swatchEnd: '#cf9f34',
    bg: '#16140f',
    surface: '#221f17',
    surfaceSoft: '#2c281d',
    navBg: '#2a261b',
    border: '#423c2a',
    ink: '#fbf6e8',
    muted: '#c5bc9d',
    accent: '#a97914',
    accentHover: '#8f650d',
    accentSoft: '#332c19',
    accentOn: '#ffffff',
    accentText: '#ecc048',
  },
  {
    id: 'dark-mint',
    label: 'ดำมินต์',
    isDark: true,
    swatchStart: '#162821',
    swatchEnd: '#4ea784',
    bg: '#0f1714',
    surface: '#18221e',
    surfaceSoft: '#202d28',
    navBg: '#1d2924',
    border: '#2f443b',
    ink: '#ecf8f2',
    muted: '#9ec4b4',
    accent: '#23825e',
    accentHover: '#1a6b4d',
    accentSoft: '#1c3329',
    accentOn: '#ffffff',
    accentText: '#5cd0a3',
  },
  {
    id: 'dark-navy',
    label: 'ดำน้ำเงิน',
    isDark: true,
    swatchStart: '#151e2c',
    swatchEnd: '#5a8ad1',
    bg: '#10151e',
    surface: '#18202d',
    surfaceSoft: '#202b3c',
    navBg: '#1d2737',
    border: '#304057',
    ink: '#eef4fc',
    muted: '#a0b5d1',
    accent: '#3a78cc',
    accentHover: '#2c66b5',
    accentSoft: '#1f2e45',
    accentOn: '#ffffff',
    accentText: '#7db4f8',
  },
  {
    id: 'dark-purple',
    label: 'ดำม่วง',
    isDark: true,
    swatchStart: '#1f1831',
    swatchEnd: '#8b6cd9',
    bg: '#14111c',
    surface: '#1e1a2a',
    surfaceSoft: '#272236',
    navBg: '#241f32',
    border: '#3b3352',
    ink: '#f3effc',
    muted: '#b3a9d1',
    accent: '#6f4ec2',
    accentHover: '#5b3cad',
    accentSoft: '#2d2444',
    accentOn: '#ffffff',
    accentText: '#b59bf7',
  },
];

function parseHex(hex: string): [number, number, number] {
  const clean = (hex || '').replace('#', '').trim();
  if (/^[0-9a-fA-F]{6}$/.test(clean)) {
    return [
      parseInt(clean.slice(0, 2), 16),
      parseInt(clean.slice(2, 4), 16),
      parseInt(clean.slice(4, 6), 16),
    ];
  }
  return [58, 120, 204];
}

function toHex(r: number, g: number, b: number): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  return (
    '#' +
    [clamp(r), clamp(g), clamp(b)]
      .map((v) => v.toString(16).padStart(2, '0'))
      .join('')
  );
}

function mixRgb(
  a: [number, number, number],
  b: [number, number, number],
  weightB: number
): string {
  const w = Math.max(0, Math.min(1, weightB));
  return toHex(
    a[0] * (1 - w) + b[0] * w,
    a[1] * (1 - w) + b[1] * w,
    a[2] * (1 - w) + b[2] * w
  );
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  const channel = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function buildThemeTokens(
  themeId: ThemeId | string | undefined,
  customColor?: string
): ThemeTokens {
  if (themeId === 'custom') {
    const rgb = parseHex(customColor || '#3a78cc');
    const white: [number, number, number] = [255, 255, 255];
    const black: [number, number, number] = [20, 28, 42];
    const lum = relativeLuminance(rgb);
    const accent = toHex(rgb[0], rgb[1], rgb[2]);
    const accentOn = lum > 0.42 ? '#182436' : '#ffffff';
    const accentText = lum > 0.35 ? mixRgb(rgb, black, 0.48) : accent;

    return {
      id: 'custom',
      label: 'สีของร้านเอง',
      isDark: false,
      swatchStart: mixRgb(rgb, white, 0.85),
      swatchEnd: accent,
      bg: mixRgb(rgb, white, 0.9),
      surface: '#ffffff',
      surfaceSoft: mixRgb(rgb, white, 0.95),
      navBg: mixRgb(rgb, white, 0.88),
      border: mixRgb(rgb, white, 0.76),
      ink: mixRgb(rgb, black, 0.82),
      muted: mixRgb(rgb, [95, 110, 130], 0.75),
      accent,
      accentHover: mixRgb(rgb, black, 0.18),
      accentSoft: mixRgb(rgb, white, 0.88),
      accentOn,
      accentText,
    };
  }

  return (
    PRESET_THEMES.find((t) => t.id === themeId) ||
    PRESET_THEMES.find((t) => t.id === 'sky')!
  );
}

export function applyThemeCssVars(tokens: ThemeTokens): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.style.setProperty('--pos-bg', tokens.bg);
  root.style.setProperty('--pos-surface', tokens.surface);
  root.style.setProperty('--pos-surface-soft', tokens.surfaceSoft);
  root.style.setProperty('--pos-nav-bg', tokens.navBg);
  root.style.setProperty('--pos-border', tokens.border);
  root.style.setProperty('--pos-ink', tokens.ink);
  root.style.setProperty('--pos-muted', tokens.muted);
  root.style.setProperty('--pos-accent', tokens.accent);
  root.style.setProperty('--pos-accent-hover', tokens.accentHover);
  root.style.setProperty('--pos-accent-soft', tokens.accentSoft);
  root.style.setProperty('--pos-accent-on', tokens.accentOn);
  root.style.setProperty('--pos-accent-text', tokens.accentText);
}
