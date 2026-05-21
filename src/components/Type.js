import { Text } from 'react-native';
import { type } from '../constants/tokens';

const make = (preset) => function TypeVariant({ style, children, ...rest }) {
  return <Text {...rest} style={[preset, style]}>{children}</Text>;
};

export const Display    = make(type.display);
export const DisplayLg  = make(type.displayLg);
export const HeroSerif  = make(type.heroSerif);
export const H1Serif    = make(type.h1Serif);
export const H2Serif    = make(type.h2Serif);
export const H2         = make(type.h2);
export const H3         = make(type.h3);
export const BodyLg     = make(type.bodyLg);
export const Body       = make(type.body);
export const BodyMd     = make(type.bodyMd);
export const Caption    = make(type.caption);
export const Small      = make(type.small);
export const Label      = make(type.label);
export const Mono       = make(type.mono);
export const MonoSm     = make(type.monoSm);
