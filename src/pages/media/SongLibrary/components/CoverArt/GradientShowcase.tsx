/**
 * Gradient Showcase Component
 * 
 * Demonstrates the enhanced gradient generation system with customization options.
 * This component showcases the new gradient customization and variation algorithms.
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Palette, Shuffle, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GradientGenerator } from './GradientGenerator';

interface GradientShowcaseProps {
  songTitle: string;
  artistName?: string;
}

export function GradientShowcase({ songTitle, artistName }: GradientShowcaseProps) {
  const [mood, setMood] = useState<'energetic' | 'calm' | 'worship' | 'celebration' | 'reflective'>('worship');
  const [intensity, setIntensity] = useState<'subtle' | 'moderate' | 'vibrant'>('moderate');
  const [complexity, setComplexity] = useState<'simple' | 'complex'>('simple');
  const [showCustomization, setShowCustomization] = useState(false);

  const moods = [
    { value: 'worship', label: 'Worship', description: 'Peaceful and reverent' },
    { value: 'energetic', label: 'Energetic', description: 'High energy and dynamic' },
    { value: 'calm', label: 'Calm', description: 'Soothing and tranquil' },
    { value: 'celebration', label: 'Celebration', description: 'Joyful and festive' },
    { value: 'reflective', label: 'Reflective', description: 'Contemplative and deep' },
  ];

  const intensities = [
    { value: 'subtle', label: 'Subtle', description: 'Soft and understated' },
    { value: 'moderate', label: 'Moderate', description: 'Balanced and harmonious' },
    { value: 'vibrant', label: 'Vibrant', description: 'Bold and striking' },
  ];

  const complexities = [
    { value: 'simple', label: 'Simple', description: '2-3 colors, clean gradients' },
    { value: 'complex', label: 'Complex', description: '3-4 colors, sophisticated patterns' },
  ];

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-orange-500" />
              Gradient Showcase
            </CardTitle>
            <CardDescription>
              Enhanced gradient generation with customization options
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCustomization(!showCustomization)}
          >
            <Settings className="h-4 w-4 mr-2" />
            {showCustomization ? 'Hide' : 'Show'} Options
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Customization Controls */}
        {showCustomization && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg"
          >
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Mood
              </label>
              <Select value={mood} onValueChange={(value: any) => setMood(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {moods.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      <div>
                        <div className="font-medium">{m.label}</div>
                        <div className="text-xs text-slate-500">{m.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Intensity
              </label>
              <Select value={intensity} onValueChange={(value: any) => setIntensity(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {intensities.map((i) => (
                    <SelectItem key={i.value} value={i.value}>
                      <div>
                        <div className="font-medium">{i.label}</div>
                        <div className="text-xs text-slate-500">{i.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Complexity
              </label>
              <Select value={complexity} onValueChange={(value: any) => setComplexity(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {complexities.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      <div>
                        <div className="font-medium">{c.label}</div>
                        <div className="text-xs text-slate-500">{c.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </motion.div>
        )}

        {/* Gradient Display Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {/* Standard Gradient */}
          <div className="text-center space-y-3">
            <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Standard
            </h4>
            <GradientGenerator
              songTitle={songTitle}
              artistName={artistName}
              size="lg"
              variant="auto"
              showControls={true}
            />
            <p className="text-xs text-slate-500">Default algorithm</p>
          </div>

          {/* Advanced Customized */}
          <div className="text-center space-y-3">
            <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Customized
            </h4>
            <GradientGenerator
              songTitle={songTitle}
              artistName={artistName}
              size="lg"
              mood={mood}
              intensity={intensity}
              complexity={complexity}
              showControls={true}
            />
            <p className="text-xs text-slate-500">
              {mood} • {intensity} • {complexity}
            </p>
          </div>

          {/* Variations */}
          <div className="text-center space-y-3">
            <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300">
              With Variations
            </h4>
            <GradientGenerator
              songTitle={songTitle}
              artistName={artistName}
              size="lg"
              variant="linear"
              showControls={true}
              showVariations={true}
            />
            <p className="text-xs text-slate-500">Multiple variations</p>
          </div>

          {/* Fallback Example */}
          <div className="text-center space-y-3">
            <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Fallback
            </h4>
            <GradientGenerator
              songTitle=""
              artistName=""
              size="lg"
              showControls={true}
            />
            <p className="text-xs text-slate-500">Error fallback</p>
          </div>
        </div>

        {/* Feature Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
          <div className="text-center p-4 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-lg">
            <Palette className="h-8 w-8 text-orange-500 mx-auto mb-2" />
            <h5 className="font-medium text-slate-900 dark:text-slate-100">
              Smart Color Palettes
            </h5>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Mood-based color selection with seasonal adjustments
            </p>
          </div>

          <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg">
            <Shuffle className="h-8 w-8 text-blue-500 mx-auto mb-2" />
            <h5 className="font-medium text-slate-900 dark:text-slate-100">
              Advanced Variations
            </h5>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Multiple gradient types with sophisticated algorithms
            </p>
          </div>

          <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg">
            <Settings className="h-8 w-8 text-green-500 mx-auto mb-2" />
            <h5 className="font-medium text-slate-900 dark:text-slate-100">
              Robust Fallbacks
            </h5>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Contextual error handling with graceful degradation
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}