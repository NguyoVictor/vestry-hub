import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Upload, Image as ImageIcon, FolderPlus, X, Download, Trash2 } from "lucide-react";
import { useChurch } from "@/contexts/ChurchContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const ChurchMedia = () => {
  const church = useChurch();
  const qc = useQueryClient();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selectedAlbum, setSelectedAlbum] = useState<string | null>(null);
  const [lightboxPhoto, setLightboxPhoto] = useState<any>(null);
  const [newAlbumName, setNewAlbumName] = useState("");
  const [albumDialogOpen, setAlbumDialogOpen] = useState(false);

  const { data: albums = [] } = useQuery({
    queryKey: ["media_albums", church.tenantId],
    queryFn: async () => { const { data } = await supabase.from("media_albums").select("*").order("created_at", { ascending: false }); return data || []; },
  });

  const { data: photos = [], isLoading } = useQuery({
    queryKey: ["media_photos", church.tenantId, selectedAlbum],
    queryFn: async () => {
      let q = supabase.from("media_photos").select("*").order("created_at", { ascending: false });
      if (selectedAlbum) q = q.eq("album_id", selectedAlbum);
      const { data } = await q;
      return data || [];
    },
  });

  const createAlbum = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase.from("media_albums").insert({ tenant_id: church.tenantId, name, created_by: church.userId });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["media_albums"] }); toast.success("Album created"); setAlbumDialogOpen(false); setNewAlbumName(""); },
  });

  const deletePhoto = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("media_photos").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["media_photos"] }); toast.success("Photo deleted"); setLightboxPhoto(null); },
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    for (const file of Array.from(files)) {
      if (file.size > 25 * 1024 * 1024) { toast.error(`${file.name} exceeds 25MB`); continue; }
      const path = `${church.tenantId}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from("church-media").upload(path, file);
      if (error) { toast.error(`Failed: ${file.name}`); continue; }
      const { data: { publicUrl } } = supabase.storage.from("church-media").getPublicUrl(path);
      await supabase.from("media_photos").insert({
        tenant_id: church.tenantId, album_id: selectedAlbum, file_url: publicUrl,
        file_type: file.type.startsWith("video") ? "video" : "image",
        file_size: file.size, uploaded_by: church.userId,
      });
    }
    qc.invalidateQueries({ queryKey: ["media_photos"] });
    toast.success("Photos uploaded");
    setUploadOpen(false);
  };

  return (
    <>
      <Helmet><title>Church Media — Vestry</title></Helmet>
      <PageHeader title="Church Media" subtitle="Photos and videos from your church" action={
        <div className="flex gap-2">
          <Dialog open={albumDialogOpen} onOpenChange={setAlbumDialogOpen}>
            <DialogTrigger asChild><Button variant="outline" size="sm"><FolderPlus className="mr-2 h-4 w-4" />Create Album</Button></DialogTrigger>
            <DialogContent><DialogHeader><DialogTitle>Create Album</DialogTitle></DialogHeader><div className="space-y-4 mt-4"><Label>Album Name</Label><Input value={newAlbumName} onChange={e => setNewAlbumName(e.target.value)} /><Button onClick={() => createAlbum.mutate(newAlbumName)} disabled={!newAlbumName.trim()}>Create</Button></div></DialogContent>
          </Dialog>
          <Button size="sm" onClick={() => setUploadOpen(true)}><Upload className="mr-2 h-4 w-4" />Upload Media</Button>
        </div>
      } />

      <div className="mb-6">
        <h3 className="text-sm font-semibold mb-3">Albums</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          <Card className={`cursor-pointer hover:shadow-md transition-shadow ${!selectedAlbum ? "ring-2 ring-primary" : ""}`} onClick={() => setSelectedAlbum(null)}>
            <CardContent className="pt-5 text-center"><ImageIcon className="mx-auto h-8 w-8 text-muted-foreground mb-2" /><p className="font-medium text-sm">All Photos</p><p className="text-xs text-muted-foreground">{photos.length} items</p></CardContent>
          </Card>
          {albums.map((album: any) => (
            <Card key={album.id} className={`cursor-pointer hover:shadow-md transition-shadow ${selectedAlbum === album.id ? "ring-2 ring-primary" : ""}`} onClick={() => setSelectedAlbum(album.id)}>
              <CardContent className="pt-5 text-center">
                {album.cover_photo_url ? <img src={album.cover_photo_url} alt={album.name} className="w-full h-20 object-cover rounded-md mb-2" /> : <ImageIcon className="mx-auto h-8 w-8 text-muted-foreground mb-2" />}
                <p className="font-medium text-sm">{album.name}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {isLoading ? <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">{Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="aspect-square rounded-md" />)}</div> :
      photos.length === 0 ? (
        <Card><CardContent className="flex flex-col items-center justify-center py-16"><ImageIcon className="h-16 w-16 text-muted-foreground/30 mb-4" /><h3 className="font-semibold">No photos yet</h3><Button className="mt-4" onClick={() => setUploadOpen(true)}><Upload className="mr-2 h-4 w-4" />Upload</Button></CardContent></Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
          {photos.map((photo: any) => (
            <div key={photo.id} className="relative group cursor-pointer rounded-md overflow-hidden aspect-square bg-muted" onClick={() => setLightboxPhoto(photo)}>
              <img src={photo.file_url} alt={photo.caption || ""} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                <ImageIcon className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
          ))}
        </div>
      )}

      {lightboxPhoto && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center" onClick={() => setLightboxPhoto(null)}>
          <div className="relative max-w-4xl max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <img src={lightboxPhoto.file_url} alt="" className="max-w-full max-h-[90vh] object-contain" />
            <div className="absolute top-4 right-4 flex gap-2">
              <Button variant="secondary" size="icon" onClick={() => window.open(lightboxPhoto.file_url, "_blank")}><Download className="h-4 w-4" /></Button>
              <Button variant="destructive" size="icon" onClick={() => deletePhoto.mutate(lightboxPhoto.id)}><Trash2 className="h-4 w-4" /></Button>
              <Button variant="secondary" size="icon" onClick={() => setLightboxPhoto(null)}><X className="h-4 w-4" /></Button>
            </div>
            {lightboxPhoto.caption && <p className="text-white text-center mt-3">{lightboxPhoto.caption}</p>}
          </div>
        </div>
      )}

      <Sheet open={uploadOpen} onOpenChange={setUploadOpen}>
        <SheetContent className="sm:max-w-lg">
          <SheetHeader><SheetTitle>Upload Media</SheetTitle></SheetHeader>
          <div className="mt-6"><div className="border-2 border-dashed rounded-lg p-8 text-center"><Upload className="mx-auto h-10 w-10 text-muted-foreground mb-3" /><p className="text-sm font-medium">Drag files here or click to browse</p><p className="text-xs text-muted-foreground mt-1">JPG, PNG, WEBP, MP4 — Max 25MB each</p><Input type="file" multiple accept="image/*,video/*" onChange={handleUpload} className="mt-4" /></div></div>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default ChurchMedia;
