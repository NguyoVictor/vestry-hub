import { useState } from "react";
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
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Palette, ExternalLink, Plus, Unlink, Loader2, ImageOff, RefreshCw, Sparkles,
} from "lucide-react";

const CANVA_REDIRECT_URI = import.meta.env.VITE_CANVA_REDIRECT_URI as string;

// ── Types ─────────────────────────────────────────────────────────────────────
interface CanvaDesign {
  id: string;
  title: string;
  thumbnail?: { url: string };
  urls: { edit_url: string; view_url: string };
  updated_at: number; // unix seconds
}

// ── Helper: get auth header from current session ──────────────────────────────
async function getAuthHeader(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("Not authenticated");
  return `Bearer ${session.access_token}`;
}

// ── Hook: get valid access token (auto-refresh if near expiry) ────────────────
function useCanvaToken(tenantId: string, userId: string) {
  return useQuery({
    queryKey: ["canva-token", tenantId, userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("canva_tokens")
        .select("access_token, refresh_token, expires_at")
        .eq("tenant_id", tenantId)
        .eq("user_id", userId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      // Refresh if expiring within 5 minutes
      const expiresAt = new Date(data.expires_at).getTime();
      if (expiresAt - Date.now() < 5 * 60 * 1000) {
        const authHeader = await getAuthHeader();
        const { data: refreshed, error: fnErr } = await supabase.functions.invoke("canva-oauth", {
          body: { action: "refresh", tenant_id: tenantId },
          headers: { Authorization: authHeader },
        });
        if (fnErr) throw fnErr;
        return refreshed.access_token as string;
      }

      return data.access_token as string;
    },
    enabled: !!tenantId && !!userId,
    staleTime: 4 * 60 * 1000,
    retry: false,
  });
}

// ── Hook: fetch Canva designs ─────────────────────────────────────────────────
function useCanvaDesigns(accessToken: string | null | undefined) {
  return useQuery({
    queryKey: ["canva-designs", accessToken?.slice(-8)],
    queryFn: async () => {
      const res = await fetch("https://api.canva.com/rest/v1/designs?ownership=owned&limit=50", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `Canva API error ${res.status}`);
      }
      const json = await res.json();
      return (json.items ?? []) as CanvaDesign[];
    },
    enabled: !!accessToken,
    staleTime: 300_000,
  });
}

// ── Connect screen ────────────────────────────────────────────────────────────
function ConnectCanva({ tenantId, onConnected }: { tenantId: string; onConnected: () => void }) {
  const [loading, setLoading] = useState(false);

  const handleConnect = async () => {
    setLoading(true);
    try {
      const authHeader = await getAuthHeader();
      const { data, error } = await supabase.functions.invoke("canva-oauth", {
        body: { action: "authorize", tenant_id: tenantId },
        headers: { Authorization: authHeader },
      });
      if (error) throw error;
      window.location.href = data.url;
    } catch (err: any) {
      toast.error(err.message || "Failed to start Canva authorization");
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
  return (
    <Card className="border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow overflow-hidden group">
      <div className="aspect-video bg-slate-100 dark:bg-slate-800 relative overflow-hidden">
        {design.thumbnail?.url ? (
          <img
            src={design.thumbnail.url}
            alt={design.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageOff className="h-8 w-8 text-muted-foreground/30" />
          </div>
        )}
      </div>
      <CardContent className="p-4">
        <p className="font-medium truncate mb-1">{design.title || "Untitled Design"}</p>
        <p className="text-xs text-muted-foreground mb-3">
          {design.updated_at
            ? `Updated ${format(new Date(design.updated_at * 1000), "d MMM yyyy")}`
            : "—"}
        </p>
        <a
          href={design.urls.edit_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Open in Canva
        </a>
      </CardContent>
    </Card>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function GraphicsStudio() {
  const { tenantId, userId } = useChurch();
  const queryClient = useQueryClient();
  const [disconnectOpen, setDisconnectOpen] = useState(false);

  const { data: accessToken, isLoading: tokenLoading, refetch: refetchToken } = useCanvaToken(tenantId, userId);
  const isConnected = !!accessToken;

  const { data: designs = [], isLoading: designsLoading, refetch: refetchDesigns, error: designsError } = useCanvaDesigns(accessToken);

  const disconnectMutation = useMutation({
    mutationFn: async () => {
      const authHeader = await getAuthHeader();
      const { error } = await supabase.functions.invoke("canva-oauth", {
        body: { action: "disconnect", tenant_id: tenantId },
        headers: { Authorization: authHeader },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["canva-token"] });
      queryClient.invalidateQueries({ queryKey: ["canva-designs"] });
      toast.success("Canva disconnected");
      setDisconnectOpen(false);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const handleCreateDesign = async () => {
    if (!accessToken) return;
    // Open Canva home — user creates a new design from there
    window.open("https://www.canva.com/create/", "_blank");
  };

  if (tokenLoading) {
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
                Canva Connected
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
        <ConnectCanva tenantId={tenantId} onConnected={() => refetchToken()} />
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
