/**
 * Enhanced Gradient Generation System for Song Library UI Revamp
 * 
 * Generates consistent gradient patterns for songs without cover art:
 * - Deterministic gradients based on song title and artist
 * - Multiple gradient styles (linear, radial, conic)
 * - Advanced color palette management with seasonal variations
 * - Comprehensive fallback gradient system
 * - Gradient customization and variation algorithms
 * - Performance-optimized caching system
 * 
 * Requirements: 5.2, 5.5, 5.7
 */

import type { GradientConfig } from '@/types/song-library';

// Enhanced color palettes organized by mood and style with expanded customization
const COLOR_PALETTES = {
  // Warm and energetic palettes
  warm: [
    ['#ff6b6b', '#feca57', '#ff9ff3'], // Red to Yellow to Pink
    ['#ff9500', '#ff5722', '#e91e63'], // Orange to Deep Orange to Pink
    ['#ffa726', '#ff7043', '#d84315'], // Orange gradient
    ['#ffb74d', '#ff8a65', '#ff5722'], // Warm sunset
    ['#ff8a80', '#ff5722', '#bf360c'], // Coral to deep red
    ['#ff7043', '#ffab40', '#ffc107'], // Warm amber flow
    ['#e57373', '#f06292', '#ba68c8'], // Warm pink to purple
    ['#ffcc02', '#ff9800', '#ff5722'], // Golden fire
  ],
  
  // Cool and calming palettes
  cool: [
    ['#26c6da', '#42a5f5', '#5c6bc0'], // Cyan to Blue to Indigo
    ['#66bb6a', '#26a69a', '#00695c'], // Green to Teal
    ['#81c784', '#4fc3f7', '#29b6f6'], // Light green to sky blue
    ['#4dd0e1', '#26c6da', '#0097a7'], // Aqua gradient
    ['#80cbc4', '#4db6ac', '#26a69a'], // Mint gradient
    ['#64b5f6', '#42a5f5', '#2196f3'], // Sky blue cascade
    ['#4fc3f7', '#29b6f6', '#03a9f4'], // Ocean depths
    ['#81c784', '#66bb6a', '#4caf50'], // Forest greens
    ['#a5d6a7', '#81c784', '#66bb6a'], // Soft meadow
  ],
  
  // Vibrant and dynamic palettes
  vibrant: [
    ['#e91e63', '#9c27b0', '#673ab7'], // Pink to Purple to Deep Purple
    ['#3f51b5', '#2196f3', '#03a9f4'], // Indigo to Blue to Light Blue
    ['#009688', '#4caf50', '#8bc34a'], // Teal to Green to Light Green
    ['#ff5722', '#ff9800', '#ffc107'], // Deep Orange to Orange to Amber
    ['#9c27b0', '#e91e63', '#f44336'], // Purple to Pink to Red
    ['#673ab7', '#3f51b5', '#2196f3'], // Deep purple to blue
    ['#f44336', '#ff5722', '#ff9800'], // Red fire cascade
    ['#8bc34a', '#4caf50', '#009688'], // Lime to teal
    ['#ffc107', '#ff9800', '#ff5722'], // Golden to orange fire
  ],
  
  // Subtle and professional palettes
  subtle: [
    ['#f5f5f5', '#e0e0e0', '#bdbdbd'], // Light greys
    ['#fff3e0', '#ffe0b2', '#ffcc80'], // Light oranges
    ['#e8f5e8', '#c8e6c9', '#a5d6a7'], // Light greens
    ['#e3f2fd', '#bbdefb', '#90caf9'], // Light blues
    ['#fce4ec', '#f8bbd9', '#f48fb1'], // Light pinks
  ],
  
  // Dark mode optimized palettes
  dark: [
    ['#1a1a1a', '#2d2d2d', '#404040'], // Dark greys
    ['#0d1421', '#1e293b', '#334155'], // Dark blue greys
    ['#1f2937', '#374151', '#4b5563'], // Dark slate
    ['#18181b', '#27272a', '#3f3f46'], // Dark zinc
    ['#0c0a09', '#1c1917', '#292524'], // Dark stone
  ],
  
  // Seasonal palettes
  spring: [
    ['#81c784', '#aed581', '#c5e1a5'], // Fresh greens
    ['#ffb74d', '#ffcc02', '#fff176'], // Sunny yellows
    ['#f8bbd9', '#f48fb1', '#e91e63'], // Cherry blossoms
  ],
  
  summer: [
    ['#29b6f6', '#03a9f4', '#00bcd4'], // Ocean blues
    ['#ff7043', '#ff5722', '#d84315'], // Sunset oranges
    ['#66bb6a', '#4caf50', '#388e3c'], // Lush greens
  ],
  
  autumn: [
    ['#ff8a65', '#ff7043', '#ff5722'], // Autumn leaves
    ['#ffb74d', '#ffa726', '#ff9800'], // Golden harvest
    ['#a1887f', '#8d6e63', '#6d4c41'], // Earth tones
  ],
  
  winter: [
    ['#90caf9', '#64b5f6', '#42a5f5'], // Winter blues
    ['#b39ddb', '#9575cd', '#7e57c2'], // Twilight purples
    ['#e0e0e0', '#bdbdbd', '#9e9e9e'], // Frost greys
  ]
};

// Comprehensive gradient direction options
const GRADIENT_DIRECTIONS = [
  'to right',
  'to bottom right', 
  'to bottom',
  'to bottom left',
  'to left',
  'to top left',
  'to top',
  'to top right',
  '45deg',
  '135deg',
  '225deg',
  '315deg',
  '60deg',
  '120deg',
  '240deg',
  '300deg',
];

// Gradient type weights for variation
const GRADIENT_TYPE_WEIGHTS = {
  linear: 0.6,   // 60% linear gradients
  radial: 0.3,   // 30% radial gradients
  conic: 0.1     // 10% conic gradients
};

// Cache for generated gradients to ensure consistency
const gradientCache = new Map<string, GradientConfig>();

/**
 * Enhanced deterministic hash function with better distribution
 */
function hashString(str: string): number {
  let hash = 5381; // DJB2 hash algorithm for better distribution
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
  }
  return Math.abs(hash);
}

/**
 * Get current season for seasonal palette selection
 */
function getCurrentSeason(): keyof typeof COLOR_PALETTES {
  const month = new Date().getMonth();
  if (month >= 2 && month <= 4) return 'spring';
  if (month >= 5 && month <= 7) return 'summer';
  if (month >= 8 && month <= 10) return 'autumn';
  return 'winter';
}

/**
 * Select appropriate palette category based on song characteristics
 */
function selectPaletteCategory(title: string, artist?: string): keyof typeof COLOR_PALETTES {
  const text = `${title}${artist || ''}`.toLowerCase();
  
  // Analyze text for mood indicators
  const energeticWords = ['dance', 'party', 'celebration', 'joy', 'praise', 'victory', 'triumph'];
  const calmWords = ['peace', 'rest', 'quiet', 'still', 'gentle', 'grace', 'mercy'];
  const vibrantWords = ['power', 'mighty', 'strong', 'fire', 'light', 'glory'];
  
  const hasEnergeticWords = energeticWords.some(word => text.includes(word));
  const hasCalmWords = calmWords.some(word => text.includes(word));
  const hasVibrantWords = vibrantWords.some(word => text.includes(word));
  
  // Use theme detection for palette selection
  const isDarkMode = document.documentElement.classList.contains('dark');
  
  if (isDarkMode) {
    return 'dark';
  } else if (hasEnergeticWords) {
    return 'warm';
  } else if (hasCalmWords) {
    return 'cool';
  } else if (hasVibrantWords) {
    return 'vibrant';
  } else {
    // Use seasonal palettes as default
    return getCurrentSeason();
  }
}

/**
 * Generate gradient type based on weighted random selection
 */
function selectGradientType(hash: number): 'linear' | 'radial' | 'conic' {
  const normalizedHash = (hash % 1000) / 1000; // Normalize to 0-1
  
  if (normalizedHash < GRADIENT_TYPE_WEIGHTS.linear) {
    return 'linear';
  } else if (normalizedHash < GRADIENT_TYPE_WEIGHTS.linear + GRADIENT_TYPE_WEIGHTS.radial) {
    return 'radial';
  } else {
    return 'conic';
  }
}

/**
 * Advanced gradient customization algorithms
 * Generate gradients with sophisticated pattern recognition
 */
export function generateAdvancedGradient(
  title: string, 
  artist?: string, 
  options: {
    mood?: 'energetic' | 'calm' | 'worship' | 'celebration' | 'reflective';
    intensity?: 'subtle' | 'moderate' | 'vibrant';
    complexity?: 'simple' | 'complex';
    seasonalAdjustment?: boolean;
  } = {}
): GradientConfig {
  const {
    mood = 'worship',
    intensity = 'moderate',
    complexity = 'simple',
    seasonalAdjustment = true
  } = options;

  // Create enhanced cache key with options
  const cacheKey = `${title}${artist || ''}_${mood}_${intensity}_${complexity}`.toLowerCase().trim();
  
  // Check cache first
  if (gradientCache.has(cacheKey)) {
    return gradientCache.get(cacheKey)!;
  }

  const seed = cacheKey.replace(/\s+/g, '');
  const hash = hashString(seed);

  // Advanced mood-based palette selection
  let paletteCategory: keyof typeof COLOR_PALETTES;
  switch (mood) {
    case 'energetic':
    case 'celebration':
      paletteCategory = intensity === 'vibrant' ? 'vibrant' : 'warm';
      break;
    case 'calm':
    case 'reflective':
      paletteCategory = intensity === 'subtle' ? 'subtle' : 'cool';
      break;
    case 'worship':
    default:
      // Use seasonal adjustment for worship songs
      if (seasonalAdjustment) {
        paletteCategory = getCurrentSeason();
      } else {
        paletteCategory = selectPaletteCategory(title, artist);
      }
      break;
  }

  // Apply intensity adjustments
  const availablePalettes = COLOR_PALETTES[paletteCategory];
  let selectedPalette = availablePalettes[hash % availablePalettes.length];

  // Intensity-based color adjustments
  if (intensity === 'subtle') {
    selectedPalette = selectedPalette.map(color => adjustColorIntensity(color, 0.7));
  } else if (intensity === 'vibrant') {
    selectedPalette = selectedPalette.map(color => adjustColorIntensity(color, 1.3));
  }

  // Complexity-based gradient configuration
  const gradientType = complexity === 'complex' 
    ? selectComplexGradientType(hash)
    : selectGradientType(hash);

  // Advanced direction selection for complex gradients
  let direction: string | undefined;
  if (gradientType === 'linear') {
    if (complexity === 'complex') {
      // Use more sophisticated angles for complex gradients
      const complexAngles = ['25deg', '65deg', '115deg', '155deg', '205deg', '245deg', '295deg', '335deg'];
      direction = complexAngles[hash % complexAngles.length];
    } else {
      const directionIndex = Math.floor(hash / availablePalettes.length) % GRADIENT_DIRECTIONS.length;
      direction = GRADIENT_DIRECTIONS[directionIndex];
    }
  }

  // Color count based on complexity
  const colorCount = complexity === 'complex' 
    ? Math.min(2 + (hash % 3), selectedPalette.length) // 2-4 colors
    : Math.min(2 + (hash % 2), selectedPalette.length); // 2-3 colors

  const colors = selectedPalette.slice(0, colorCount);

  // Advanced color stop distribution
  const stops = generateAdvancedColorStops(colors.length, complexity, hash);

  const gradient: GradientConfig = {
    type: gradientType,
    colors,
    direction,
    stops,
  };

  // Cache the result
  gradientCache.set(cacheKey, gradient);
  
  return gradient;
}

/**
 * Adjust color intensity for subtle/vibrant effects
 */
function adjustColorIntensity(hexColor: string, factor: number): string {
  // Convert hex to RGB
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);

  // Adjust intensity
  const adjustedR = Math.min(255, Math.max(0, Math.round(r * factor)));
  const adjustedG = Math.min(255, Math.max(0, Math.round(g * factor)));
  const adjustedB = Math.min(255, Math.max(0, Math.round(b * factor)));

  // Convert back to hex
  return `#${adjustedR.toString(16).padStart(2, '0')}${adjustedG.toString(16).padStart(2, '0')}${adjustedB.toString(16).padStart(2, '0')}`;
}

/**
 * Select complex gradient types with weighted distribution
 */
function selectComplexGradientType(hash: number): 'linear' | 'radial' | 'conic' {
  const complexWeights = {
    linear: 0.4,   // 40% linear gradients
    radial: 0.4,   // 40% radial gradients  
    conic: 0.2     // 20% conic gradients (more complex)
  };

  const normalizedHash = (hash % 1000) / 1000;
  
  if (normalizedHash < complexWeights.linear) {
    return 'linear';
  } else if (normalizedHash < complexWeights.linear + complexWeights.radial) {
    return 'radial';
  } else {
    return 'conic';
  }
}

/**
 * Generate advanced color stops for more sophisticated gradients
 */
function generateAdvancedColorStops(colorCount: number, complexity: 'simple' | 'complex', hash: number): number[] {
  if (complexity === 'simple') {
    // Standard even distribution
    if (colorCount === 2) return [0, 100];
    if (colorCount === 3) return [0, 50, 100];
    if (colorCount === 4) return [0, 33, 66, 100];
  }

  // Complex distribution with slight randomization
  const stops: number[] = [0]; // Always start at 0
  
  if (colorCount > 2) {
    const baseStep = 100 / (colorCount - 1);
    for (let i = 1; i < colorCount - 1; i++) {
      const basePosition = baseStep * i;
      // Add slight variation based on hash (±10%)
      const variation = ((hash + i * 17) % 20) - 10; // -10 to +10
      const adjustedPosition = Math.max(5, Math.min(95, basePosition + variation));
      stops.push(Math.round(adjustedPosition));
    }
  }
  
  stops.push(100); // Always end at 100
  return stops.sort((a, b) => a - b); // Ensure sorted order
}

/**
 * Generate gradient with enhanced fallback system
 */
export function generateSongGradient(title: string, artist?: string): GradientConfig {
  // Create cache key
  const cacheKey = `${title}${artist || ''}`.toLowerCase().trim();
  
  // Check cache first
  if (gradientCache.has(cacheKey)) {
    return gradientCache.get(cacheKey)!;
  }
  
  // Generate new gradient
  const seed = cacheKey.replace(/\s+/g, '');
  const hash = hashString(seed);
  
  // Select palette category based on song characteristics
  const category = selectPaletteCategory(title, artist);
  const availablePalettes = COLOR_PALETTES[category];
  
  // Select palette
  const paletteIndex = hash % availablePalettes.length;
  const basePalette = availablePalettes[paletteIndex];
  
  // Select gradient type
  const gradientType = selectGradientType(hash);
  
  // Select direction for linear gradients
  const directionIndex = Math.floor(hash / availablePalettes.length) % GRADIENT_DIRECTIONS.length;
  const direction = GRADIENT_DIRECTIONS[directionIndex];
  
  // Determine number of colors (2-3 for better visual appeal)
  const colorCount = 2 + (hash % 2);
  const colors = basePalette.slice(0, Math.min(colorCount, basePalette.length));
  
  // Generate color stops for smoother gradients
  const stops = colors.length === 2 
    ? [0, 100]
    : colors.length === 3 
    ? [0, 50, 100]
    : [0, 33, 66, 100];
  
  const gradient: GradientConfig = {
    type: gradientType,
    colors,
    direction: gradientType === 'linear' ? direction : undefined,
    stops,
  };
  
  // Cache the result
  gradientCache.set(cacheKey, gradient);
  
  return gradient;
}

/**
 * Enhanced CSS gradient generation with support for all gradient types
 */
export function gradientToCss(gradient: GradientConfig): string {
  const { type, colors, direction, stops } = gradient;
  
  let colorStops: string;
  if (stops && stops.length === colors.length) {
    colorStops = colors.map((color, index) => `${color} ${stops[index]}%`).join(', ');
  } else {
    // Auto-distribute colors evenly
    const step = 100 / (colors.length - 1);
    colorStops = colors.map((color, index) => 
      index === 0 ? color : 
      index === colors.length - 1 ? color :
      `${color} ${Math.round(step * index)}%`
    ).join(', ');
  }
  
  switch (type) {
    case 'radial':
      return `radial-gradient(circle at center, ${colorStops})`;
    case 'conic':
      return `conic-gradient(from 0deg at center, ${colorStops})`;
    case 'linear':
    default:
      return `linear-gradient(${direction || 'to right'}, ${colorStops})`;
  }
}

/**
 * Generate multiple gradient variations with enhanced algorithms
 */
export function generateGradientVariations(title: string, artist?: string): GradientConfig[] {
  const baseGradient = generateSongGradient(title, artist);
  const variations: GradientConfig[] = [baseGradient];
  
  try {
    // Variation 1: Different gradient type
    if (baseGradient.type === 'linear') {
      variations.push({
        ...baseGradient,
        type: 'radial',
        direction: undefined,
      });
    } else if (baseGradient.type === 'radial') {
      variations.push({
        ...baseGradient,
        type: 'conic',
        direction: undefined,
      });
    } else {
      variations.push({
        ...baseGradient,
        type: 'linear',
        direction: 'to bottom right',
      });
    }
    
    // Variation 2: Reversed colors
    variations.push({
      ...baseGradient,
      colors: [...baseGradient.colors].reverse(),
    });
    
    // Variation 3: Shifted palette (if available)
    const category = selectPaletteCategory(title, artist);
    const availablePalettes = COLOR_PALETTES[category];
    if (availablePalettes.length > 1) {
      const hash = hashString(`${title}${artist || ''}`);
      const altPaletteIndex = (hash + 1) % availablePalettes.length;
      const altPalette = availablePalettes[altPaletteIndex];
      
      variations.push({
        ...baseGradient,
        colors: altPalette.slice(0, baseGradient.colors.length),
      });
    }
    
    // Variation 4: Different direction (for linear gradients)
    if (baseGradient.type === 'linear') {
      const hash = hashString(`${title}${artist || ''}`);
      const altDirectionIndex = (Math.floor(hash / 100) + 1) % GRADIENT_DIRECTIONS.length;
      const altDirection = GRADIENT_DIRECTIONS[altDirectionIndex];
      
      variations.push({
        ...baseGradient,
        direction: altDirection,
      });
    }

    // Variation 5: Enhanced complexity variation
    const advancedVariation = generateAdvancedGradient(title, artist, {
      mood: 'worship',
      intensity: 'vibrant',
      complexity: 'complex',
      seasonalAdjustment: true,
    });
    variations.push(advancedVariation);

    // Variation 6: Mood-based variation
    const moodVariation = generateAdvancedGradient(title, artist, {
      mood: 'celebration',
      intensity: 'moderate',
      complexity: 'simple',
      seasonalAdjustment: false,
    });
    variations.push(moodVariation);

  } catch (error) {
    console.warn('Error generating some gradient variations:', error);
  }
  
  // Filter out invalid variations and ensure uniqueness
  const validVariations = variations.filter(validateGradient);
  const uniqueVariations = validVariations.filter((variation, index, array) => {
    return array.findIndex(v => 
      JSON.stringify(v.colors) === JSON.stringify(variation.colors) &&
      v.type === variation.type &&
      v.direction === variation.direction
    ) === index;
  });

  return uniqueVariations.slice(0, 6); // Limit to 6 variations for performance
}

/**
 * Enhanced fallback gradient system with multiple options and error recovery
 */
export function getFallbackGradient(
  type: 'default' | 'error' | 'loading' | 'placeholder' | 'network_error' | 'invalid_data' = 'default',
  context?: { songTitle?: string; artistName?: string; errorCode?: string }
): GradientConfig {
  const fallbacks = {
    default: {
      type: 'linear' as const,
      colors: ['#f97316', '#ea580c'], // Orange gradient (brand colors)
      direction: 'to bottom right',
      stops: [0, 100],
    },
    error: {
      type: 'linear' as const,
      colors: ['#ef4444', '#dc2626'], // Red gradient for errors
      direction: 'to bottom right',
      stops: [0, 100],
    },
    loading: {
      type: 'linear' as const,
      colors: ['#e2e8f0', '#cbd5e1'], // Grey gradient for loading
      direction: 'to bottom right',
      stops: [0, 100],
    },
    placeholder: {
      type: 'radial' as const,
      colors: ['#f1f5f9', '#e2e8f0', '#cbd5e1'], // Multi-stop grey
      direction: undefined,
      stops: [0, 50, 100],
    },
    network_error: {
      type: 'linear' as const,
      colors: ['#f59e0b', '#d97706'], // Amber gradient for network issues
      direction: 'to bottom right',
      stops: [0, 100],
    },
    invalid_data: {
      type: 'conic' as const,
      colors: ['#8b5cf6', '#a78bfa', '#c4b5fd'], // Purple gradient for data issues
      direction: undefined,
      stops: [0, 50, 100],
    },
  };
  
  let selectedFallback = fallbacks[type];

  // If we have context, try to generate a contextual fallback
  if (context?.songTitle && type !== 'error') {
    try {
      // Generate a simple gradient based on the first letter of the song title
      const firstLetter = context.songTitle.charAt(0).toUpperCase();
      const letterGradient = generateLetterGradient(firstLetter);
      
      // Blend with the fallback type
      selectedFallback = {
        ...letterGradient,
        colors: letterGradient.colors.map(color => adjustColorIntensity(color, 0.8)), // Make it more subtle
      };
    } catch (error) {
      console.warn('Failed to generate contextual fallback, using default:', error);
    }
  }

  return selectedFallback;
}

/**
 * Generate gradient based on first letter with enhanced algorithm
 */
export function generateLetterGradient(letter: string): GradientConfig {
  const letterCode = letter.toUpperCase().charCodeAt(0);
  
  // Map letters to different palette categories for variety
  const categoryMap: Record<number, keyof typeof COLOR_PALETTES> = {
    0: 'warm',    // A-D
    1: 'cool',    // E-H  
    2: 'vibrant', // I-L
    3: 'subtle',  // M-P
    4: 'spring',  // Q-T
    5: 'summer',  // U-X
    6: 'autumn',  // Y-Z
  };
  
  const categoryIndex = Math.floor((letterCode - 65) / 4) % 7;
  const category = categoryMap[categoryIndex] || 'warm';
  const availablePalettes = COLOR_PALETTES[category];
  
  const paletteIndex = (letterCode - 65) % availablePalettes.length;
  const palette = availablePalettes[paletteIndex];
  
  return {
    type: 'linear',
    colors: palette.slice(0, 2), // Use first two colors
    direction: 'to bottom right',
    stops: [0, 100],
  };
}

/**
 * Create a gradient style object for React components with enhanced properties
 */
export function createGradientStyle(gradient: GradientConfig): React.CSSProperties {
  return {
    backgroundImage: gradientToCss(gradient),
    backgroundSize: gradient.type === 'conic' ? '100% 100%' : 'cover',
    backgroundRepeat: 'no-repeat',
    backgroundAttachment: 'local',
  };
}

/**
 * Enhanced gradient color extraction for theming
 */
export function extractGradientColors(gradient: GradientConfig): {
  primary: string;
  secondary: string;
  accent: string;
  dominant: string[];
} {
  const [primary, secondary, tertiary] = gradient.colors;
  
  return {
    primary: primary || '#f97316',
    secondary: secondary || primary || '#ea580c',
    accent: tertiary || secondary || primary || '#fb923c',
    dominant: gradient.colors.slice(0, 3),
  };
}

/**
 * Generate gradient for specific themes (light/dark mode)
 */
export function generateThemeGradient(
  title: string, 
  artist?: string, 
  theme: 'light' | 'dark' = 'light'
): GradientConfig {
  if (theme === 'dark') {
    // Force dark palette for dark mode
    const seed = `${title}${artist || ''}`.toLowerCase().replace(/\s+/g, '');
    const hash = hashString(seed);
    const darkPalettes = COLOR_PALETTES.dark;
    const paletteIndex = hash % darkPalettes.length;
    const palette = darkPalettes[paletteIndex];
    
    return {
      type: selectGradientType(hash),
      colors: palette,
      direction: GRADIENT_DIRECTIONS[hash % GRADIENT_DIRECTIONS.length],
      stops: [0, 50, 100],
    };
  }
  
  // Use normal generation for light mode
  return generateSongGradient(title, artist);
}

/**
 * Validate gradient configuration
 */
export function validateGradient(gradient: GradientConfig): boolean {
  if (!gradient.colors || gradient.colors.length < 2) return false;
  if (!['linear', 'radial', 'conic'].includes(gradient.type)) return false;
  if (gradient.stops && gradient.stops.length !== gradient.colors.length) return false;
  
  // Validate color format (basic hex check)
  const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
  return gradient.colors.every(color => hexColorRegex.test(color));
}

/**
 * Clear gradient cache (useful for testing or memory management)
 */
export function clearGradientCache(): void {
  gradientCache.clear();
}

/**
 * Get cache statistics
 */
export function getGradientCacheStats(): { size: number; keys: string[] } {
  return {
    size: gradientCache.size,
    keys: Array.from(gradientCache.keys()),
  };
}

// Export all functions for comprehensive gradient management
export default {
  generateSongGradient,
  generateAdvancedGradient,
  gradientToCss,
  generateGradientVariations,
  getFallbackGradient,
  generateLetterGradient,
  createGradientStyle,
  extractGradientColors,
  generateThemeGradient,
  validateGradient,
  clearGradientCache,
  getGradientCacheStats,
};