/**
 * Theme Test Page
 * Simple test page to verify the ThemeProvider implementation
 */

import React from 'react';
import { ThemeProvider } from './components/ThemeProvider';
import { ThemeToggle } from './components/ThemeProvider/ThemeToggle';
import { ThemeDemo } from './components/ThemeProvider/ThemeDemo';
import './styles/theme.css';

export default function ThemeTest() {
  return (
    <ThemeProvider>
      <div className="min-h-screen p-8 sl-theme-transition" style={{
        backgroundColor: 'var(--sl-bg-app)',
        color: 'var(--sl-text-primary)'
      }}>
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Header */}
          <div className="sl-flex-between">
            <div>
              <h1 className="text-4xl font-bold sl-text-primary sl-heading">
                Song Library Theme System
              </h1>
              <p className="sl-text-secondary mt-2">
                Testing the dual-theme implementation with Vercel light and Spotify dark modes
              </p>
            </div>
            <ThemeToggle size="lg" showLabel />
          </div>

          {/* Demo Component */}
          <ThemeDemo />

          {/* Simple Test Cards */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="sl-card p-6">
              <h3 className="text-xl font-semibold sl-text-primary mb-4">Light Mode Features</h3>
              <ul className="space-y-2 sl-text-secondary">
                <li>• Vercel-inspired aesthetic</li>
                <li>• White surfaces with sharp typography</li>
                <li>• Ultra-thin borders</li>
                <li>• Generous whitespace</li>
                <li>• Orange accent colors</li>
              </ul>
            </div>

            <div className="sl-card p-6">
              <h3 className="text-xl font-semibold sl-text-primary mb-4">Dark Mode Features</h3>
              <ul className="space-y-2 sl-text-secondary">
                <li>• Spotify-inspired aesthetic</li>
                <li>• Deep #0a0a0a background</li>
                <li>• #111111 card surfaces</li>
                <li>• #7F77DD purple accents</li>
                <li>• Ambient color bleeding effects</li>
              </ul>
            </div>
          </div>

          {/* Button Tests */}
          <div className="sl-card p-6">
            <h3 className="text-xl font-semibold sl-text-primary mb-4">Button Styles</h3>
            <div className="flex flex-wrap gap-4">
              <button className="sl-button-primary">Primary Button</button>
              <button className="sl-button-secondary">Secondary Button</button>
              <button className="sl-button-primary sl-focus-ring">Focused Button</button>
            </div>
          </div>
        </div>
      </div>
    </ThemeProvider>
  );
}