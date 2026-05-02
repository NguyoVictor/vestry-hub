/**
 * SmartOrganization Component for Song Library UI Revamp
 * 
 * Displays usage analytics, trending songs, recommendations, and unused songs
 * with smart organization features for worship leaders.
 * 
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  Star, 
  AlertCircle,
  BarChart3,
  Calendar,
  Music,
  Users,
  Zap,
  Filter,
  Download,
  RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { useChurch } from '@/contexts/ChurchContext';
import { 
  useUsageAnalytics, 
  useTrendingSongs, 
  useUnusedSongs,
  useSongRecommendations,
  useUsageReports,
  useUpdateTrendingStatus
} from '../../hooks/useUsageAnalytics';
import type { Song, ServiceType } from '@/types/song-library';
import { SongCard } from '../SongGrid/SongCard';
import { UsageChart } from './UsageChart';
import { RecommendationCard } from './RecommendationCard';
import { UnusedSongsList } from './UnusedSongsList';

interface SmartOrganizationProps {
  onSongSelect?: (song: Song) => void;
  onAddToSetlist?: (song: Song) => void;
  className?: string;
}

export function SmartOrganization({ 
  onSongSelect, 
  onAddToSetlist,
  className = '' 
}: SmartOrganizationProps) {
  const { church } = useChurch();
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'year'>('week');
  const [selectedServiceType, setSelectedServiceType] = useState<ServiceType | undefined>();
  const [activeTab, setActiveTab] = useState('overview');

  // Data hooks
  const { data: analytics, isLoading: analyticsLoading, refetch: refetchAnalytics } = useUsageAnalytics(church?.id || null);
  const { data: trendingSongs, isLoading: trendingLoading } = useTrendingSongs(church?.id || null, selectedPeriod);
  const { data: unusedSongs, isLoading: unusedLoading } = useUnusedSongs(church?.id || null, 90);
  const { data: recommendations, isLoading: recommendationsLoading } = useSongRecommendations(
    church?.id || null,
    { serviceType: selectedServiceType }
  );
  const { data: monthlyReports } = useUsageReports(church?.id || null, 'monthly');
  const { data: yearlyReports } = useUsageReports(church?.id || null, 'yearly');

  // Mutations
  const updateTrendingMutation = useUpdateTrendingStatus(church?.id || null);

  const handleUpdateTrending = async () => {
    try {
      await updateTrendingMutation.mutateAsync();
      await refetchAnalytics();
      toast.success('Trending songs updated successfully');
    } catch (error) {
      console.error('Failed to update trending songs:', error);
    }
  };

  const handleExportReport = () => {
    // TODO: Implement export functionality
    toast.info('Export functionality coming soon');
  };

  if (!church) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-slate-500 font-jakarta">Please select a church to view analytics</p>
      </div>
    );
  }

  return (
    <div className={`space-y-6 font-jakarta ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Smart Organization</h2>
          <p className="text-sm text-slate-500 mt-1">
            Usage analytics and intelligent song recommendations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportReport}
            className="font-jakarta"
          >
            <Download className="h-4 w-4 mr-1.5" />
            Export Report
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleUpdateTrending}
            disabled={updateTrendingMutation.isPending}
            className="font-jakarta"
          >
            <RefreshCw className={`h-4 w-4 mr-1.5 ${updateTrendingMutation.isPending ? 'animate-spin' : ''}`} />
            Update Trending
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Music}
          label="Total Usage"
          value={analytics?.totalUsage || 0}
          loading={analyticsLoading}
        />
        <StatCard
          icon={TrendingUp}
          label="Trending Songs"
          value={trendingSongs?.length || 0}
          loading={trendingLoading}
        />
        <StatCard
          icon={AlertCircle}
          label="Unused Songs"
          value={unusedSongs?.length || 0}
          loading={unusedLoading}
          variant="warning"
        />
        <StatCard
          icon={Star}
          label="Recommendations"
          value={recommendations?.length || 0}
          loading={recommendationsLoading}
        />
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="font-jakarta">Overview</TabsTrigger>
          <TabsTrigger value="trending" className="font-jakarta">Trending</TabsTrigger>
          <TabsTrigger value="recommendations" className="font-jakarta">Recommendations</TabsTrigger>
          <TabsTrigger value="unused" className="font-jakarta">Unused Songs</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <OverviewTab
            analytics={analytics}
            monthlyReports={monthlyReports}
            yearlyReports={yearlyReports}
            loading={analyticsLoading}
          />
        </TabsContent>

        <TabsContent value="trending" className="space-y-6">
          <TrendingTab
            songs={trendingSongs}
            period={selectedPeriod}
            onPeriodChange={setSelectedPeriod}
            onSongSelect={onSongSelect}
            onAddToSetlist={onAddToSetlist}
            loading={trendingLoading}
          />
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-6">
          <RecommendationsTab
            recommendations={recommendations}
            serviceType={selectedServiceType}
            onServiceTypeChange={setSelectedServiceType}
            onSongSelect={onSongSelect}
            onAddToSetlist={onAddToSetlist}
            loading={recommendationsLoading}
          />
        </TabsContent>

        <TabsContent value="unused" className="space-y-6">
          <UnusedTab
            songs={unusedSongs}
            onSongSelect={onSongSelect}
            onAddToSetlist={onAddToSetlist}
            loading={unusedLoading}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// =====================================================
// Sub-components
// =====================================================

interface StatCardProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  loading?: boolean;
  variant?: 'default' | 'warning' | 'success';
}

function StatCard({ icon: Icon, label, value, loading, variant = 'default' }: StatCardProps) {
  const variantStyles = {
    default: 'text-slate-600',
    warning: 'text-amber-600',
    success: 'text-emerald-600',
  };

  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg bg-slate-100 ${variantStyles[variant]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide font-jakarta">
            {label}
          </p>
          {loading ? (
            <Skeleton className="h-6 w-12 mt-1" />
          ) : (
            <p className="text-xl font-bold text-slate-900 font-jakarta">
              {value.toLocaleString()}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}

interface OverviewTabProps {
  analytics: any;
  monthlyReports: any[];
  yearlyReports: any[];
  loading: boolean;
}

function OverviewTab({ analytics, monthlyReports, yearlyReports, loading }: OverviewTabProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-jakarta">
            <BarChart3 className="h-5 w-5" />
            Usage Trends
          </CardTitle>
        </CardHeader>
        <CardContent>
          <UsageChart data={monthlyReports || []} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-jakarta">
            <Users className="h-5 w-5" />
            Service Type Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {analytics?.usageByServiceType && Object.entries(analytics.usageByServiceType).map(([type, count]) => (
              <div key={type} className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700 capitalize font-jakarta">
                  {type.replace('_', ' ')}
                </span>
                <Badge variant="secondary" className="font-jakarta">
                  {count as number}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface TrendingTabProps {
  songs: Song[] | undefined;
  period: 'week' | 'month' | 'year';
  onPeriodChange: (period: 'week' | 'month' | 'year') => void;
  onSongSelect?: (song: Song) => void;
  onAddToSetlist?: (song: Song) => void;
  loading: boolean;
}

function TrendingTab({ 
  songs, 
  period, 
  onPeriodChange, 
  onSongSelect, 
  onAddToSetlist, 
  loading 
}: TrendingTabProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900 font-jakarta">
          Trending Songs
        </h3>
        <div className="flex items-center gap-2">
          {(['week', 'month', 'year'] as const).map((p) => (
            <Button
              key={p}
              variant={period === p ? 'default' : 'outline'}
              size="sm"
              onClick={() => onPeriodChange(p)}
              className="font-jakarta capitalize"
            >
              {p}
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      ) : songs && songs.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {songs.map((song, index) => (
            <motion.div
              key={song.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <SongCard
                song={song}
                isSelected={false}
                onSelect={onSongSelect}
                onEdit={() => {}}
                onAddToSetlist={onAddToSetlist}
                variant="spotlight"
                showTrendingBadge
              />
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <TrendingUp className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 font-jakarta">No trending songs for this period</p>
        </div>
      )}
    </div>
  );
}

interface RecommendationsTabProps {
  recommendations: Song[] | undefined;
  serviceType: ServiceType | undefined;
  onServiceTypeChange: (type: ServiceType | undefined) => void;
  onSongSelect?: (song: Song) => void;
  onAddToSetlist?: (song: Song) => void;
  loading: boolean;
}

function RecommendationsTab({
  recommendations,
  serviceType,
  onServiceTypeChange,
  onSongSelect,
  onAddToSetlist,
  loading
}: RecommendationsTabProps) {
  const serviceTypes: (ServiceType | undefined)[] = [
    undefined,
    'worship',
    'pre-service',
    'special',
    'rehearsal',
    'other'
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900 font-jakarta">
          Smart Recommendations
        </h3>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-500" />
          <select
            value={serviceType || ''}
            onChange={(e) => onServiceTypeChange(e.target.value as ServiceType || undefined)}
            className="text-sm border border-slate-200 rounded-md px-3 py-1 font-jakarta"
          >
            <option value="">All Services</option>
            <option value="worship">Worship</option>
            <option value="pre-service">Pre-Service</option>
            <option value="special">Special</option>
            <option value="rehearsal">Rehearsal</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      ) : recommendations && recommendations.length > 0 ? (
        <div className="space-y-4">
          {recommendations.map((song, index) => (
            <motion.div
              key={song.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <RecommendationCard
                song={song}
                onSelect={onSongSelect}
                onAddToSetlist={onAddToSetlist}
              />
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Zap className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 font-jakarta">No recommendations available</p>
          <p className="text-xs text-slate-400 mt-1 font-jakarta">
            Add more songs to your library to get personalized recommendations
          </p>
        </div>
      )}
    </div>
  );
}

interface UnusedTabProps {
  songs: Song[] | undefined;
  onSongSelect?: (song: Song) => void;
  onAddToSetlist?: (song: Song) => void;
  loading: boolean;
}

function UnusedTab({ songs, onSongSelect, onAddToSetlist, loading }: UnusedTabProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900 font-jakarta">
          Unused Songs
        </h3>
        <Badge variant="outline" className="font-jakarta">
          {songs?.length || 0} songs
        </Badge>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : songs && songs.length > 0 ? (
        <UnusedSongsList
          songs={songs}
          onSongSelect={onSongSelect}
          onAddToSetlist={onAddToSetlist}
        />
      ) : (
        <div className="text-center py-12">
          <Clock className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 font-jakarta">All songs have been used recently!</p>
          <p className="text-xs text-slate-400 mt-1 font-jakarta">
            Great job keeping your repertoire active
          </p>
        </div>
      )}
    </div>
  );
}

export default SmartOrganization;