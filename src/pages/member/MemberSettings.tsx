import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemberPortal } from "@/contexts/MemberPortalContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export default function MemberSettings() {
  const member = useMemberPortal();
  const navigate = useNavigate();
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [notifPrefs, setNotifPrefs] = useState({
    inapp_announcements: true,
    inapp_event_reminders: true,
    inapp_messages: true,
    email_giving_receipts: true,
    email_weekly_digest_member: false,
  });

  const signOut = () => {
    localStorage.removeItem("member_session");
    navigate("/member/login");
  };

  const deleteAccount = useMutation({
    mutationFn: async () => {
      await supabase.from("members").update({ status: "inactive" }).eq("id", member.memberId);
    },
    onSuccess: () => {
      localStorage.removeItem("member_session");
      navigate("/member/login");
    },
    onError: () => toast.error("Failed to deactivate account"),
  });

  return (
    <>
      <Helmet><title>Settings — Vestry</title></Helmet>
      <div className="max-w-lg mx-auto space-y-5">
        <h1 className="text-2xl font-bold">Settings</h1>

        {/* Notifications */}
        <Card className="rounded-2xl">
          <CardHeader><CardTitle className="text-base">Notifications</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {[
              { key: "inapp_announcements", label: "Announcements", sub: "In-app" },
              { key: "inapp_event_reminders", label: "Event Reminders", sub: "In-app" },
              { key: "inapp_messages", label: "Message Notifications", sub: "In-app" },
              { key: "email_giving_receipts", label: "Giving Receipts", sub: "Email" },
              { key: "email_weekly_digest_member", label: "Weekly Digest", sub: "Email" },
            ].map(({ key, label, sub }) => (
              <div key={key} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{label}</p>
                  <p className="text-xs text-muted-foreground">{sub}</p>
                </div>
                <Switch
                  checked={notifPrefs[key as keyof typeof notifPrefs]}
                  onCheckedChange={v => setNotifPrefs(p => ({ ...p, [key]: v }))}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Sign Out */}
        <Card className="rounded-2xl">
          <CardContent className="p-4">
            <Button variant="outline" className="w-full h-11 rounded-full" onClick={signOut}>
              Sign Out
            </Button>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="rounded-2xl border-red-200 dark:border-red-900">
          <CardHeader><CardTitle className="text-base text-red-600">Danger Zone</CardTitle></CardHeader>
          <CardContent>
            <Button variant="destructive" className="w-full h-11 rounded-full" onClick={() => setDeleteDialog(true)}>
              Deactivate Account
            </Button>
          </CardContent>
        </Card>

        <Dialog open={deleteDialog} onOpenChange={setDeleteDialog}>
          <DialogContent>
            <DialogHeader><DialogTitle>Deactivate Account?</DialogTitle></DialogHeader>
            <p className="text-sm text-muted-foreground">
              This will deactivate your membership. Contact your church admin to reactivate.
            </p>
            <div className="flex gap-3 mt-2">
              <Button variant="outline" className="flex-1" onClick={() => setDeleteDialog(false)}>Cancel</Button>
              <Button variant="destructive" className="flex-1" onClick={() => deleteAccount.mutate()} disabled={deleteAccount.isPending}>
                {deleteAccount.isPending ? "Deactivating..." : "Deactivate"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}
