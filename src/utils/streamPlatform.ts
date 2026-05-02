/**
 * Stream Platform Detection Utilities
 * 
 * Provides functions to detect streaming platform types from URLs
 * and extract platform-specific metadata like colors, icons, and labels.
 */

export type PlatformType = 'youtube' | 'facebook' | 'vimeo' | 'custom';

export interface PlatformInfo {
  type: PlatformType;
  color: string;
  icon: string;
  subscribeLabel: string;
}

/**
 * Detects the streaming platform type from a URL and returns platform-specific metadata
 * 
 * @param url - The platform URL to analyze
 * @returns Platform information including type, color, icon name, and subscribe label
 * 
 * @example
 * detectPlatform('https://youtube.com/channel/123')
 * // Returns: { type: 'youtube', color: '#FF0000', icon: 'Youtube', subscribeLabel: 'Subscribe on YouTube' }
 */
export function detectPlatform(url: string): PlatformInfo {
  const lowerUrl = url.toLowerCase();

  // YouTube detection
  if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be')) {
    return {
      type: 'youtube',
      color: '#FF0000',
      icon: 'Youtube',
      subscribeLabel: 'Subscribe on YouTube',
    };
  }

  // Facebook detection
  if (lowerUrl.includes('facebook.com') || lowerUrl.includes('fb.com')) {
    return {
      type: 'facebook',
      color: '#1877F2',
      icon: 'Facebook',
      subscribeLabel: 'Follow on Facebook',
    };
  }

  // Vimeo detection
  if (lowerUrl.includes('vimeo.com')) {
    return {
      type: 'vimeo',
      color: '#1AB7EA',
      icon: 'Video',
      subscribeLabel: 'Follow on Vimeo',
    };
  }

  // Default to custom platform
  return {
    type: 'custom',
    color: '#7c3aed',
    icon: 'Video',
    subscribeLabel: 'Subscribe',
  };
}

/**
 * Extracts YouTube channel ID from various YouTube URL formats
 * 
 * Supports the following URL patterns:
 * - https://www.youtube.com/channel/UC...
 * - https://youtube.com/c/ChannelName
 * - https://www.youtube.com/@ChannelHandle
 * - https://youtube.com/user/Username
 * 
 * @param url - The YouTube URL to parse
 * @returns The channel ID if found, null otherwise
 * 
 * @example
 * extractYouTubeChannelId('https://youtube.com/channel/UC1234567890')
 * // Returns: 'UC1234567890'
 * 
 * extractYouTubeChannelId('https://youtube.com/@myhandle')
 * // Returns: '@myhandle'
 */
export function extractYouTubeChannelId(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;

    // Match /channel/CHANNEL_ID
    const channelMatch = pathname.match(/\/channel\/([^\/\?]+)/);
    if (channelMatch) {
      return channelMatch[1];
    }

    // Match /c/CHANNEL_NAME
    const customMatch = pathname.match(/\/c\/([^\/\?]+)/);
    if (customMatch) {
      return customMatch[1];
    }

    // Match /@HANDLE
    const handleMatch = pathname.match(/\/@([^\/\?]+)/);
    if (handleMatch) {
      return `@${handleMatch[1]}`;
    }

    // Match /user/USERNAME
    const userMatch = pathname.match(/\/user\/([^\/\?]+)/);
    if (userMatch) {
      return userMatch[1];
    }

    return null;
  } catch (error) {
    // Invalid URL format
    return null;
  }
}
