/**
 * Setlist Manager Component
 * 
 * Manages setlist creation, editing, and multiple setlists per service.
 * Provides the main interface for setlist management operations.
 */

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Calendar, 
  Clock, 
  Music, 
  Users, 
  Settings,
  Copy,
  Trash2,
  Edit3,
  Save,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import type { Setlist, ServiceType } from '@/types/song-library';

interface SetlistManagerProps {
  setlists: Setlist[];
  activeSetlist: string | null;
  onSetlistCreate: (setlist: Omit<Setlist, 'id' | 'created_at' | 'updated_at'>) => void;
  onSetlistUpdate: (setlistId: string, updates: Partial<Setlist>) => void;
  onSetlistDelete: (setlistId: string) => void;
  onSetlistDuplicate: (setlistId: string) => void;
  onSetlistActivate: (setlistId: string | null) => void;
  className?: string;
}

interface SetlistFormData {
  name: string;
  service_date: string;
  service_type: ServiceType;
  notes: string;
}

const SERVICE_TYPES: { value: ServiceType; label: string }[] = [
  { value: 'worship', label: 'Worship Service' },
  { value: 'pre-service', label: 'Pre-Service' },
  { value: 'special', label: 'Special Event' },
  { value: 'rehearsal', label: 'Rehearsal' },
  { value: 'other', label: 'Other' },
];

export function SetlistManager({
  setlists,
  activeSetlist,
  onSetlistCreate,
  onSetlistUpdate,
  onSetlistDelete,
  onSetlistDuplicate,
  onSetlistActivate,
  className = '',
}: SetlistManagerProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingSetlist, setEditingSetlist] = useState<string | null>(null);
  const [formData, setFormData] = useState<SetlistFormData>({
    name: '',
    service_date: '',
    service_type: 'worship',
    notes: '',
  });

  // Calculate setlist statistics
  const calculateSetlistStats = useCallback((setlist: Setlist) => {
    const songCount = setlist.items.length;
    const totalDuration = setlist.total_duration || 0;
    const durationDisplay = totalDuration > 0 
      ? `${Math.floor(totalDuration / 60)}m ${totalDuration % 60}s`
      : 'Unknown';
    
    return { songCount, durationDisplay };
  }, []);

  // Handle form submission for create/edit
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingSetlist) {
      // Update existing setlist
      onSetlistUpdate(editingSetlist, {
        name: formData.name,
        service_date: formData.service_date || undefined,
        service_type: formData.service_type,
        notes: formData.notes || undefined,
      });
      setEditingSetlist(null);
    } else {
      // Create new setlist
      onSetlistCreate({
        tenant_id: '', // Will be set by the parent component
        name: formData.name,
        service_date: formData.service_date || undefined,
        service_type: formData.service_type,
        notes: formData.notes || undefined,
        items: [],
        collaborators: [],
        is_collaborative: false,
        active_collaborators: [],
        version: 1,
        status: 'draft',
      });
      setIsCreateDialogOpen(false);
    }
    
    // Reset form
    setFormData({
      name: '',
      service_date: '',
      service_type: 'worship',
      notes: '',
    });
  }, [formData, editingSetlist, onSetlistCreate, onSetlistUpdate]);

  // Handle edit initiation
  const handleEdit = useCallback((setlist: Setlist) => {
    setFormData({
      name: setlist.name,
      service_date: setlist.service_date || '',
      service_type: setlist.service_type || 'worship',
      notes: setlist.notes || '',
    });
    setEditingSetlist(setlist.id);
  }, []);

  // Handle cancel edit
  const handleCancelEdit = useCallback(() => {
    setEditingSetlist(null);
    setFormData({
      name: '',
      service_date: '',
      service_type: 'worship',
      notes: '',
    });
  }, []);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 font-jakarta">
            Service Setlists
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1 font-jakarta">
            Plan and organize your worship services
          </p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-orange-500 hover:bg-orange-600 text-white font-jakarta">
              <Plus className="h-4 w-4 mr-2" />
              New Setlist
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
            <DialogHeader>
              <DialogTitle className="font-jakarta text-slate-900 dark:text-slate-100">Create New Setlist</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name" className="font-jakarta">Setlist Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Sunday Morning Worship"
                  required
                  className="font-jakarta"
                />
              </div>
              
              <div>
                <Label htmlFor="service_date" className="font-jakarta">Service Date</Label>
                <Input
                  id="service_date"
                  type="date"
                  value={formData.service_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, service_date: e.target.value }))}
                  className="font-jakarta"
                />
              </div>
              
              <div>
                <Label htmlFor="service_type" className="font-jakarta">Service Type</Label>
                <Select
                  value={formData.service_type}
                  onValueChange={(value: ServiceType) => 
                    setFormData(prev => ({ ...prev, service_type: value }))
                  }
                >
                  <SelectTrigger className="font-jakarta">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SERVICE_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value} className="font-jakarta">
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="notes" className="font-jakarta">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Special instructions or notes for this service..."
                  rows={3}
                  className="font-jakarta"
                />
              </div>
              
              <div className="flex justify-end gap-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsCreateDialogOpen(false)}
                  className="font-jakarta"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="bg-orange-500 hover:bg-orange-600 text-white font-jakarta"
                >
                  Create Setlist
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Setlists Grid */}
      {setlists.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Calendar className="h-12 w-12 text-slate-300 dark:text-slate-600 mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2 font-jakarta">
            No setlists yet
          </h3>
          <p className="text-slate-500 dark:text-slate-400 max-w-sm mb-6 font-jakarta">
            Create your first setlist to start planning worship services and organizing your songs.
          </p>
          <Button 
            onClick={() => setIsCreateDialogOpen(true)}
            className="bg-orange-500 hover:bg-orange-600 text-white font-jakarta"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Setlist
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {setlists.map((setlist, index) => {
              const { songCount, durationDisplay } = calculateSetlistStats(setlist);
              const isActive = activeSetlist === setlist.id;
              const isEditing = editingSetlist === setlist.id;
              
              return (
                <motion.div
                  key={setlist.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ y: -4, boxShadow: "0 12px 30px rgba(0,0,0,0.15)" }}
                  className={`
                    bg-white dark:bg-slate-800 rounded-xl border shadow-sm transition-all duration-200 overflow-hidden
                    ${isActive 
                      ? 'border-orange-300 dark:border-orange-600 ring-2 ring-orange-100 dark:ring-orange-900/50' 
                      : 'border-slate-200 dark:border-slate-700 hover:shadow-lg'
                    }
                  `}
                >
                  {isEditing ? (
                    // Edit Form
                    <form onSubmit={handleSubmit} className="p-6 space-y-4">
                      <Input
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        className="font-semibold font-jakarta"
                        required
                      />
                      
                      <Input
                        type="date"
                        value={formData.service_date}
                        onChange={(e) => setFormData(prev => ({ ...prev, service_date: e.target.value }))}
                        className="font-jakarta"
                      />
                      
                      <Select
                        value={formData.service_type}
                        onValueChange={(value: ServiceType) => 
                          setFormData(prev => ({ ...prev, service_type: value }))
                        }
                      >
                        <SelectTrigger className="font-jakarta">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SERVICE_TYPES.map(type => (
                            <SelectItem key={type.value} value={type.value} className="font-jakarta">
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      <div className="flex justify-end gap-2">
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm" 
                          onClick={handleCancelEdit}
                          className="font-jakarta"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                        <Button 
                          type="submit" 
                          size="sm" 
                          className="bg-orange-500 hover:bg-orange-600 text-white font-jakarta"
                        >
                          <Save className="h-4 w-4" />
                        </Button>
                      </div>
                    </form>
                  ) : (
                    // Display Mode
                    <>
                      <div className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 truncate font-jakarta">
                              {setlist.name}
                            </h3>
                            {setlist.service_date && (
                              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-jakarta">
                                {format(new Date(setlist.service_date), 'EEEE, MMMM d, yyyy')}
                              </p>
                            )}
                          </div>
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                              >
                                <Settings className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem onClick={() => handleEdit(setlist)}>
                                <Edit3 className="h-4 w-4 mr-2" />
                                Edit Setlist
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => onSetlistDuplicate(setlist.id)}>
                                <Copy className="h-4 w-4 mr-2" />
                                Duplicate
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => onSetlistDelete(setlist.id)}
                                className="text-red-600 dark:text-red-400"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        {/* Service Type Badge */}
                        {setlist.service_type && (
                          <Badge variant="secondary" className="mb-3 font-jakarta">
                            {SERVICE_TYPES.find(t => t.value === setlist.service_type)?.label}
                          </Badge>
                        )}

                        {/* Stats */}
                        <div className="flex items-center justify-between text-sm mb-4">
                          <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                            <Music className="h-4 w-4" />
                            <span className="font-jakarta">{songCount} songs</span>
                          </div>
                          <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                            <Clock className="h-4 w-4" />
                            <span className="font-jakarta">{durationDisplay}</span>
                          </div>
                        </div>

                        {/* Collaboration indicator */}
                        {setlist.collaborators.length > 0 && (
                          <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 mb-4">
                            <Users className="h-3 w-3" />
                            <span className="font-jakarta">{setlist.collaborators.length} collaborators</span>
                          </div>
                        )}

                        {/* Notes preview */}
                        {setlist.notes && (
                          <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 mb-4 font-jakarta">
                            {setlist.notes}
                          </p>
                        )}
                      </div>

                      {/* Action Button */}
                      <div className="px-6 pb-6">
                        <Button
                          onClick={() => onSetlistActivate(isActive ? null : setlist.id)}
                          className={`
                            w-full font-jakarta
                            ${isActive 
                              ? 'bg-orange-500 hover:bg-orange-600 text-white' 
                              : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300'
                            }
                          `}
                        >
                          {isActive ? 'Currently Active' : 'Open Setlist'}
                        </Button>
                      </div>
                    </>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

export default SetlistManager;