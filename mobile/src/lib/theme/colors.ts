import { Theme } from './ThemeContext';

export const THEME_COLORS = {
  light: {
    background: '#F8F8F8',
    surface: '#FFFFFF',
    surfaceSecondary: '#F3F4F6',
    border: '#E5E7EB',
    borderLight: '#D1D5DB',
    text: '#1F2937',
    textSecondary: '#6B7280',
    textMuted: '#9CA3AF',
    primary: '#F97316',
    primaryLight: '#FFF7ED',
    success: '#22C55E',
    error: '#EF4444',
    warning: '#F59E0B',
    glass: 'rgba(255, 255, 255, 0.95)',
    glassLight: 'rgba(255, 255, 255, 0.42)',
  },
  dark: {
    background: '#0A0A0A',
    surface: '#1A1A1A',
    surfaceSecondary: '#2D2D2D',
    border: 'rgba(255, 255, 255, 0.08)',
    borderLight: 'rgba(255, 255, 255, 0.12)',
    text: '#FFFFFF',
    textSecondary: '#D1D5DB',
    textMuted: '#9CA3AF',
    primary: '#FA5610',
    primaryLight: 'rgba(249, 115, 22, 0.15)',
    success: '#22C55E',
    error: '#EF4444',
    warning: '#F59E0B',
    glass: 'rgba(26, 26, 26, 0.95)',
    glassLight: 'rgba(26, 26, 26, 0.42)',
  },
};

export function getThemeColors(theme: Theme) {
  return THEME_COLORS[theme];
}

export type ThemeColors = typeof THEME_COLORS.light;
