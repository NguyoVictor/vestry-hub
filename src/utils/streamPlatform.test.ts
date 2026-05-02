import { describe, it, expect } from 'vitest';
import { detectPlatform, extractYouTubeChannelId } from './streamPlatform';

describe('detectPlatform', () => {
  it('detects YouTube from youtube.com URL', () => {
    const result = detectPlatform('https://youtube.com/channel/UC123');
    expect(result).toEqual({
      type: 'youtube',
      color: '#FF0000',
      icon: 'Youtube',
      subscribeLabel: 'Subscribe on YouTube',
    });
  });

  it('detects YouTube from youtu.be URL', () => {
    const result = detectPlatform('https://youtu.be/abc123');
    expect(result).toEqual({
      type: 'youtube',
      color: '#FF0000',
      icon: 'Youtube',
      subscribeLabel: 'Subscribe on YouTube',
    });
  });

  it('detects Facebook from facebook.com URL', () => {
    const result = detectPlatform('https://facebook.com/mychurch');
    expect(result).toEqual({
      type: 'facebook',
      color: '#1877F2',
      icon: 'Facebook',
      subscribeLabel: 'Follow on Facebook',
    });
  });

  it('detects Facebook from fb.com URL', () => {
    const result = detectPlatform('https://fb.com/mychurch');
    expect(result).toEqual({
      type: 'facebook',
      color: '#1877F2',
      icon: 'Facebook',
      subscribeLabel: 'Follow on Facebook',
    });
  });

  it('detects Vimeo from vimeo.com URL', () => {
    const result = detectPlatform('https://vimeo.com/mychurch');
    expect(result).toEqual({
      type: 'vimeo',
      color: '#1AB7EA',
      icon: 'Video',
      subscribeLabel: 'Follow on Vimeo',
    });
  });

  it('returns custom platform for unknown URLs', () => {
    const result = detectPlatform('https://example.com/stream');
    expect(result).toEqual({
      type: 'custom',
      color: '#7c3aed',
      icon: 'Video',
      subscribeLabel: 'Subscribe',
    });
  });

  it('is case-insensitive', () => {
    const result = detectPlatform('https://YOUTUBE.COM/channel/UC123');
    expect(result.type).toBe('youtube');
  });
});

describe('extractYouTubeChannelId', () => {
  it('extracts channel ID from /channel/ URL', () => {
    const result = extractYouTubeChannelId('https://youtube.com/channel/UC1234567890');
    expect(result).toBe('UC1234567890');
  });

  it('extracts channel name from /c/ URL', () => {
    const result = extractYouTubeChannelId('https://youtube.com/c/MyChannelName');
    expect(result).toBe('MyChannelName');
  });

  it('extracts handle from /@handle URL', () => {
    const result = extractYouTubeChannelId('https://youtube.com/@myhandle');
    expect(result).toBe('@myhandle');
  });

  it('extracts username from /user/ URL', () => {
    const result = extractYouTubeChannelId('https://youtube.com/user/myusername');
    expect(result).toBe('myusername');
  });

  it('handles URLs with query parameters', () => {
    const result = extractYouTubeChannelId('https://youtube.com/channel/UC123?tab=videos');
    expect(result).toBe('UC123');
  });

  it('returns null for non-YouTube URLs', () => {
    const result = extractYouTubeChannelId('https://facebook.com/page');
    expect(result).toBeNull();
  });

  it('returns null for invalid URLs', () => {
    const result = extractYouTubeChannelId('not-a-url');
    expect(result).toBeNull();
  });

  it('returns null for YouTube URLs without channel info', () => {
    const result = extractYouTubeChannelId('https://youtube.com/watch?v=abc123');
    expect(result).toBeNull();
  });
});
