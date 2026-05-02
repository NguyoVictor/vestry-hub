/**
 * Conflict Resolution Component for Song Library UI Revamp
 * 
 * Provides comprehensive conflict resolution interface:
 * - Visual conflict detection and display
 * - Side-by-side change comparison
 * - Resolution options (accept, reject, merge)
 * - Optimistic locking indicators
 * - Change history visualization
 * 
 * Requirements: 14.3, 14.5, 14.6
 */

import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Merge, 
  Clock, 
  User, 
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';

import type { 
  EditConflict,
  SetlistChangeHistory,
  SetlistItem,
  Song
} from '@/types/song-library';

interface ConflictResolutionProps {
  conflict: EditConflict;
  songs: Song[];
  onResolve: (conflictId: string, resolution: 'accept' | 'reject' | 'merge', mergedData?: any) => Promise<void>;
  onCancel: () => void;
  className?: string;
}

interface ChangeComparison {
  field: string;
  label: string;
  currentValue: any;
  incomingValue: any;
  conflictType: 'different' | 'added' | 'removed';
}

/**
 * Get user initials for avatar fallback
 */
function getUserInitials(name: string): string {
  return name
    .split(' ')
    .map(part => part.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Compare two values and determine conflict type
 */
function compareValues(current: any, incoming: any): 'different' | 'added' | 'removed' | 'same' {
  if (current === undefined && incoming !== undefined) return 'added';
  if (current !== undefined && incoming === undefined) return 'removed';
  if (current !== incoming) return 'different';
  return 'same';
}

/**
 * Generate change comparison data
 */
function generateChangeComparison(
  currentData: any, 
  incomingData: any, 
  conflictType: EditConflict['type']
): ChangeComparison[] {
  const comparisons: ChangeComparison[] = [];
  
  if (conflictType === 'concurrent_edit') {
    // Compare all fields that might have changed
    const allFields = new Set([
      ...Object.keys(currentData || {}),
      ...Object.keys(incomingData || {})
    ]);
    
    allFields.forEach(field => {
      const comparison = compareValues(currentData?.[field], incomingData?.[field]);
      if (comparison !== 'same') {
        comparisons.push({
          field,
          label: field.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
          currentValue: currentData?.[field],
          incomingValue: incomingData?.[field],
          conflictType: comparison,
        });
      }
    });
  } else if (conflictType === 'drag_conflict') {
    // Compare setlist item positions
    const currentItems = currentData?.items || [];
    const incomingItems = incomingData?.items || [];
    
    comparisons.push({
      field: 'item_order',
      label: 'Song Order',
      currentValue: currentItems.map((item: SetlistItem, index: number) => `${index + 1}. ${item.song_id}`),
      incomingValue: incomingItems.map((item: SetlistItem, index: number) => `${index + 1}. ${item.song_id}`),
      conflictType: 'different',
    });
  } else if (conflictType === 'version_mismatch') {
    // Compare version-specific changes
    comparisons.push({
      field: 'version_conflict',
      label: 'Version Mismatch',
      currentValue: currentData,
      incomingValue: incomingData,
      conflictType: 'different',
    });
  } else if (conflictType === 'permission_denied') {
    // Show permission conflict
    comparisons.push({
      field: 'permission_conflict',
      label: 'Permission Conflict',
      currentValue: 'Access denied',
      incomingValue: 'Attempted change',
      conflictType: 'different',
    });
  }
  
  return comparisons;
}

/**
 * Render value with appropriate formatting
 */
function renderValue(value: any, field: string): React.ReactNode {
  if (value === undefined || value === null) {
    return <span className="text-slate-400 italic">Not set</span>;
  }
  
  if (Array.isArray(value)) {
    return (
      <div className="space-y-1">
        {value.map((item, index) => (
          <div key={index} className="text-sm font-mono bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
            {item}
          </div>
        ))}
      </div>
    );
  }
  
  if (field === 'service_date' && typeof value === 'string') {
    return format(new Date(value), 'EEEE, MMMM d, yyyy');
  }
  
  return <span className="font-mono">{String(value)}</span>;
}

/**
 * Conflict Resolution Component
 */
export function ConflictResolution({
  conflict,
  songs,
  onResolve,
  onCancel,
  className,
}: ConflictResolutionProps) {
  const [selectedResolution, setSelectedResolution] = useState<'accept' | 'reject' | 'merge' | null>(null);
  const [mergedData, setMergedData] = useState<any>(null);
  const [showDetails, setShowDetails] = useState(true);
  const [isResolving, setIsResolving] = useState(false);
  
  // Generate change comparison
  const changeComparison = useMemo(() => {
    return generateChangeComparison(
      conflict.current_state,
      conflict.incoming_change,
      conflict.type
    );
  }, [conflict]);
  
  // Handle resolution
  const handleResolve = useCallback(async (resolution: 'accept' | 'reject' | 'merge') => {
    if (isResolving) return;
    
    setIsResolving(true);
    
    try {
      await onResolve(conflict.id, resolution, resolution === 'merge' ? mergedData : undefined);
    } catch (error) {
      console.error('Failed to resolve conflict:', error);
    } finally {
      setIsResolving(false);
    }
  }, [conflict.id, onResolve, mergedData, isResolving]);
  
  // Handle merge field selection
  const handleMergeFieldChange = useCallback((field: string, useIncoming: boolean) => {
    setMergedData((prev: any) => ({
      ...prev,
      [field]: useIncoming ? conflict.incoming_change[field] : conflict.current_state[field],
    }));
  }, [conflict]);
  
  // Initialize merged data
  React.useEffect(() => {
    if (selectedResolution === 'merge' && !mergedData) {
      setMergedData({ ...conflict.current_state });
    }
  }, [selectedResolution, mergedData, conflict.current_state]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={cn("fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50", className)}
    >
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold text-slate-900 dark:text-slate-100 font-jakarta">
                  Resolve Conflict
                </CardTitle>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  {conflict.description}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDetails(!showDetails)}
              >
                {showDetails ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                {showDetails ? 'Hide' : 'Show'} Details
              </Button>
              <Button variant="ghost" size="sm" onClick={onCancel}>
                Cancel
              </Button>
            </div>
          </div>
          
          {/* Conflict Info */}
          <div className="flex items-center gap-4 mt-4 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-slate-500" />
              <span className="text-sm text-slate-600 dark:text-slate-400">
                {formatDistanceToNow(new Date(conflict.created_at), { addSuffix: true })}
              </span>
            </div>
            <Separator orientation="vertical" className="h-4" />
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-slate-500" />
              <span className="text-sm text-slate-600 dark:text-slate-400">
                {conflict.conflicting_users.map(u => u.user_name).join(', ')}
              </span>
            </div>
            <Separator orientation="vertical" className="h-4" />
            <Badge variant="outline" className="capitalize">
              {conflict.type.replace('_', ' ')}
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          <Tabs defaultValue="comparison" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mx-6">
              <TabsTrigger value="comparison">Compare Changes</TabsTrigger>
              <TabsTrigger value="resolution">Choose Resolution</TabsTrigger>
            </TabsList>
            
            <TabsContent value="comparison" className="p-6 pt-4">
              <ScrollArea className="h-96">
                <div className="space-y-4">
                  {changeComparison.map((comparison, index) => (
                    <div key={comparison.field} className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-slate-900 dark:text-slate-100 font-jakarta">
                          {comparison.label}
                        </h4>
                        <Badge 
                          variant={comparison.conflictType === 'different' ? 'destructive' : 'secondary'}
                          className="capitalize"
                        >
                          {comparison.conflictType}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Current Value */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <ArrowLeft className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                              Current Version
                            </span>
                          </div>
                          <div className="p-3 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-lg">
                            {renderValue(comparison.currentValue, comparison.field)}
                          </div>
                        </div>
                        
                        {/* Incoming Value */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <ArrowRight className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                            <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                              Incoming Change
                            </span>
                          </div>
                          <div className="p-3 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800 rounded-lg">
                            {renderValue(comparison.incomingValue, comparison.field)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="resolution" className="p-6 pt-4">
              <div className="space-y-6">
                {/* Resolution Options */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Accept Incoming */}
                  <Card 
                    className={cn(
                      "cursor-pointer transition-all duration-200 hover:shadow-md",
                      selectedResolution === 'accept' && "ring-2 ring-emerald-500 bg-emerald-50 dark:bg-emerald-900/10"
                    )}
                    onClick={() => setSelectedResolution('accept')}
                  >
                    <CardContent className="p-4 text-center">
                      <CheckCircle className="h-8 w-8 text-emerald-600 dark:text-emerald-400 mx-auto mb-2" />
                      <h3 className="font-medium text-slate-900 dark:text-slate-100 font-jakarta">
                        Accept Incoming
                      </h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                        Use the incoming changes and discard current version
                      </p>
                    </CardContent>
                  </Card>
                  
                  {/* Reject Incoming */}
                  <Card 
                    className={cn(
                      "cursor-pointer transition-all duration-200 hover:shadow-md",
                      selectedResolution === 'reject' && "ring-2 ring-red-500 bg-red-50 dark:bg-red-900/10"
                    )}
                    onClick={() => setSelectedResolution('reject')}
                  >
                    <CardContent className="p-4 text-center">
                      <XCircle className="h-8 w-8 text-red-600 dark:text-red-400 mx-auto mb-2" />
                      <h3 className="font-medium text-slate-900 dark:text-slate-100 font-jakarta">
                        Reject Incoming
                      </h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                        Keep current version and discard incoming changes
                      </p>
                    </CardContent>
                  </Card>
                  
                  {/* Merge Changes */}
                  <Card 
                    className={cn(
                      "cursor-pointer transition-all duration-200 hover:shadow-md",
                      selectedResolution === 'merge' && "ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/10"
                    )}
                    onClick={() => setSelectedResolution('merge')}
                  >
                    <CardContent className="p-4 text-center">
                      <Merge className="h-8 w-8 text-blue-600 dark:text-blue-400 mx-auto mb-2" />
                      <h3 className="font-medium text-slate-900 dark:text-slate-100 font-jakarta">
                        Merge Changes
                      </h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                        Manually select which changes to keep
                      </p>
                    </CardContent>
                  </Card>
                </div>
                
                {/* Merge Interface */}
                <AnimatePresence>
                  {selectedResolution === 'merge' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="border border-slate-200 dark:border-slate-700 rounded-lg p-4"
                    >
                      <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-4 font-jakarta">
                        Select Fields to Merge
                      </h4>
                      
                      <div className="space-y-3">
                        {changeComparison.map((comparison) => (
                          <div key={comparison.field} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                            <span className="font-medium text-slate-900 dark:text-slate-100 font-jakarta">
                              {comparison.label}
                            </span>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant={mergedData?.[comparison.field] === comparison.currentValue ? "default" : "outline"}
                                onClick={() => handleMergeFieldChange(comparison.field, false)}
                              >
                                Use Current
                              </Button>
                              <Button
                                size="sm"
                                variant={mergedData?.[comparison.field] === comparison.incomingValue ? "default" : "outline"}
                                onClick={() => handleMergeFieldChange(comparison.field, true)}
                              >
                                Use Incoming
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                
                {/* Action Buttons */}
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                  <Button variant="outline" onClick={onCancel} disabled={isResolving}>
                    Cancel
                  </Button>
                  <Button
                    onClick={() => selectedResolution && handleResolve(selectedResolution)}
                    disabled={!selectedResolution || isResolving}
                    className="bg-orange-500 hover:bg-orange-600 text-white"
                  >
                    {isResolving ? (
                      <>
                        <RotateCcw className="h-4 w-4 mr-2 animate-spin" />
                        Resolving...
                      </>
                    ) : (
                      'Resolve Conflict'
                    )}
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default ConflictResolution;