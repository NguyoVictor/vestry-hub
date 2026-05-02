/**
 * Theme Demo Component
 * 
 * Demonstrates the dual-theme system capabilities including:
 * - Light/Dark mode switching
 * - Ambient color effects
 * - Smooth transitions
 * - Component styling examples
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Palette, Sparkles, Sun, Moon, Music, Heart, Star } from 'lucide-react';
import { useTheme } from './index';
import { useAmbientColors } from '../../hooks/useAmbientColors';
import { ThemeToggle } from './ThemeToggle';

interface ThemeDemoProps {
  className?: string;
}

export function ThemeDemo({ className = '' }: ThemeDemoProps) {
  const { theme } = useTheme();
  const { currentColors, setColorsFromCoverArt, resetToDefault } = useAmbientColors();
  const [selectedColorScheme, setSelectedColorScheme] = useState<string>('default');

  // Demo color schemes
  const colorSchemes = [
    {
      id: 'default',
      name: 'Default Orange',
      colors: {
        primary: '#f97316',
        secondary: '#fb923c',
        accent: '#ea6c0a',
        dominant: ['#f97316', '#fb923c', '#ea6c0a']
      }
    },
    {
      id: 'purple',
      name: 'Purple Vibes',
      colors: {
        primary: '#8b5cf6',
        secondary: '#a78bfa',
        accent: '#7c3aed',
        dominant: ['#8b5cf6', '#a78bfa', '#7c3aed']
      }
    },
    {
      id: 'emerald',
      name: 'Emerald Dream',
      colors: {
        primary: '#10b981',
        secondary: '#34d399',
        accent: '#059669',
        dominant: ['#10b981', '#34d399', '#059669']
      }
    },
    {
      id: 'rose',
      name: 'Rose Gold',
      colors: {
        primary: '#f43f5e',
        secondary: '#fb7185',
        accent: '#e11d48',
        dominant: ['#f43f5e', '#fb7185', '#e11d48']
      }
    },
    {
      id: 'blue',
      name: 'Ocean Blue',
      colors: {
        primary: '#3b82f6',
        secondary: '#60a5fa',
        accent: '#2563eb',
        dominant: ['#3b82f6', '#60a5fa', '#2563eb']
      }
    }
  ];

  const handleColorSchemeChange = (scheme: typeof colorSchemes[0]) => {
    setSelectedColorScheme(scheme.id);
    if (theme === 'dark') {
      setColorsFromCoverArt(scheme.colors);
    }
  };

  return (
    <div className={`space-y-8 ${className}`}>
      {/* Header */}
      <div className="text-center space-y-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-center gap-3"
        >
          <div className="h-12 w-12 rounded-xl sl-card sl-flex-center">
            <Palette className="h-6 w-6 sl-text-accent" />
          </div>
          <h2 className="text-3xl font-bold sl-text-primary sl-heading">
            Theme System Demo
          </h2>
        </motion.div>
        
        <p className="text-lg sl-text-secondary max-w-2xl mx-auto">
          Experience the dual-theme system with Vercel-inspired light mode and Spotify-inspired dark mode, 
          complete with ambient color bleeding effects.
        </p>
      </div>

      {/* Theme Controls */}
      <div className="sl-card p-6 space-y-6">
        <div className="sl-flex-between">
          <div>
            <h3 className="text-xl font-semibold sl-text-primary mb-2">Theme Controls</h3>
            <p className="sl-text-secondary">Switch between light and dark modes to see the transformation</p>
          </div>
          <ThemeToggle size="lg" showLabel />
        </div>

        {/* Color Scheme Selector (Dark Mode Only) */}
        {theme === 'dark' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-4"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 sl-text-accent" />
              <h4 className="font-semibold sl-text-primary">Ambient Color Schemes</h4>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {colorSchemes.map((scheme) => (
                <motion.button
                  key={scheme.id}
                  onClick={() => handleColorSchemeChange(scheme)}
                  className={`
                    p-4 rounded-xl border-2 transition-all duration-300
                    ${selectedColorScheme === scheme.id 
                      ? 'border-[var(--sl-accent-primary)] sl-ambient-glow' 
                      : 'border-[var(--sl-border-default)] hover:border-[var(--sl-border-strong)]'
                    }
                  `}
                  style={{ backgroundColor: 'var(--sl-bg-surface)' }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <div className="flex items-center justify-center mb-2">
                    <div 
                      className="w-8 h-8 rounded-full"
                      style={{ 
                        background: `linear-gradient(135deg, ${scheme.colors.primary}, ${scheme.colors.secondary})` 
                      }}
                    />
                  </div>
                  <p className="text-sm font-medium sl-text-primary">{scheme.name}</p>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* Component Examples */}
      <div className="space-y-6">
        <h3 className="text-2xl font-bold sl-text-primary sl-heading">Component Examples</h3>
        
        {/* Cards Grid */}
        <div className="sl-grid sl-grid-songs">
          {[
            { icon: Music, title: 'Amazing Grace', artist: 'Traditional', plays: '1.2K' },
            { icon: Heart, title: 'How Great Thou Art', artist: 'Carl Boberg', plays: '856' },
            { icon: Star, title: 'Blessed Assurance', artist: 'Fanny Crosby', plays: '743' },
          ].map((song, index) => (
            <motion.div
              key={song.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="sl-card sl-card-interactive p-6 space-y-4 sl-hover-lift"
            >
              {/* Cover Art Placeholder */}
              <div 
                className="aspect-square rounded-lg sl-flex-center text-white text-2xl font-bold"
                style={{
                  background: theme === 'dark' 
                    ? `linear-gradient(135deg, ${currentColors.primary}, ${currentColors.secondary})`
                    : 'linear-gradient(135deg, #f97316, #fb923c)'
                }}
              >
                <song.icon className="h-8 w-8" />
              </div>
              
              {/* Song Info */}
              <div className="space-y-2">
                <h4 className="font-semibold sl-text-primary">{song.title}</h4>
                <p className="sl-text-secondary text-sm">{song.artist}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs sl-text-muted">{song.plays} plays</span>
                  <button className="sl-button-primary text-xs px-3 py-1">
                    Play
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Button Examples */}
        <div className="sl-card p-6 space-y-4">
          <h4 className="font-semibold sl-text-primary">Button Styles</h4>
          <div className="flex flex-wrap gap-3">
            <button className="sl-button-primary">Primary Button</button>
            <button className="sl-button-secondary">Secondary Button</button>
            <button className="sl-button-primary" disabled>Disabled Button</button>
          </div>
        </div>

        {/* Typography Examples */}
        <div className="sl-card p-6 space-y-4">
          <h4 className="font-semibold sl-text-primary">Typography Scale</h4>
          <div className="space-y-3">
            <h1 className="text-4xl font-bold sl-text-primary sl-heading">Heading 1</h1>
            <h2 className="text-3xl font-bold sl-text-primary sl-heading">Heading 2</h2>
            <h3 className="text-2xl font-semibold sl-text-primary sl-heading">Heading 3</h3>
            <p className="text-lg sl-text-primary">Large body text for important content</p>
            <p className="sl-text-primary">Regular body text for general content</p>
            <p className="text-sm sl-text-secondary">Secondary text for supporting information</p>
            <p className="text-xs sl-text-muted">Muted text for metadata and captions</p>
          </div>
        </div>
      </div>

      {/* Theme Information */}
      <div className="sl-card p-6">
        <h4 className="font-semibold sl-text-primary mb-4">Current Theme Information</h4>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h5 className="font-medium sl-text-primary mb-2">Active Theme</h5>
            <div className="flex items-center gap-2">
              {theme === 'light' ? (
                <Sun className="h-5 w-5 text-orange-500" />
              ) : (
                <Moon className="h-5 w-5 text-purple-400" />
              )}
              <span className="sl-text-secondary capitalize">{theme} Mode</span>
            </div>
          </div>
          
          {theme === 'dark' && (
            <div>
              <h5 className="font-medium sl-text-primary mb-2">Ambient Colors</h5>
              <div className="flex gap-2">
                {[currentColors.primary, currentColors.secondary, currentColors.accent].map((color, index) => (
                  <div
                    key={index}
                    className="w-8 h-8 rounded-full border-2 border-[var(--sl-border-default)]"
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ThemeDemo;