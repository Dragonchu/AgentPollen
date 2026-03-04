/**
 * Game UI theme - aligned with landing-globals.css
 * Colors in hex for Phaser (0xRRGGBB)
 */
export const THEME = {
  colors: {
    primary: 0x00d4ff,
    accent: 0xff8000,
    background: 0x070a12,
    card: 0x0a0f1a,
    secondary: 0x1a1f2e,
    muted: 0x151922,
    mutedForeground: 0x6b7a8f,
    destructive: 0xe54f4f,
    border: 0x212938,
    arenaDark: 0x050810,
    foreground: 0xe2e8f0,
  },
  /** CSS color strings for Phaser text (e.g. "#00D4FF") */
  css: {
    primary: '#00D4FF',
    accent: '#FF8000',
    mutedForeground: '#6B7A8F',
    destructive: '#E54F4F',
    foreground: '#E2E8F0',
  },
  spacing: {
    small: 12,
    medium: 16,
    radius: 8,
  },
  /** Minimum touch target size (px) */
  minTouchTarget: 44,
  font: {
    title: '16px',
    body: '13px',
    small: '11px',
    label: '11px',
  },
} as const;
