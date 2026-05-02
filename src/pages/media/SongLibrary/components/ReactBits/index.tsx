/**
 * React Bits Components Integration Index
 * 
 * Centralized exports for all React Bits component integrations
 * in the Song Library UI Revamp.
 * 
 * This module provides:
 * - All React Bits component wrappers
 * - Preset variants for common use cases
 * - Consistent theming and animation controls
 * - Song Library specific enhancements
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6
 */

// BlurText Components
export {
  BlurText,
  SongTitleBlur,
  SectionHeadingBlur,
  InteractiveBlurText,
  LoadingBlurText,
} from './BlurText';

// SpotlightCard Components
export {
  SpotlightCard,
  FeaturedSongCard,
  CompactSpotlightCard,
  TrendingSongCard,
} from './SpotlightCard';

// TiltedCard Components
export {
  TiltedCard,
  InteractiveSongCard,
  SubtleTiltCard,
  PremiumTiltCard,
} from './TiltedCard';

// ShinyText Components
export {
  ShinyText,
  PageHeadingShiny,
  SectionHeadingShiny,
  InteractiveShinyText,
  FeaturedShinyText,
  LabelShiny,
} from './ShinyText';

// Magnet Components
export {
  Magnet,
  MagneticButton,
  MagneticSongCard,
  MagneticNavItem,
  MagneticIcon,
  MagneticText,
  MagneticFAB,
} from './Magnet';

// FadeContent Components
export {
  FadeContent,
  ViewTransitionFade,
  LoadingFade,
  SearchResultsFade,
  ModalContentFade,
  PageContentFade,
  SidebarContentFade,
  CardContentFade,
  NotificationFade,
  TooltipContentFade,
} from './FadeContent';

// Re-export types for external use
export type { default as BlurTextProps } from './BlurText';
export type { default as SpotlightCardProps } from './SpotlightCard';
export type { default as TiltedCardProps } from './TiltedCard';
export type { default as ShinyTextProps } from './ShinyText';
export type { default as MagnetProps } from './Magnet';
export type { default as FadeContentProps } from './FadeContent';