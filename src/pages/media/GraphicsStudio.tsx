import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { toUserFacingError } from "@/lib/userFacingError";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Palette, ExternalLink, Plus, Unlink, Loader2, ImageOff, RefreshCw, Sparkles, Download,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
interface CanvaDesign {
  id: string;
  title: string;
  thumbnail?: { url: string };
  urls: { edit_url: string; view_url: string };
  updated_at: number; // unix seconds
}

interface CanvaConnectionData { connected: boolean; canva_user_name?: string; canva_user_email?: string; }

function useCanvaConnection(tenantId: string) {
  return useQuery({ queryKey: ["canva-connection", tenantId], enabled: !!tenantId, queryFn: async () => {
    const { data, error } = await supabase.functions.invoke("canva-api", { body: { action: "status" } });
    if (error) throw error; return data as CanvaConnectionData;
  }, staleTime: 60_000 });
}

function useCanvaDesigns(connected: boolean) {
  return useQuery({ queryKey: ["canva-designs"], enabled: connected, queryFn: async () => {
    const { data, error } = await supabase.functions.invoke("canva-api", { body: { action: "designs" } });
    if (error) throw error; return (data?.items ?? []) as CanvaDesign[];
  }, staleTime: 300_000 });
}

// ── Connect screen ────────────────────────────────────────────────────────────
function ConnectCanva({ onConnected }: { onConnected: () => void }) {
  const [loading, setLoading] = useState(false);

  const handleConnect = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("canva-oauth");
      
      if (error) throw error;
      
      // Redirect to Canva OAuth
      window.location.href = data.authUrl;
    } catch (err: any) {
      toast.error(toUserFacingError(err, "Failed to start Canva authorization"));
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center py-24 text-center max-w-md mx-auto">
      <div className="h-20 w-20 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center mb-6">
        <Palette className="h-10 w-10 text-indigo-600" />
      </div>
      <h2 className="text-2xl font-bold mb-2">Connect Canva</h2>
      <p className="text-muted-foreground mb-8 leading-relaxed">
        Link your Canva account to create and manage church graphics — flyers, banners, social posts — directly from Vestry.
      </p>
      <Button
        size="lg"
        className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
        onClick={handleConnect}
        disabled={loading}
      >
        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
        {loading ? "Redirecting to Canva…" : "Connect Canva Account"}
      </Button>
      <p className="text-xs text-muted-foreground mt-4">
        You'll be redirected to Canva to authorise access. No passwords are stored.
      </p>
    </div>
  );
}

// ── Design card ───────────────────────────────────────────────────────────────
function DesignCard({ design }: { design: CanvaDesign }) {
  const [exporting, setExporting] = useState(false);
  const handleExport = async () => {
    setExporting(true);
    try {
      const { data, error } = await supabase.functions.invoke("canva-api", { body: { action: "export", design_id: design.id } });
      if (error || !data?.url) throw error || new Error("Export failed");
      window.open(data.url, "_blank", "noopener,noreferrer");
      toast.success("Design export ready");
    } catch (err) { toast.error(toUserFacingError(err, "Failed to export design")); } finally { setExporting(false); }
  };
  return <Card className="border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow overflow-hidden group">
    <div className="aspect-video bg-slate-100 dark:bg-slate-800 relative overflow-hidden">{design.thumbnail?.url ? <img src={design.thumbnail.url} alt={design.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" /> : <div className="w-full h-full flex items-center justify-center"><ImageOff className="h-8 w-8 text-muted-foreground/30" /></div>}</div>
    <CardContent className="p-4"><p className="font-medium truncate mb-1">{design.title || "Untitled Design"}</p><p className="text-xs text-muted-foreground mb-3">{design.updated_at ? `Updated ${format(new Date(design.updated_at * 1000), "d MMM yyyy")}` : "—"}</p><div className="flex items-center justify-between"><a href={design.urls.edit_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700"><ExternalLink className="h-3.5 w-3.5" />Edit</a><Button variant="ghost" size="sm" onClick={handleExport} disabled={exporting} className="h-8 px-2 text-xs">{exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}</Button></div></CardContent>
  </Card>;
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function GraphicsStudio() {
  const { tenantId } = useChurch();
  const queryClient = useQueryClient();
  const [disconnectOpen, setDisconnectOpen] = useState(false);

  // Check for OAuth callback success/error in URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const connected = urlParams.get('connected');
    const error = urlParams.get('error');

    if (connected === 'true') {
      toast.success('Canva connected successfully!');
      // Clean up URL
      window.history.replaceState({}, '', '/graphics-studio');
      // Refetch connection data
      queryClient.invalidateQueries({ queryKey: ['canva-connection'] });
    } else if (error) {
      const errorMessages: Record<string, string> = {
        oauth_failed: 'OAuth authorization failed',
        missing_params: 'Missing authorization parameters',
        invalid_state: 'Invalid authorization state',
        config_error: 'Canva configuration error',
        token_exchange_failed: 'Failed to exchange authorization code',
        database_error: 'Database error during connection',
        callback_failed: 'Authorization callback failed'
      };
      
      toast.error(errorMessages[error] || 'Failed to connect to Canva');
      // Clean up URL
      window.history.replaceState({}, '', '/graphics-studio');
    }
  }, [queryClient]);

  const { data: connectionData, isLoading: connectionLoading } = useCanvaConnection(tenantId);
  const isConnected = !!connectionData?.connected;
  const { data: designs = [], isLoading: designsLoading, refetch: refetchDesigns, error: designsError } = useCanvaDesigns(isConnected);

  const disconnectMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.functions.invoke("canva-api", { body: { action: "disconnect" } });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["canva-connection"] });
      queryClient.invalidateQueries({ queryKey: ["canva-designs"] });
      toast.success("Canva disconnected");
      setDisconnectOpen(false);
    },
    onError: (err: any) => toast.error(toUserFacingError(err, 'Failed to disconnect Canva')),
  });

  const handleCreateDesign = () => {
    // Open Canva create page in new tab
    window.open("https://www.canva.com/create/", "_blank");
  };

  if (connectionLoading) {
    return (
      <>
        <Helmet><title>Graphics Studio — Vestry</title></Helmet>
        <PageHeader title="Graphics Studio" subtitle="Create and manage church graphics with Canva" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="border border-slate-200 dark:border-slate-700 overflow-hidden">
              <Skeleton className="aspect-video w-full" />
              <CardContent className="p-4 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet><title>Graphics Studio — Vestry</title></Helmet>

      <PageHeader
        title="Graphics Studio"
        subtitle="Create and manage church graphics with Canva"
        action={
          isConnected ? (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-emerald-600 border-emerald-300 bg-emerald-50 dark:bg-emerald-900/20">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mr-1.5 inline-block" />
                Connected as {connectionData?.canva_user_name || connectionData?.canva_user_email || 'Canva User'}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetchDesigns()}
                disabled={designsLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-1.5 ${designsLoading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              <Button
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
                onClick={handleCreateDesign}
              >
                <Plus className="h-4 w-4 mr-1.5" />
                Create New Design
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-red-600"
                onClick={() => setDisconnectOpen(true)}
              >
                <Unlink className="h-4 w-4 mr-1.5" />
                Disconnect
              </Button>
            </div>
          ) : null
        }
      />

      {!isConnected ? (
        <ConnectCanva onConnected={() => refetchConnection()} />
      ) : (
        <>
          {/* Designs grid */}
          {designsLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Card key={i} className="border border-slate-200 dark:border-slate-700 overflow-hidden">
                  <Skeleton className="aspect-video w-full" />
                  <CardContent className="p-4 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : designsError ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <ImageOff className="h-12 w-12 text-muted-foreground/30 mb-3" />
              <p className="font-medium text-muted-foreground">Failed to load designs</p>
              <p className="text-sm text-muted-foreground/70 mt-1 mb-4">
                {(designsError as Error).message}
              </p>
              <Button variant="outline" size="sm" onClick={() => refetchDesigns()}>
                <RefreshCw className="h-4 w-4 mr-1.5" />Try again
              </Button>
            </div>
          ) : designs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Palette className="h-12 w-12 text-muted-foreground/30 mb-3" />
              <p className="font-medium text-muted-foreground">No designs yet</p>
              <p className="text-sm text-muted-foreground/70 mt-1 mb-4">
                Create your first church graphic in Canva
              </p>
              <Button
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
                onClick={handleCreateDesign}
              >
                <Plus className="h-4 w-4 mr-1.5" />Create New Design
              </Button>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground mb-4">{designs.length} design{designs.length !== 1 ? "s" : ""}</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {designs.map(d => <DesignCard key={d.id} design={d} />)}
              </div>
            </>
          )}
        </>
      )}

      {/* Disconnect confirm */}
      <AlertDialog open={disconnectOpen} onOpenChange={setDisconnectOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect Canva</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove your Canva connection from Vestry. Your designs in Canva won't be affected. You can reconnect at any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => disconnectMutation.mutate()}
              disabled={disconnectMutation.isPending}
            >
              {disconnectMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Disconnect
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
