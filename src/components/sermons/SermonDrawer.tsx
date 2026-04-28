import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { X, Loader2, Upload, Image as ImageIcon, Video, Music, FileText } from 'lucide-react';
import { toast } from 'sonner';

interface SermonDrawerProps {
  open: boolean;
  onClose: () => void;
  sermon: any | null;
  tenantId: string;
  userId: string | null;
  onSuccess: () => void;
}

export default function SermonDrawer({
  open,
  onClose,
  sermon,
  tenantId,
  userId,
  onSuccess,
}: SermonDrawerProps) {
  const thumbnailRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLInputElement>(null);
  const docRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState(sermon?.title || '');
  const [sermonDate, setSermonDate] = useState(sermon?.sermon_date || new Date().toISOString().split('T')[0]);
  const [scripture, setScripture] = useState(sermon?.scripture_reference || '');
  const [preacher, setPreacher] = useState(sermon?.speaker || '');
  const [series, setSeries] = useState(sermon?.series || '');
  const [description, setDescription] = useState(sermon?.description || '');
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(sermon?.thumbnail_url || null);
  const [sermonNotes, setSermonNotes] = useState(sermon?.manuscript || '');
  const [videoUrl, setVideoUrl] = useState(sermon?.video_url || '');
  const [audioUrl, setAudioUrl] = useState(sermon?.audio_url || '');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [docFile, setDocFile] = useState<File | null>(null);
  const [isPublished, setIsPublished] = useState(sermon?.is_published || false);
  const [saving, setSaving] = useState(false);

  const handleThumbnail = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setThumbnailFile(f);
    setThumbnailPreview(URL.createObjectURL(f));
  };

  const removeThumbnail = () => {
    setThumbnailFile(null);
    setThumbnailPreview(null);
    if (thumbnailRef.current) {
      thumbnailRef.current.value = '';
    }
  };

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!title.trim()) throw new Error('Title is required');

      setSaving(true);

      // Upload thumbnail
      let thumbnailUrl = sermon?.thumbnail_url || null;
      let thumbnailPath = sermon?.thumbnail_path || null;
      
      // If thumbnail was removed, clear it
      if (!thumbnailPreview && sermon?.thumbnail_url) {
        thumbnailUrl = null;
        thumbnailPath = null;
      }
      
      // If new thumbnail file selected, upload it
      if (thumbnailFile) {
        thumbnailPath = `${tenantId}/${Date.now()}-${thumbnailFile.name}`;
        const { error: upErr } = await supabase.storage
          .from('sermon-thumbnails')
          .upload(thumbnailPath, thumbnailFile, {
            upsert: false,
            contentType: thumbnailFile.type
          });
        
        if (upErr) {
          console.error('Thumbnail upload error:', upErr);
          toast.error(`Failed to upload thumbnail: ${upErr.message}`);
          throw upErr;
        }
        
        const { data: { publicUrl } } = supabase.storage
          .from('sermon-thumbnails')
          .getPublicUrl(thumbnailPath);
        thumbnailUrl = publicUrl;
      }

      // Upload audio file
      let resolvedAudioUrl = audioUrl || null;
      let audioFilePath = sermon?.audio_file_path || null;
      if (audioFile) {
        audioFilePath = `${tenantId}/${Date.now()}-${audioFile.name}`;
        const { error: audioErr } = await supabase.storage
          .from('sermon-audio')
          .upload(audioFilePath, audioFile);
        if (!audioErr) resolvedAudioUrl = null;
      }

      // Upload document
      let docFilePath = sermon?.doc_file_path || null;
      if (docFile) {
        docFilePath = `${tenantId}/${Date.now()}-${docFile.name}`;
        await supabase.storage.from('sermon-documents').upload(docFilePath, docFile);
      }

      const payload: any = {
        tenant_id: tenantId,
        title,
        sermon_date: sermonDate || null,
        scripture_reference: scripture || null,
        speaker: preacher || null,
        series: series || null,
        description: description || null,
        is_published: isPublished,
        thumbnail_url: thumbnailUrl,
        thumbnail_path: thumbnailPath,
        video_url: videoUrl || null,
        audio_url: resolvedAudioUrl,
        audio_file_path: audioFilePath,
        doc_file_path: docFilePath,
        manuscript: sermonNotes || null,
      };

      if (sermon?.id) {
        const { error } = await supabase
          .from('sermons')
          .update(payload)
          .eq('id', sermon.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('sermons')
          .insert({ ...payload, created_by: userId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(sermon?.id ? 'Sermon updated' : 'Sermon saved');
      onSuccess();
    },
    onError: (err: any) => {
      toast.error(err.message || 'Save failed');
      setSaving(false);
    },
  });

  if (!open) return null;

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />

      {/* Drawer */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="fixed right-0 top-0 h-full w-full sm:w-[600px] bg-white dark:bg-slate-900 z-50 shadow-2xl flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white font-jakarta">
            {sermon?.id ? 'Edit Sermon' : 'Add New Sermon'}
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {/* Basic Information */}
          <div>
            <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-4 font-jakarta flex items-center gap-2">
              <FileText className="h-4 w-4" />Basic Information
            </h3>
            <div className="space-y-4">
              <div>
                <Label className="font-jakarta">Title *</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter sermon title"
                  className="mt-1.5 font-jakarta"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="font-jakarta">Sermon Date</Label>
                  <Input
                    type="date"
                    value={sermonDate}
                    onChange={(e) => setSermonDate(e.target.value)}
                    className="mt-1.5 font-jakarta"
                  />
                </div>
                <div>
                  <Label className="font-jakarta">Preacher</Label>
                  <Input
                    value={preacher}
                    onChange={(e) => setPreacher(e.target.value)}
                    placeholder="Speaker name"
                    className="mt-1.5 font-jakarta"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="font-jakarta">Scripture Reference</Label>
                  <Input
                    value={scripture}
                    onChange={(e) => setScripture(e.target.value)}
                    placeholder="e.g., John 3:16"
                    className="mt-1.5 font-jakarta"
                  />
                </div>
                <div>
                  <Label className="font-jakarta">Series Name</Label>
                  <Input
                    value={series}
                    onChange={(e) => setSeries(e.target.value)}
                    placeholder="e.g., Faith Series"
                    className="mt-1.5 font-jakarta"
                  />
                </div>
              </div>
              <div>
                <Label className="font-jakarta">Description</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief summary of the sermon"
                  className="mt-1.5 resize-none font-jakarta"
                  rows={3}
                />
              </div>
            </div>
          </div>

          {/* Thumbnail */}
          <div className="pt-6 border-t border-slate-200 dark:border-slate-800">
            <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-4 font-jakarta flex items-center gap-2">
              <ImageIcon className="h-4 w-4" />Thumbnail Image
            </h3>
            <div className="flex items-center gap-4">
              <div className="h-24 w-32 rounded-lg border-2 border-dashed border-slate-200 dark:border-slate-700 flex items-center justify-center bg-slate-50 dark:bg-slate-800 shrink-0 overflow-hidden relative group">
                {thumbnailPreview ? (
                  <>
                    <img src={thumbnailPreview} className="w-full h-full object-cover" alt="" />
                    <button
                      onClick={removeThumbnail}
                      className="absolute top-1 right-1 h-6 w-6 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      type="button"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </>
                ) : (
                  <div className="text-center">
                    <ImageIcon className="h-6 w-6 text-slate-300 mx-auto" />
                    <p className="text-[10px] text-slate-400 mt-1">No image</p>
                  </div>
                )}
              </div>
              <div>
                <input
                  ref={thumbnailRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleThumbnail}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => thumbnailRef.current?.click()}
                  className="font-jakarta"
                >
                  <Upload className="h-4 w-4 mr-2" />Choose file
                </Button>
                <p className="text-xs text-slate-500 mt-1 font-jakarta">
                  Recommended: 16:9 aspect ratio
                </p>
              </div>
            </div>
          </div>

          {/* Sermon Content */}
          <div className="pt-6 border-t border-slate-200 dark:border-slate-800">
            <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-4 font-jakarta flex items-center gap-2">
              <FileText className="h-4 w-4" />Sermon Content
            </h3>
            <div>
              <Label className="font-jakarta">Sermon Notes / Manuscript</Label>
              <Textarea
                value={sermonNotes}
                onChange={(e) => setSermonNotes(e.target.value)}
                placeholder="Full sermon notes or manuscript..."
                className="mt-1.5 resize-none font-jakarta"
                rows={6}
              />
            </div>
          </div>

          {/* Media */}
          <div className="pt-6 border-t border-slate-200 dark:border-slate-800">
            <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-4 font-jakarta flex items-center gap-2">
              <Video className="h-4 w-4" />Media & Attachments
            </h3>
            <div className="space-y-4">
              <div>
                <Label className="font-jakarta flex items-center gap-2">
                  <Video className="h-4 w-4" />Video URL
                </Label>
                <Input
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="YouTube or Vimeo link"
                  className="mt-1.5 font-jakarta"
                />
              </div>
              <div>
                <Label className="font-jakarta flex items-center gap-2">
                  <Music className="h-4 w-4" />Audio URL
                </Label>
                <Input
                  value={audioUrl}
                  onChange={(e) => setAudioUrl(e.target.value)}
                  placeholder="Audio file link (or upload below)"
                  className="mt-1.5 font-jakarta"
                />
              </div>
              <div>
                <Label className="font-jakarta mb-1.5 block">Upload Audio File</Label>
                <input
                  ref={audioRef}
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={(e) => setAudioFile(e.target.files?.[0] || null)}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start font-jakarta"
                  onClick={() => audioRef.current?.click()}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {audioFile ? audioFile.name : 'Choose audio file'}
                </Button>
              </div>
              <div>
                <Label className="font-jakarta mb-1.5 block">Sermon Document (PDF/Word)</Label>
                <input
                  ref={docRef}
                  type="file"
                  accept=".pdf,.doc,.docx"
                  className="hidden"
                  onChange={(e) => setDocFile(e.target.files?.[0] || null)}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start font-jakarta"
                  onClick={() => docRef.current?.click()}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {docFile ? docFile.name : 'Choose document'}
                </Button>
              </div>
            </div>
          </div>

          {/* Publish Toggle */}
          <div className="pt-6 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between p-4 rounded-xl bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800">
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-white font-jakarta">
                  Publish Sermon
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-jakarta">
                  Make visible to members and public
                </p>
              </div>
              <Switch checked={isPublished} onCheckedChange={setIsPublished} />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex gap-3">
          <Button
            variant="outline"
            className="flex-1 font-jakarta"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-jakarta"
            onClick={() => saveMut.mutate()}
            disabled={saving || !title.trim()}
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Sermon'
            )}
          </Button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
