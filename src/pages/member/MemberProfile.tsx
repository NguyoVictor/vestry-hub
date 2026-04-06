import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemberPortal } from "@/contexts/MemberPortalContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import { QRCodeSVG } from "qrcode.react";
import { Camera, LogOut } from "lucide-react";

export default function MemberProfilePage() {
  const member = useMemberPortal();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    first_name: member.firstName,
    last_name: member.lastName,
    phone: member.phone || "",
    date_of_birth: "",
    gender: "",
    marital_status: "",
    address: "",
    city: "",
  });
  const [leaveDialog, setLeaveDialog] = useState(false);

  const saveProfile = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("members").update(form).eq("id", member.memberId);
      if (error) throw error;
    },
    onSuccess: () => toast.success("Profile updated successfully"),
    onError: () => toast.error("Failed to update profile"),
  });

  const leaveChurch = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("role_permissions").update({ status: "inactive" }).eq("tenant_id", member.churchId).eq("user_id", member.userId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("You have left the church");
      navigate("/member/join");
    },
    onError: () => toast.error("Failed to leave church"),
  });

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate("/member/login");
  };

  return (
    <>
      <Helmet><title>My Profile — Vestry</title></Helmet>
      <div className="max-w-lg mx-auto space-y-5">
        {/* Avatar + Name */}
        <div className="flex flex-col items-center gap-3 pt-4">
          <div className="relative">
            <div className="h-24 w-24 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-3xl">
              {member.avatarUrl ? <img src={member.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" /> : member.firstName.charAt(0)}
            </div>
            <button className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center text-white shadow-sm">
              <Camera className="h-4 w-4" />
            </button>
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold">{member.firstName} {member.lastName}</h1>
            <p className="text-sm text-muted-foreground">Member since {format(new Date(member.memberSince), "MMM yyyy")}</p>
          </div>
        </div>

        {/* QR Code */}
        <Card className="rounded-2xl">
          <CardContent className="p-5 flex flex-col items-center gap-3">
            <p className="text-sm font-medium text-muted-foreground">My Member QR Code</p>
            <QRCodeSVG value={member.memberId} size={120} />
            <p className="text-xs text-muted-foreground">Scan at services for check-in</p>
          </CardContent>
        </Card>

        {/* Edit Profile */}
        <Card className="rounded-2xl">
          <CardHeader><CardTitle className="text-base">Edit Profile</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>First Name</Label><Input value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} className="h-11 rounded-xl" /></div>
              <div className="space-y-1.5"><Label>Last Name</Label><Input value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} className="h-11 rounded-xl" /></div>
            </div>
            <div className="space-y-1.5"><Label>Phone</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="h-11 rounded-xl" /></div>
            <div className="space-y-1.5"><Label>Date of Birth</Label><Input type="date" value={form.date_of_birth} onChange={e => setForm(f => ({ ...f, date_of_birth: e.target.value }))} className="h-11 rounded-xl" /></div>
            <div className="space-y-1.5">
              <Label>Gender</Label>
              <Select value={form.gender} onValueChange={v => setForm(f => ({ ...f, gender: v }))}>
                <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Select gender" /></SelectTrigger>
                <SelectContent><SelectItem value="male">Male</SelectItem><SelectItem value="female">Female</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Marital Status</Label>
              <Select value={form.marital_status} onValueChange={v => setForm(f => ({ ...f, marital_status: v }))}>
                <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Select status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Single</SelectItem>
                  <SelectItem value="married">Married</SelectItem>
                  <SelectItem value="divorced">Divorced</SelectItem>
                  <SelectItem value="widowed">Widowed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Address</Label><Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} className="h-11 rounded-xl" /></div>
            <div className="space-y-1.5"><Label>City</Label><Input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} className="h-11 rounded-xl" /></div>
            <Button className="w-full h-11 rounded-full" onClick={() => saveProfile.mutate()} disabled={saveProfile.isPending}>
              {saveProfile.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </CardContent>
        </Card>

        {/* My Church */}
        <Card className="rounded-2xl">
          <CardHeader><CardTitle className="text-base">My Church</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">{member.churchName.charAt(0)}</div>
              <p className="font-medium">{member.churchName}</p>
            </div>
            <Button variant="outline" className="w-full h-11 rounded-full text-red-500 border-red-200 hover:bg-red-50" onClick={() => setLeaveDialog(true)}>
              Leave Church
            </Button>
          </CardContent>
        </Card>

        {/* Sign Out */}
        <Button variant="ghost" className="w-full h-11 rounded-full gap-2 text-slate-500" onClick={signOut}>
          <LogOut className="h-4 w-4" />Sign Out
        </Button>

        {/* Leave Church Dialog */}
        <Dialog open={leaveDialog} onOpenChange={setLeaveDialog}>
          <DialogContent>
            <DialogHeader><DialogTitle>Leave {member.churchName}?</DialogTitle></DialogHeader>
            <p className="text-sm text-muted-foreground">Are you sure you want to leave {member.churchName}? You will lose access to all church content.</p>
            <div className="flex gap-3 mt-2">
              <Button variant="outline" className="flex-1" onClick={() => setLeaveDialog(false)}>Cancel</Button>
              <Button variant="destructive" className="flex-1" onClick={() => leaveChurch.mutate()} disabled={leaveChurch.isPending}>
                {leaveChurch.isPending ? "Leaving..." : "Leave Church"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}
