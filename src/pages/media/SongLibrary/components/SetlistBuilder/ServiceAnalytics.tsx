/**
 * Service Analytics Component
 * 
 * Provides service duration calculation, key transition analysis,
 * and service planning insights for setlists.
 */

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Clock, 
  Music, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle,
  BarChart3,
  Zap,
  Target,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { Setlist, Song, KeyTransition, ServicePlanningAnalytics } from '@/types/song-library';

interface ServiceAnalyticsProps {
  setlist: Setlist;
  songs: Song[];
  showKeyTransitions?: boolean;
  showTempoFlow?: boolean;
  showDurationAnalysis?: boolean;
  className?: string;
}

// Music theory helper for calculating key transitions
const CIRCLE_OF_FIFTHS = [
  'C', 'G', 'D', 'A', 'E', 'B', 'F#', 'Db', 'Ab', 'Eb', 'Bb', 'F'
];

const MAJOR_TO_MINOR = {
  'C': 'Am', 'G': 'Em', 'D': 'Bm', 'A': 'F#m', 'E': 'C#m', 'B': 'G#m',
  'F#': 'D#m', 'Db': 'Bbm', 'Ab': 'Fm', 'Eb': 'Cm', 'Bb': 'Gm', 'F': 'Dm'
};

export function ServiceAnalytics({
  setlist,
  songs,
  showKeyTransitions = true,
  showTempoFlow = true,
  showDurationAnalysis = true,
  className = '',
}: ServiceAnalyticsProps) {
  // Calculate comprehensive service analytics
  const analytics = useMemo((): ServicePlanningAnalytics => {
    const setlistSongs = setlist.items
      .map(item => {
        const song = songs.find(s => s.id === item.song_id);
        return song ? { item, song } : null;
      })
      .filter(Boolean) as Array<{ item: any; song: Song }>;

    // Duration calculation
    const totalDuration = setlistSongs.reduce((total, { item, song }) => {
      return total + (item.duration_override || song.duration_seconds || 180);
    }, 0);

    // Tempo analysis
    const tempos = setlistSongs
      .map(({ song }) => song.bpm)
      .filter(Boolean) as number[];
    
    const averageTempo = tempos.length > 0 
      ? Math.round(tempos.reduce((sum, bpm) => sum + bpm, 0) / tempos.length)
      : 0;

    const tempoVariance = tempos.length > 1
      ? Math.round(Math.sqrt(
          tempos.reduce((sum, bpm) => sum + Math.pow(bpm - averageTempo, 2), 0) / tempos.length
        ))
      : 0;

    // Key distribution
    const keyDistribution: Record<string, number> = {};
    setlistSongs.forEach(({ item, song }) => {
      const key = item.key_override || song.key;
      if (key) {
        keyDistribution[key] = (keyDistribution[key] || 0) + 1;
      }
    });

    // Key transitions analysis
    const keyTransitions: KeyTransition[] = [];
    for (let i = 0; i < setlistSongs.length - 1; i++) {
      const currentSong = setlistSongs[i];
      const nextSong = setlistSongs[i + 1];
      
      const fromKey = currentSong.item.key_override || currentSong.song.key;
      const toKey = nextSong.item.key_override || nextSong.song.key;
      
      if (fromKey && toKey && fromKey !== toKey) {
        const semitoneDistance = calculateSemitoneDistance(fromKey, toKey);
        const difficulty = getTransitionDifficulty(semitoneDistance);
        
        keyTransitions.push({
          from_song_id: currentSong.song.id,
          to_song_id: nextSong.song.id,
          from_key: fromKey,
          to_key: toKey,
          semitone_difference: semitoneDistance,
          transition_type: difficulty,
        });
      }
    }

    const difficultTransitions = keyTransitions.filter(t => t.transition_type === 'difficult');

    // Flow score calculation (0-100)
    let flowScore = 100;
    
    // Penalize difficult key transitions
    flowScore -= difficultTransitions.length * 15;
    
    // Penalize high tempo variance
    if (tempoVariance > 30) flowScore -= 20;
    if (tempoVariance > 50) flowScore -= 30;
    
    // Penalize very long or very short services
    const idealDuration = 45 * 60; // 45 minutes
    const durationDiff = Math.abs(totalDuration - idealDuration);
    if (durationDiff > 15 * 60) flowScore -= 10; // More than 15 minutes off
    
    flowScore = Math.max(0, Math.min(100, flowScore));

    // Generate recommendations
    const recommendations: string[] = [];
    
    if (difficultTransitions.length > 0) {
      recommendations.push(`Consider modulation techniques for ${difficultTransitions.length} difficult key transitions`);
    }
    
    if (tempoVariance > 40) {
      recommendations.push('High tempo variance - consider grouping similar-tempo songs');
    }
    
    if (totalDuration < 20 * 60) {
      recommendations.push('Service may be too short - consider adding more songs');
    } else if (totalDuration > 75 * 60) {
      recommendations.push('Service may be too long - consider removing some songs');
    }
    
    if (Object.keys(keyDistribution).length > 6) {
      recommendations.push('Many different keys used - consider consolidating to fewer keys');
    }

    return {
      total_duration: totalDuration,
      average_tempo: averageTempo,
      key_distribution: keyDistribution,
      tempo_variance: tempoVariance,
      difficult_transitions: difficultTransitions,
      flow_score: flowScore,
      recommendations,
    };
  }, [setlist, songs]);

  // Helper function to calculate semitone distance between keys
  function calculateSemitoneDistance(fromKey: string, toKey: string): number {
    // Simplified calculation - in a real implementation, you'd want more sophisticated music theory
    const fromIndex = CIRCLE_OF_FIFTHS.indexOf(fromKey.replace('m', ''));
    const toIndex = CIRCLE_OF_FIFTHS.indexOf(toKey.replace('m', ''));
    
    if (fromIndex === -1 || toIndex === -1) return 0;
    
    const distance = Math.abs(fromIndex - toIndex);
    return Math.min(distance, 12 - distance);
  }

  // Helper function to determine transition difficulty
  function getTransitionDifficulty(semitoneDistance: number): 'smooth' | 'moderate' | 'difficult' {
    if (semitoneDistance <= 1) return 'smooth';
    if (semitoneDistance <= 3) return 'moderate';
    return 'difficult';
  }

  // Format duration for display
  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                  <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 font-jakarta">Duration</p>
                  <p className="text-lg font-semibold text-slate-900 dark:text-slate-100 font-jakarta">
                    {formatDuration(analytics.total_duration)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                  <Zap className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 font-jakarta">Avg Tempo</p>
                  <p className="text-lg font-semibold text-slate-900 dark:text-slate-100 font-jakarta">
                    {analytics.average_tempo > 0 ? `${analytics.average_tempo} BPM` : 'Unknown'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center">
                  <Music className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 font-jakarta">Keys Used</p>
                  <p className="text-lg font-semibold text-slate-900 dark:text-slate-100 font-jakarta">
                    {Object.keys(analytics.key_distribution).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
                  <Target className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 font-jakarta">Flow Score</p>
                  <p className="text-lg font-semibold text-slate-900 dark:text-slate-100 font-jakarta">
                    {analytics.flow_score}/100
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Key Transitions Analysis */}
      {showKeyTransitions && analytics.difficult_transitions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-jakarta">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Key Transitions Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analytics.difficult_transitions.map((transition, index) => (
                  <div
                    key={`${transition.from_song_id}-${transition.to_song_id}`}
                    className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800"
                  >
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="font-mono">
                        {transition.from_key} → {transition.to_key}
                      </Badge>
                      <span className="text-sm text-slate-600 dark:text-slate-300 font-jakarta">
                        {transition.semitone_difference} semitones
                      </span>
                    </div>
                    <Badge 
                      variant="secondary"
                      className={`
                        ${transition.transition_type === 'difficult' 
                          ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' 
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                        }
                      `}
                    >
                      {transition.transition_type}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Flow Score Details */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-jakarta">
              <BarChart3 className="h-5 w-5 text-blue-500" />
              Service Flow Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Flow Score Progress */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300 font-jakarta">
                    Overall Flow Score
                  </span>
                  <span className="text-sm text-slate-500 dark:text-slate-400 font-jakarta">
                    {analytics.flow_score}/100
                  </span>
                </div>
                <Progress 
                  value={analytics.flow_score} 
                  className="h-2"
                />
                <div className="flex items-center gap-2 mt-2">
                  {analytics.flow_score >= 80 ? (
                    <CheckCircle className="h-4 w-4 text-emerald-500" />
                  ) : analytics.flow_score >= 60 ? (
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                  )}
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-jakarta">
                    {analytics.flow_score >= 80 
                      ? 'Excellent flow' 
                      : analytics.flow_score >= 60 
                      ? 'Good flow with room for improvement'
                      : 'Consider optimizing song order and keys'
                    }
                  </span>
                </div>
              </div>

              {/* Recommendations */}
              {analytics.recommendations.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 font-jakarta">
                    Recommendations
                  </h4>
                  <div className="space-y-2">
                    {analytics.recommendations.map((recommendation, index) => (
                      <div
                        key={index}
                        className="flex items-start gap-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-sm"
                      >
                        <TrendingUp className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                        <span className="text-blue-700 dark:text-blue-300 font-jakarta">
                          {recommendation}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

export default ServiceAnalytics;