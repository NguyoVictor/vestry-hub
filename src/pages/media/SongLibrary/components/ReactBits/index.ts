/**
 * React Bits Components Integration Index
 * 
 * NOTE: Due to compatibility issues with react-bits and Vite/React Native Web,
 * we're using simple Framer Motion-based replacements for the components.
 * These provide similar visual effects without the dependency issues.
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6
 */

// Export simple replacements that work with Vite
export {
  ShinyPageTitle,
  SpotlightCard,
  TiltedCard,
  MagneticButton,
  FadeContent,
  BlurText,
} from './SimpleReplacements';

// Original React Bits components (commented out due to compatibility issues)
// If you need the full react-bits functionality, you'll need to:
// 1. Fix the react-native-web subpath imports
// 2. Configure Vite to handle CommonJS modules properly
// 3. Add proper polyfills for React Native APIs

/*
// BlurText components
export {
  BlurText,
  SongTitleBlur,
  SectionHeadingBlur,
  InteractiveBlurText,
  LoadingBlurText,
} from './BlurText';

// SpotlightCard components
export {
  SpotlightCard,
  FeaturedSongCard,
  CompactSpotlightCard,
  TrendingSongCard,
} from './SpotlightCard';

// TiltedCard components
export {
  TiltedCard,
  InteractiveTiltedCard,
  CompactTiltedCard,
  ShowcaseTiltedCard,
} from './TiltedCard';

// ShinyText components
export {
  ShinyText,
  ShinyPageTitle,
  ShinySectionHeading,
  ShinyButtonText,
  ShinyCallToAction,
  ShinyLabel,
} from './ShinyText';

// Magnet components
export {
  Magnet,
  MagneticButton,
  MagneticCard,
  MagneticIcon,
  MagneticText,
  MagneticPlayButton,
  MagneticNavItem,
} from './Magnet';

// FadeContent components
export {
  FadeContent,
  FadeInContent,
  StaggeredFadeItem,
  ModalFadeContent,
  PageFadeTransition,
  CardRevealFade,
  TextFadeReveal,
  ButtonFadeIn,
} from './FadeContent';

// Re-export default components
export { default as BlurTextDefault } from './BlurText';
export { default as SpotlightCardDefault } from './SpotlightCard';
export { default as TiltedCardDefault } from './TiltedCard';
export { default as ShinyTextDefault } from './ShinyText';
export { default as MagnetDefault } from './Magnet';
export { default as FadeContentDefault } from './FadeContent';
*/