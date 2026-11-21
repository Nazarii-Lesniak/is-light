import type { ThemeId } from '@is-light/shared';

export interface AppTheme {
  id: ThemeId;
  name: string;
  subtitle: string;
  isDark: boolean;
  previewColors: [string, string, string];
  bg: string;
  surface: string;
  surfaceMuted: string;
  surfaceInput: string;
  border: string;
  borderSubtle: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  accent: string;
  accentSoft: string;
  accentText: string;
  accentOnSolid: string;
  onBg: string;
  onBorder: string;
  onText: string;
  onIcon: string;
  onHalfBg: string;
  offBg: string;
  offBorder: string;
  offText: string;
  offIcon: string;
  offHalfBg: string;
  partialBorder: string;
  partialIcon: string;
  partialText: string;
  unknownBg: string;
  unknownBorder: string;
  unknownText: string;
  tooltipBg: string;
  tooltipText: string;
  segmentTrack: string;
  segmentActiveBg: string;
  segmentActiveBorder: string;
  glassTint: 'light' | 'dark' | 'systemChromeMaterialLight' | 'systemChromeMaterialDark';
  glassOverlay: string;
  glassBorder: string;
  glassActivePill: string;
  tabInactive: string;
  dangerBg: string;
  dangerBorder: string;
  dangerText: string;
  warningBg: string;
  warningBorder: string;
  warningText: string;
}

export const APP_THEMES: Readonly<Record<ThemeId, AppTheme>> = {
  light: {
    id: 'light',
    name: 'Світла',
    subtitle: 'Чистий мінімалізм',
    isDark: false,
    previewColors: ['#F8FAFC', '#FFFFFF', '#4F46E5'],
    bg: '#F4F6FA',
    surface: '#FFFFFF',
    surfaceMuted: '#EEF2F7',
    surfaceInput: '#F8FAFC',
    border: '#E2E8F0',
    borderSubtle: '#F1F5F9',
    text: '#0F172A',
    textSecondary: '#475569',
    textMuted: '#64748B',
    accent: '#4F46E5',
    accentSoft: '#E0E7FF',
    accentText: '#4338CA',
    accentOnSolid: '#FFFFFF',
    onBg: '#ECFDF5',
    onBorder: '#A7F3D0',
    onText: '#065F46',
    onIcon: '#059669',
    onHalfBg: '#D1FAE5',
    offBg: '#FFE4E6',
    offBorder: '#FDA4AF',
    offText: '#881337',
    offIcon: '#E11D48',
    offHalfBg: '#FECDD3',
    partialBorder: '#FCD34D',
    partialIcon: '#B45309',
    partialText: '#0F172A',
    unknownBg: '#F1F5F9',
    unknownBorder: '#E2E8F0',
    unknownText: '#64748B',
    tooltipBg: '#0F172A',
    tooltipText: '#FFFFFF',
    segmentTrack: '#E2E8F0',
    segmentActiveBg: '#FFFFFF',
    segmentActiveBorder: '#CBD5E1',
    glassTint: 'systemChromeMaterialLight',
    glassOverlay: 'rgba(255, 255, 255, 0.72)',
    glassBorder: 'rgba(255, 255, 255, 0.9)',
    glassActivePill: 'rgba(79, 70, 229, 0.13)',
    tabInactive: '#64748B',
    dangerBg: '#FFF1F2',
    dangerBorder: '#FECDD3',
    dangerText: '#BE123C',
    warningBg: '#FFFBEB',
    warningBorder: '#FDE68A',
    warningText: '#92400E',
  },
  midnight: {
    id: 'midnight',
    name: 'Нічна',
    subtitle: 'Глибокий OLED індиго',
    isDark: true,
    previewColors: ['#090E1A', '#131C31', '#818CF8'],
    bg: '#090E1A',
    surface: '#131C31',
    surfaceMuted: '#1B2742',
    surfaceInput: '#0F172A',
    border: '#253354',
    borderSubtle: '#1A2540',
    text: '#F8FAFC',
    textSecondary: '#CBD5E1',
    textMuted: '#94A3B8',
    accent: '#818CF8',
    accentSoft: 'rgba(129, 140, 248, 0.18)',
    accentText: '#C7D2FE',
    accentOnSolid: '#0B1020',
    onBg: 'rgba(16, 185, 129, 0.14)',
    onBorder: 'rgba(52, 211, 153, 0.35)',
    onText: '#A7F3D0',
    onIcon: '#34D399',
    onHalfBg: 'rgba(16, 185, 129, 0.22)',
    offBg: 'rgba(244, 63, 94, 0.18)',
    offBorder: 'rgba(251, 113, 133, 0.42)',
    offText: '#FECDD3',
    offIcon: '#FB7185',
    offHalfBg: 'rgba(244, 63, 94, 0.3)',
    partialBorder: 'rgba(251, 191, 36, 0.45)',
    partialIcon: '#FBBF24',
    partialText: '#F8FAFC',
    unknownBg: '#182238',
    unknownBorder: '#263452',
    unknownText: '#94A3B8',
    tooltipBg: '#E2E8F0',
    tooltipText: '#0F172A',
    segmentTrack: '#152038',
    segmentActiveBg: '#233256',
    segmentActiveBorder: '#344875',
    glassTint: 'systemChromeMaterialDark',
    glassOverlay: 'rgba(15, 23, 42, 0.76)',
    glassBorder: 'rgba(148, 163, 184, 0.22)',
    glassActivePill: 'rgba(129, 140, 248, 0.22)',
    tabInactive: '#94A3B8',
    dangerBg: 'rgba(244, 63, 94, 0.16)',
    dangerBorder: 'rgba(251, 113, 133, 0.38)',
    dangerText: '#FDA4AF',
    warningBg: 'rgba(245, 158, 11, 0.16)',
    warningBorder: 'rgba(251, 191, 36, 0.38)',
    warningText: '#FDE68A',
  },
  graphite: {
    id: 'graphite',
    name: 'Графіт',
    subtitle: 'Теплий темний з бурштином',
    isDark: true,
    previewColors: ['#131316', '#1E1E24', '#F59E0B'],
    bg: '#131316',
    surface: '#1D1D22',
    surfaceMuted: '#28282F',
    surfaceInput: '#18181C',
    border: '#32323B',
    borderSubtle: '#26262E',
    text: '#FAFAFA',
    textSecondary: '#D4D4D8',
    textMuted: '#A1A1AA',
    accent: '#F59E0B',
    accentSoft: 'rgba(245, 158, 11, 0.18)',
    accentText: '#FDE68A',
    accentOnSolid: '#18181B',
    onBg: 'rgba(34, 197, 94, 0.14)',
    onBorder: 'rgba(74, 222, 128, 0.34)',
    onText: '#BBF7D0',
    onIcon: '#4ADE80',
    onHalfBg: 'rgba(34, 197, 94, 0.22)',
    offBg: 'rgba(239, 68, 68, 0.18)',
    offBorder: 'rgba(248, 113, 113, 0.42)',
    offText: '#FECACA',
    offIcon: '#F87171',
    offHalfBg: 'rgba(239, 68, 68, 0.3)',
    partialBorder: 'rgba(251, 191, 36, 0.48)',
    partialIcon: '#FBBF24',
    partialText: '#FAFAFA',
    unknownBg: '#23232A',
    unknownBorder: '#34343E',
    unknownText: '#A1A1AA',
    tooltipBg: '#F4F4F5',
    tooltipText: '#18181B',
    segmentTrack: '#1F1F25',
    segmentActiveBg: '#2F2F38',
    segmentActiveBorder: '#434350',
    glassTint: 'dark',
    glassOverlay: 'rgba(24, 24, 28, 0.78)',
    glassBorder: 'rgba(255, 255, 255, 0.14)',
    glassActivePill: 'rgba(245, 158, 11, 0.2)',
    tabInactive: '#A1A1AA',
    dangerBg: 'rgba(239, 68, 68, 0.16)',
    dangerBorder: 'rgba(248, 113, 113, 0.36)',
    dangerText: '#FCA5A5',
    warningBg: 'rgba(245, 158, 11, 0.16)',
    warningBorder: 'rgba(251, 191, 36, 0.36)',
    warningText: '#FDE68A',
  },
  ocean: {
    id: 'ocean',
    name: 'Океан',
    subtitle: 'Глибокий бірюзовий',
    isDark: true,
    previewColors: ['#06151E', '#0D2432', '#22D3EE'],
    bg: '#06151E',
    surface: '#0D2432',
    surfaceMuted: '#143347',
    surfaceInput: '#0A1C28',
    border: '#1D4259',
    borderSubtle: '#132F40',
    text: '#ECFEFF',
    textSecondary: '#BAE6FD',
    textMuted: '#7DD3FC',
    accent: '#22D3EE',
    accentSoft: 'rgba(34, 211, 238, 0.16)',
    accentText: '#A5F3FC',
    accentOnSolid: '#06151E',
    onBg: 'rgba(16, 185, 129, 0.15)',
    onBorder: 'rgba(52, 211, 153, 0.36)',
    onText: '#A7F3D0',
    onIcon: '#34D399',
    onHalfBg: 'rgba(16, 185, 129, 0.24)',
    offBg: 'rgba(244, 63, 94, 0.18)',
    offBorder: 'rgba(251, 113, 133, 0.42)',
    offText: '#FECDD3',
    offIcon: '#FB7185',
    offHalfBg: 'rgba(244, 63, 94, 0.3)',
    partialBorder: 'rgba(251, 191, 36, 0.48)',
    partialIcon: '#FBBF24',
    partialText: '#ECFEFF',
    unknownBg: '#102A3A',
    unknownBorder: '#1D4259',
    unknownText: '#7DD3FC',
    tooltipBg: '#ECFEFF',
    tooltipText: '#06151E',
    segmentTrack: '#0C212E',
    segmentActiveBg: '#173A4F',
    segmentActiveBorder: '#24526E',
    glassTint: 'dark',
    glassOverlay: 'rgba(9, 28, 40, 0.78)',
    glassBorder: 'rgba(125, 211, 252, 0.22)',
    glassActivePill: 'rgba(34, 211, 238, 0.2)',
    tabInactive: '#7DD3FC',
    dangerBg: 'rgba(244, 63, 94, 0.16)',
    dangerBorder: 'rgba(251, 113, 133, 0.38)',
    dangerText: '#FDA4AF',
    warningBg: 'rgba(245, 158, 11, 0.16)',
    warningBorder: 'rgba(251, 191, 36, 0.38)',
    warningText: '#FDE68A',
  },
  cream: {
    id: 'cream',
    name: 'Кремова',
    subtitle: 'Мʼякий теплий папір',
    isDark: false,
    previewColors: ['#F9F5EE', '#FFFDF9', '#D97706'],
    bg: '#F7F2E9',
    surface: '#FFFDF9',
    surfaceMuted: '#EFE7DA',
    surfaceInput: '#F9F5EE',
    border: '#E4D9C8',
    borderSubtle: '#EFE8DC',
    text: '#1C1917',
    textSecondary: '#57534E',
    textMuted: '#78716C',
    accent: '#D97706',
    accentSoft: '#FEF3C7',
    accentText: '#B45309',
    accentOnSolid: '#FFFFFF',
    onBg: '#ECFDF5',
    onBorder: '#A7F3D0',
    onText: '#065F46',
    onIcon: '#059669',
    onHalfBg: '#D1FAE5',
    offBg: '#FFE4E6',
    offBorder: '#FDA4AF',
    offText: '#881337',
    offIcon: '#E11D48',
    offHalfBg: '#FECDD3',
    partialBorder: '#F59E0B',
    partialIcon: '#B45309',
    partialText: '#1C1917',
    unknownBg: '#F2ECE2',
    unknownBorder: '#E4D9C8',
    unknownText: '#78716C',
    tooltipBg: '#1C1917',
    tooltipText: '#FFFDF9',
    segmentTrack: '#EAE0D0',
    segmentActiveBg: '#FFFDF9',
    segmentActiveBorder: '#D9CBB5',
    glassTint: 'light',
    glassOverlay: 'rgba(255, 253, 249, 0.78)',
    glassBorder: 'rgba(255, 255, 255, 0.92)',
    glassActivePill: 'rgba(217, 119, 6, 0.14)',
    tabInactive: '#78716C',
    dangerBg: '#FFF1F2',
    dangerBorder: '#FECDD3',
    dangerText: '#BE123C',
    warningBg: '#FEF3C7',
    warningBorder: '#FCD34D',
    warningText: '#92400E',
  },
};

export const THEME_LIST: readonly AppTheme[] = [
  APP_THEMES.light,
  APP_THEMES.midnight,
  APP_THEMES.graphite,
  APP_THEMES.ocean,
  APP_THEMES.cream,
];
