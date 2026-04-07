import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Upload, FolderPlus, Image as ImageIcon, FileText, Folder, MoreVertical, Download, Trash2, Search, LayoutGrid, List, HardDrive, Clock, Plus } from "lucide-react";
import { useChurch } from "@/contexts/ChurchContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const GraphicsStudio = () => {
  const church = useChurch();
  const qc = useQueryClient();
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  const { data: folders = [], isLoading: foldersLoading } = useQuery({
    queryKey: ["media_folders", church.tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("media_folders")
        .select("*")
        .order("name");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: assets = [], isLoading: assetsLoading } = useQuery({
    queryKey: ["media_assets", church.tenantId, selectedFolder],
    queryFn: async () => {
      let q = supabase.from("media_assets").select("*").eq("tenant_id", church.tenantId!).order("created_at", { ascending: false });
      if (selectedFolder) q = q.eq("folder_id", selectedFolder);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  const createFolder = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase.from("media_folders").insert({ tenant_id: church.tenantId, name });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["media_folders"] });
      toast.success("Folder created");
      setFolderDialogOpen(false);
      setNewFolderName("");
    },
  });

  const deleteAsset = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("media_assets").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["media_assets"] });
      toast.success("Asset deleted");
    },
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;

    for (const file of Array.from(files)) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} exceeds 10MB limit`);
        continue;
      }
      const path = `${church.tenantId}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from("church-media").upload(path, file);
      if (uploadError) { toast.error(`Failed to upload ${file.name}`); continue; }

      const { data: { publicUrl } } = supabase.storage.from("church-media").getPublicUrl(path);
      await supabase.from("media_assets").insert({
        tenant_id: church.tenantId,
        folder_id: selectedFolder,
        name: file.name,
        file_url: publicUrl,
        file_type: file.type,
        file_size: file.size,
        uploaded_by: church.userId,
      });
    }
    qc.invalidateQueries({ queryKey: ["media_assets"] });
    toast.success("Files uploaded");
    setUploadOpen(false);
  };

  const filtered = assets.filter(a => a.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const defaultFolders = ["Flyers", "Banners", "Social Media", "Logos", "Backgrounds", "Miscellaneous"];

  return (
    <>
      <Helmet><title>Graphics Studio — Vestry</title></Helmet>
      <PageHeader
        title="Graphics Studio"
        subtitle="Upload and manage your church design assets"
        action={
          <div className="flex gap-2">
            <Dialog open={folderDialogOpen} onOpenChange={setFolderDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm"><FolderPlus className="mr-2 h-4 w-4" />Create Folder</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Create Folder</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div><Label>Folder Name</Label><Input value={newFolderName} onChange={e => setNewFolderName(e.target.value)} placeholder="Enter folder name" /></div>
                  <Button onClick={() => createFolder.mutate(newFolderName)} disabled={!newFolderName.trim()}>Create</Button>
                </div>
              </DialogContent>
            </Dialog>
            <Button size="sm" onClick={() => setUploadOpen(true)}><Upload className="mr-2 h-4 w-4" />Upload Assets</Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card><CardContent className="pt-5"><div className="flex items-center gap-3"><div className="rounded-lg bg-primary/10 p-2.5"><ImageIcon className="h-5 w-5 text-primary" /></div><div><p className="text-2xl font-bold">{assets.length}</p><p className="text-sm text-muted-foreground">Total Assets</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-5"><div className="flex items-center gap-3"><div className="rounded-lg bg-emerald-500/10 p-2.5"><HardDrive className="h-5 w-5 text-emerald-500" /></div><div><p className="text-2xl font-bold">{(assets.reduce((s, a) => s + (Number(a.file_size) || 0), 0) / 1024 / 1024).toFixed(1)} MB</p><p className="text-sm text-muted-foreground">Storage Used</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-5"><div className="flex items-center gap-3"><div className="rounded-lg bg-amber-500/10 p-2.5"><Clock className="h-5 w-5 text-amber-500" /></div><div><p className="text-2xl font-bold">{assets.filter(a => { const d = new Date(a.created_at); const week = new Date(); week.setDate(week.getDate() - 7); return d > week; }).length}</p><p className="text-sm text-muted-foreground">Added This Week</p></div></div></CardContent></Card>
      </div>

      <div className="flex gap-6">
        <div className="hidden lg:block w-56 shrink-0">
          <h3 className="text-sm font-semibold mb-3">Folders</h3>
          <ScrollArea className="h-[500px]">
            <div className="space-y-1">
              <button onClick={() => setSelectedFolder(null)} className={`w-full text-left px-3 py-2 rounded-md text-sm flex items-center gap-2 ${!selectedFolder ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted"}`}>
                <Folder className="h-4 w-4" />All Assets
              </button>
              {defaultFolders.map(name => {
                const folder = folders.find((f: any) => f.name === name);
                return (
                  <button key={name} onClick={() => setSelectedFolder(folder?.id || name)} className={`w-full text-left px-3 py-2 rounded-md text-sm flex items-center gap-2 ${selectedFolder === (folder?.id || name) ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted"}`}>
                    <Folder className="h-4 w-4" />{name}
                  </button>
                );
              })}
              {folders.filter((f: any) => !defaultFolders.includes(f.name)).map((f: any) => (
                <button key={f.id} onClick={() => setSelectedFolder(f.id)} className={`w-full text-left px-3 py-2 rounded-md text-sm flex items-center gap-2 ${selectedFolder === f.id ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted"}`}>
                  <Folder className="h-4 w-4" />{f.name}
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search assets..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9" /></div>
            <Button variant="outline" size="icon" onClick={() => setViewMode(v => v === "grid" ? "list" : "grid")}>{viewMode === "grid" ? <List className="h-4 w-4" /> : <LayoutGrid className="h-4 w-4" />}</Button>
          </div>

          {assetsLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="aspect-square rounded-lg" />)}</div>
          ) : filtered.length === 0 ? (
            <Card><CardContent className="flex flex-col items-center justify-center py-16"><ImageIcon className="h-16 w-16 text-muted-foreground/30 mb-4" /><h3 className="font-semibold text-lg">No assets yet</h3><p className="text-sm text-muted-foreground mt-1">Upload your first design asset</p><Button className="mt-4" onClick={() => setUploadOpen(true)}><Upload className="mr-2 h-4 w-4" />Upload Assets</Button></CardContent></Card>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {filtered.map(asset => (
                <div key={asset.id} className="group relative rounded-lg border bg-card overflow-hidden hover:shadow-md transition-shadow">
                  <div className="aspect-square bg-muted flex items-center justify-center overflow-hidden">
                    {asset.file_type?.startsWith("image") ? (
                      <img src={asset.file_url} alt={asset.name} className="w-full h-full object-cover" />
                    ) : (
                      <FileText className="h-10 w-10 text-muted-foreground" />
                    )}
                  </div>
                  <div className="p-2">
                    <p className="text-xs font-medium truncate">{asset.name}</p>
                    <p className="text-xs text-muted-foreground">{((Number(asset.file_size) || 0) / 1024).toFixed(0)} KB</p>
                  </div>
                  <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="secondary" size="icon" className="h-7 w-7"><MoreVertical className="h-3.5 w-3.5" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => window.open(asset.file_url, "_blank")}><Download className="mr-2 h-4 w-4" />Download</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => deleteAsset.mutate(asset.id)}><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead><tr className="border-b"><th className="text-left p-3 font-medium">Name</th><th className="text-left p-3 font-medium">Type</th><th className="text-left p-3 font-medium">Size</th><th className="text-left p-3 font-medium">Date</th><th className="p-3" /></tr></thead>
                  <tbody>
                    {filtered.map(asset => (
                      <tr key={asset.id} className="border-b hover:bg-muted/50">
                        <td className="p-3 font-medium">{asset.name}</td>
                        <td className="p-3"><Badge variant="secondary">{asset.file_type?.split("/")[1] || "file"}</Badge></td>
                        <td className="p-3 text-muted-foreground">{((Number(asset.file_size) || 0) / 1024).toFixed(0)} KB</td>
                        <td className="p-3 text-muted-foreground">{new Date(asset.created_at).toLocaleDateString()}</td>
                        <td className="p-3"><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteAsset.mutate(asset.id)}><Trash2 className="h-3.5 w-3.5" /></Button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Sheet open={uploadOpen} onOpenChange={setUploadOpen}>
        <SheetContent className="sm:max-w-lg">
          <SheetHeader><SheetTitle>Upload Assets</SheetTitle></SheetHeader>
          <div className="mt-6 space-y-6">
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <Upload className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-sm font-medium">Drag files here or click to browse</p>
              <p className="text-xs text-muted-foreground mt-1">PNG, JPG, WEBP, SVG, PDF — Max 10MB each</p>
              <Input type="file" multiple accept="image/*,.pdf,.svg" onChange={handleFileUpload} className="mt-4" />
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default GraphicsStudio;
