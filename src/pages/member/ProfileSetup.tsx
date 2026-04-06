import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemberPortal } from "@/contexts/MemberPortalContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function ProfileSetup() {
  const member = useMemberPortal();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    first_name: member.firstName,
    last_name: member.lastName,
    date_of_birth: "",
    gender: "",
    phone: member.phone || "",
    address: "",
  });

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("members").update(form).eq("id", member.memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Profile set up successfully!");
      navigate("/member");
    },
    onError: () => toast.error("Failed to save profile"),
  });

  return (
    <>
      <Helmet><title>Complete Your Profile — Vestry</title></Helmet>
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-white dark:from-slate-950 dark:to-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold">Complete Your Profile</h1>
            <p className="text-muted-foreground text-sm mt-1">Help your church get to know you better</p>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>First Name *</Label><Input value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} className="h-11" /></div>
              <div className="space-y-1.5"><Label>Last Name *</Label><Input value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} className="h-11" /></div>
            </div>
            <div className="space-y-1.5"><Label>Date of Birth</Label><Input type="date" value={form.date_of_birth} onChange={e => setForm(f => ({ ...f, date_of_birth: e.target.value }))} className="h-11" /></div>
            <div className="space-y-1.5">
              <Label>Gender</Label>
              <Select value={form.gender} onValueChange={v => setForm(f => ({ ...f, gender: v }))}>
                <SelectTrigger className="h-11"><SelectValue placeholder="Select gender" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Phone</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="h-11" placeholder="+254..." /></div>
            <div className="space-y-1.5"><Label>Address</Label><Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} className="h-11" /></div>
            <Button className="w-full h-11 rounded-full" onClick={() => save.mutate()} disabled={!form.first_name || !form.last_name || save.isPending}>
              {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Complete Setup"}
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => navigate("/member")}>Skip for now</Button>
          </div>
        </div>
      </div>
    </>
  );
}
