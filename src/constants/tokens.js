// Design tokens — kept in sync with web (src/index.css / App.css)

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 56,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  pill: 999,
};

export const shadow = {
  sm: {
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
};

export const fonts = {
  serif: 'DMSerifDisplay_400Regular',
  serifItalic: 'DMSerifDisplay_400Regular_Italic',
  body: 'Outfit_400Regular',
  bodyMedium: 'Outfit_500Medium',
  bodySemibold: 'Outfit_600SemiBold',
  bodyBold: 'Outfit_700Bold',
  mono: 'JetBrainsMono_400Regular',
  monoMedium: 'JetBrainsMono_500Medium',
  monoBold: 'JetBrainsMono_700Bold',
};

export const type = {
  // Display — large hero amounts (monospace, tabular)
  display: { fontFamily: fonts.monoMedium, fontSize: 40, letterSpacing: -1.2 },
  displayLg: { fontFamily: fonts.monoMedium, fontSize: 48, letterSpacing: -1.4 },

  // Serif — editorial headlines
  heroSerif: { fontFamily: fonts.serif, fontSize: 44, lineHeight: 50, letterSpacing: -1 },
  h1Serif: { fontFamily: fonts.serif, fontSize: 32, lineHeight: 38, letterSpacing: -0.6 },
  h2Serif: { fontFamily: fonts.serif, fontSize: 24, lineHeight: 30, letterSpacing: -0.4 },

  // Sans — body & UI
  h2: { fontFamily: fonts.bodySemibold, fontSize: 20, lineHeight: 26, letterSpacing: -0.3 },
  h3: { fontFamily: fonts.bodySemibold, fontSize: 17, lineHeight: 22, letterSpacing: -0.2 },
  bodyLg: { fontFamily: fonts.body, fontSize: 16, lineHeight: 24 },
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22 },
  bodyMd: { fontFamily: fonts.bodyMedium, fontSize: 14, lineHeight: 20 },
  caption: { fontFamily: fonts.body, fontSize: 13, lineHeight: 19 },
  small: { fontFamily: fonts.body, fontSize: 12, lineHeight: 17 },

  // Editorial label (replaces UPPERCASE+letterSpacing spam)
  label: { fontFamily: fonts.bodyMedium, fontSize: 10, letterSpacing: 1.8, textTransform: 'uppercase' },

  // Mono — numbers, codes
  mono: { fontFamily: fonts.mono, fontSize: 14 },
  monoSm: { fontFamily: fonts.mono, fontSize: 12 },
};

export const tokens = { spacing, radius, shadow, fonts, type };
export default tokens;
