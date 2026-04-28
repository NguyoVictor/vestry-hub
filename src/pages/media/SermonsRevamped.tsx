import { useState, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useChurch } from '@/contexts/ChurchContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Search, QrCode, Share2, MoreHorizontal, Eye, Pencil, Trash2, Copy,
  BookOpen, Calendar, User, Video, Music, FileText, Star, X, Upload, Loader2,
  Download
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { QRCodeSVG } from 'qrcode.react';
import { cn } from '@/lib/utils';
import SermonDrawer from '@/components/sermons/SermonDrawer';

export default function SermonsRevamped() {
  const church = useChurch();
  const queryClient = useQueryClient();
  const qrRef = useRef<SVGSVGElement>(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [seriesFilter, setSeriesFilter] = useState('all');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingSermon, setEditingSermon] = useState<any>(null);
  const [qrOpen, setQrOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedSermons, setSelectedSermons] = useState<string[]>([]);

  const publicSermonUrl = `${window.location.origin}/sermons/${church.tenantId}`;

  // Fetch sermons
  const { data: sermons = [], isLoading } = useQuery({
    queryKey: ['sermons-admin', church.tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sermons')
        .select('*')
        .eq('tenant_id', church.tenantId!)
        .order('sermon_date', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    staleTime: 60000,
  });

  const allSeries = Array.from(new Set(sermons.map((s: any) => s.series).filter(Boolean)));

  const filtered = sermons.filter((s: any) => {
    const matchSearch = !search.trim() ||
      (s.title || '').toLowerCase().includes(search.toLowerCase()) ||
      (s.scripture_reference || '').toLowerCase().includes(search.toLowerCase()) ||
      (s.speaker || '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' ||
      (statusFilter === 'published' && s.is_published) ||
      (statusFilter === 'draft' && !s.is_published);
    const matchSeries = seriesFilter === 'all' || s.series === seriesFilter;
    return matchSearch && matchStatus && matchSeries;
  });

  // Delete mutation
  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('sermons').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sermons-admin'] });
      toast.success('Sermon deleted');
      setDeleteId(null);
    },
  });

  // Toggle featured
  const toggleFeatured = useMutation({
    mutationFn: async (sermon: any) => {
      // First, unfeatured all others
      await supabase
        .from('sermons')
        .update({ is_featured: false })
        .eq('tenant_id', church.tenantId!);
      
      // Then feature this one
      const { error } = await supabase
        .from('sermons')
        .update({ is_featured: !sermon.is_featured })
        .eq('id', sermon.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sermons-admin'] });
      toast.success('Featured sermon updated');
    },
  });

  // Duplicate sermon
  const duplicateSermon = useMutation({
    mutationFn: async (sermon: any) => {
      const { id, created_at, updated_at, view_count, ...rest } = sermon;
      const { error } = await supabase.from('sermons').insert({
        ...rest,
        title: `${sermon.title} (Copy)`,
        is_published: false,
        is_featured: false,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sermons-admin'] });
      toast.success('Sermon duplicated');
    },
  });

  // Bulk publish
  const bulkPublish = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('sermons')
        .update({ is_published: true })
        .in('id', selectedSermons);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sermons-admin'] });
      toast.success(`${selectedSermons.length} sermons published`);
      setSelectedSermons([]);
    },
  });

  // Bulk delete
  const bulkDelete = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('sermons')
        .delete()
        .in('id', selectedSermons);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sermons-admin'] });
      toast.success(`${selectedSermons.length} sermons deleted`);
      setSelectedSermons([]);
    },
  });

  const downloadQR = () => {
    if (!qrRef.current) return;
    const svg = new XMLSerializer().serializeToString(qrRef.current);
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sermons-qr.svg';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success('QR code downloaded');
  };

  const openCreate = () => {
    setEditingSermon(null);
    setDrawerOpen(true);
  };

  const openEdit = (sermon: any) => {
    setEditingSermon(sermon);
    setDrawerOpen(true);
  };

  return (
    <>
      <Helmet><title>Sermons & Messages — Vestry</title></Helmet>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white font-jakarta">
            Sermons & Messages
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-jakarta">
            Manage and share sermon content
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setQrOpen(true)}>
            <QrCode className="h-4 w-4 mr-2" />Sermons QR
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShareOpen(true)}>
            <Share2 className="h-4 w-4 mr-2" />Share Link
          </Button>
          <Button onClick={openCreate} className="bg-orange-500 hover:bg-orange-600 text-white">
            <Plus className="h-4 w-4 mr-2" />Add Sermon
          </Button>
        </div>
      </div>

      {/* Bulk Actions */}
      <AnimatePresence>
        {selectedSermons.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-xl p-4 mb-4 flex items-center justify-between"
          >
            <p className="text-sm font-medium text-orange-900 dark:text-orange-100 font-jakarta">
              {selectedSermons.length} sermon{selectedSermons.length > 1 ? 's' : ''} selected
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => bulkPublish.mutate()}
                disabled={bulkPublish.isPending}
              >
                Publish Selected
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (confirm(`Delete ${selectedSermons.length} sermons?`)) {
                    bulkDelete.mutate();
                  }
                }}
                disabled={bulkDelete.isPending}
                className="text-red-600 hover:text-red-700"
              >
                Delete Selected
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedSermons([])}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search sermons by title, scripture, or speaker..."
            className="pl-9 font-jakarta"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-36 font-jakarta">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="draft">Drafts</SelectItem>
          </SelectContent>
        </Select>
        <Select value={seriesFilter} onValueChange={setSeriesFilter}>
          <SelectTrigger className="w-full sm:w-36 font-jakarta">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Series</SelectItem>
            {allSeries.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Sermon Table */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-16 text-center">
          <BookOpen className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-jakarta mb-4">No sermons found</p>
          <Button onClick={openCreate} className="bg-orange-500 hover:bg-orange-600 text-white">
            <Plus className="h-4 w-4 mr-2" />Add First Sermon
          </Button>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <Checkbox
                      checked={selectedSermons.length === filtered.length}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedSermons(filtered.map((s: any) => s.id));
                        } else {
                          setSelectedSermons([]);
                        }
                      }}
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide font-jakarta">
                    Sermon
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide font-jakarta">
                    Details
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide font-jakarta">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide font-jakarta">
                    Views
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide font-jakarta">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((sermon: any) => (
                  <tr
                    key={sermon.id}
                    className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="px-4 py-4">
                      <Checkbox
                        checked={selectedSermons.includes(sermon.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedSermons([...selectedSermons, sermon.id]);
                          } else {
                            setSelectedSermons(selectedSermons.filter(id => id !== sermon.id));
                          }
                        }}
                      />
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-lg bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0">
                          {sermon.thumbnail_url ? (
                            <img src={sermon.thumbnail_url} alt={sermon.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <BookOpen className="h-5 w-5 text-slate-400" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-sm text-slate-900 dark:text-white font-jakarta truncate">
                              {sermon.title}
                            </p>
                            {sermon.is_featured && (
                              <Star className="h-4 w-4 text-orange-500 fill-orange-500 shrink-0" />
                            )}
                          </div>
                          {sermon.series && (
                            <Badge variant="secondary" className="text-xs mt-1">
                              {sermon.series}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="space-y-1 text-xs text-slate-600 dark:text-slate-400 font-jakarta">
                        {sermon.speaker && (
                          <div className="flex items-center gap-1.5">
                            <User className="h-3 w-3" />
                            <span>{sermon.speaker}</span>
                          </div>
                        )}
                        {sermon.scripture_reference && (
                          <div className="flex items-center gap-1.5">
                            <BookOpen className="h-3 w-3" />
                            <span>{sermon.scripture_reference}</span>
                          </div>
                        )}
                        {sermon.sermon_date && (
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-3 w-3" />
                            <span>{format(new Date(sermon.sermon_date), 'MMM d, yyyy')}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col gap-2">
                        <Badge
                          className={cn(
                            'w-fit',
                            sermon.is_published
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                          )}
                        >
                          {sermon.is_published ? 'Published' : 'Draft'}
                        </Badge>
                        <div className="flex items-center gap-1">
                          {sermon.video_url && <Video className="h-3 w-3 text-red-500" />}
                          {sermon.audio_url && <Music className="h-3 w-3 text-blue-500" />}
                          {sermon.manuscript && <FileText className="h-3 w-3 text-emerald-500" />}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400 font-jakarta">
                        <Eye className="h-4 w-4" />
                        <span>{sermon.view_count || 0}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => window.open(`/sermons/${church.tenantId}/${sermon.id}`, '_blank')}>
                            <Eye className="h-4 w-4 mr-2" />View Public Page
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEdit(sermon)}>
                            <Pencil className="h-4 w-4 mr-2" />Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => duplicateSermon.mutate(sermon)}>
                            <Copy className="h-4 w-4 mr-2" />Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => toggleFeatured.mutate(sermon)}>
                            <Star className="h-4 w-4 mr-2" />
                            {sermon.is_featured ? 'Unfeature' : 'Set as Featured'}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-600 focus:text-red-600"
                            onClick={() => setDeleteId(sermon.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* QR Dialog */}
      <AnimatePresence>
        {qrOpen && (
          <QRDialog
            open={qrOpen}
            onClose={() => setQrOpen(false)}
            url={publicSermonUrl}
            qrRef={qrRef}
            onDownload={downloadQR}
          />
        )}
      </AnimatePresence>

      {/* Share Dialog */}
      <AnimatePresence>
        {shareOpen && (
          <ShareDialog
            open={shareOpen}
            onClose={() => setShareOpen(false)}
            url={publicSermonUrl}
          />
        )}
      </AnimatePresence>

      {/* Add/Edit Drawer */}
      <AnimatePresence>
        {drawerOpen && (
          <SermonDrawer
            open={drawerOpen}
            onClose={() => {
              setDrawerOpen(false);
              setEditingSermon(null);
            }}
            sermon={editingSermon}
            tenantId={church.tenantId!}
            userId={church.userId}
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ['sermons-admin'] });
              setDrawerOpen(false);
              setEditingSermon(null);
            }}
          />
        )}
      </AnimatePresence>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this sermon?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The sermon will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => deleteId && deleteMut.mutate(deleteId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// QR Dialog Component
function QRDialog({ open, onClose, url, qrRef, onDownload }: any) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-sm w-full"
      >
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 font-jakarta">
          Sermons QR Code
        </h3>
        <div className="flex flex-col items-center p-6 bg-white rounded-xl border border-slate-200 mb-4">
          <QRCodeSVG ref={qrRef} value={url} size={200} level="H" includeMargin />
          <p className="text-xs text-slate-500 mt-3 font-jakarta">Scan to access sermon library</p>
        </div>
        <div className="space-y-3">
          <div>
            <Label className="text-xs text-slate-500 font-jakarta">Public Link</Label>
            <div className="flex gap-2 mt-1">
              <Input value={url} readOnly className="text-xs font-mono" />
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  navigator.clipboard.writeText(url);
                  toast.success('Link copied');
                }}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm" onClick={onDownload}>
              <Download className="h-4 w-4 mr-2" />Download QR
            </Button>
            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Share Dialog Component
function ShareDialog({ open, onClose, url }: any) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-sm w-full"
      >
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 font-jakarta">
          Share Sermon Page
        </h3>
        <div className="flex justify-center p-4 bg-white rounded-xl border border-slate-200 mb-4">
          <QRCodeSVG value={url} size={160} level="H" includeMargin />
        </div>
        <div className="flex gap-2 mb-4">
          <Input value={url} readOnly className="text-xs font-mono" />
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              navigator.clipboard.writeText(url);
              toast.success('Link copied');
            }}
          >
            <Copy className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-slate-500 text-center mb-4 font-jakarta">
          Share this link or QR code for public access to all published sermons
        </p>
        <Button variant="outline" className="w-full" onClick={onClose}>
          Close
        </Button>
      </motion.div>
    </motion.div>
  );
}

