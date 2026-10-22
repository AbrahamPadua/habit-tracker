import { Platform, useColorScheme, type TextStyle } from 'react-native';

// Index card world: card stock, blue rules, blue-black ink, and two stamp inks.
// Stamp inks are reserved for stamps, punches and each person's own count; controls use neutral `action`. No red anywhere.
const light = {
  ground: '#E9ECF1',
  card: '#FBFBFC',
  rule: '#D2DCEA',
  ink: '#1B2030',
  muted: '#566074',
  faint: '#646D80',
  me: '#5B3FB5',
  partner: '#0E7066',
  action: '#1B2030',
  onAction: '#FBFBFC',
  tonal: '#DCE2EB',
  // My ink mixed toward the card for 1, 2-3 and 4+ stamps a day; lightest step stays above 2:1 on the card.
  heat: ['#B3A6DC', '#8B77CA', '#5B3FB5'],
  // The tuxedo cat's outline: its own fur color here, a soft grey on dark cards so the black fur doesn't vanish.
  catRim: '#26272E',
};

const dark: typeof light = {
  ground: '#0F1115',
  card: '#181B22',
  rule: '#2A3243',
  ink: '#E7E9EF',
  muted: '#A3ABBC',
  faint: '#8C95A8',
  me: '#B6A5FF',
  partner: '#62D3C3',
  action: '#E7E9EF',
  onAction: '#14161C',
  tonal: '#262C38',
  heat: ['#5F5985', '#877CBD', '#B6A5FF'],
  catRim: '#4E5462',
};

export type Theme = typeof light;

export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? dark : light;
}

const mono = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' });

// Material type roles; sizes scale with the system font setting.
export const type = {
  display: { fontSize: 40, lineHeight: 44, fontWeight: '700', letterSpacing: -1 },
  headline: { fontSize: 24, lineHeight: 30, fontWeight: '600', letterSpacing: -0.3 },
  title: { fontSize: 17, lineHeight: 22, fontWeight: '600' },
  body: { fontSize: 16, lineHeight: 22 },
  meta: { fontSize: 13, lineHeight: 18 },
  label: { fontSize: 12, lineHeight: 16, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' },
  stamp: { fontFamily: mono, fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
} satisfies Record<string, TextStyle>;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
