import { Helmet } from "react-helmet-async";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff, Shield, Lock, Mail } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";
import { TABLES } from "@/lib/schema";

const pwSchema = z.object({
  currentPassword: z.string().min(1, "Required"),
  newPassword: z.string().min(8).regex(/[A-Z]/, "Need uppercase").regex(/[0-9]/, "Need number").regex(/[!@#$%^&*]/, "Need special char"),
  confirmPassword: z.string(),
}).refine(d => d.newPassword === d.confirmPassword, { message: "Passwords must match", path: ["confirmPassword"] });

const getStrength = (pw: string) => {
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[!@#$%^&*]/.test(pw)) s++;
  return s;
};

const STRENGTH_LABELS = ["", "Weak", "Fair", "Strong", "Very Strong"];
const STRENGTH_COLORS = ["", "bg-destructive", "bg-amber-500", "bg-emerald-400", "bg-emerald-500"];

const Security = () => {
  const church = useChurch();
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState('');

  const form = useForm<z.infer<typeof pwSchema>>({
    resolver: zodResolver(pwSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  const newPw = form.watch("newPassword");
  const strength = getStrength(newPw || "");

  const handlePasswordChange = async (values: z.infer<typeof pwSchema>) => {
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: values.newPassword });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Password updated successfully");
    form.reset();
  };

  const handleEmailChange = async (newEmail: string) => {
    if (!newEmail || !newEmail.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }
    setSavingEmail(true);
    try {
      // 1. Update Supabase Auth email
      const { error: authError } = await supabase.auth.updateUser({ email: newEmail });
      if (authError) throw authError;

      // 2. Update users table
      const { error: userError } = await supabase
        .from('users')
        .update({ email: newEmail })
        .eq('id', church.userId);
      if (userError) throw userError;

      // 3. Update members table if this admin is also a member
      await supabase
        .from('members')
        .update({ email: newEmail })
        .eq('id', church.userId);
      // No error check — admin may not have a members record

      toast.success('Confirmation sent to both your old and new email. Check both inboxes.');
      setNewEmail('');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update email');
    } finally {
      setSavingEmail(false);
    }
  };

  const { data: loginEvents, isLoading: eventsLoading } = useQuery({
    queryKey: ["login-events", church.userId],
    queryFn: async () => {
      const { data } = await supabase.from(TABLES.LOGIN_EVENTS)
        .select("*")
        .eq("user_id", church.userId)
        .order("created_at", { ascending: false })
        .limit(10);
      return data || [];
    },
  });

  const PasswordInput = ({ field, show, toggle, placeholder }: any) => (
    <div className="relative">
      <Input type={show ? "text" : "password"} placeholder={placeholder} {...field} />
      <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={toggle}>
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );

  return (
    <>
      <Helmet><title>Security — Vestry</title></Helmet>
      <PageHeader title="Security" subtitle="Manage your account security settings" />

      <div className="max-w-3xl space-y-6">
        {/* Change Password */}
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Lock className="h-4 w-4" />Change Password</CardTitle></CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handlePasswordChange)} className="space-y-4">
                <FormField control={form.control} name="currentPassword" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Password</FormLabel>
                    <FormControl><PasswordInput field={field} show={showCurrent} toggle={() => setShowCurrent(!showCurrent)} placeholder="Enter current password" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="newPassword" render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl><PasswordInput field={field} show={showNew} toggle={() => setShowNew(!showNew)} placeholder="Enter new password" /></FormControl>
                    {newPw && (
                      <div className="space-y-1">
                        <div className="flex gap-1">
                          {[1, 2, 3, 4].map(i => (
                            <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= strength ? STRENGTH_COLORS[strength] : "bg-muted"}`} />
                          ))}
                        </div>
                        <p className={`text-xs ${strength <= 1 ? "text-destructive" : strength === 2 ? "text-amber-500" : "text-emerald-500"}`}>
                          {STRENGTH_LABELS[strength]}
                        </p>
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="confirmPassword" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm New Password</FormLabel>
                    <FormControl><PasswordInput field={field} show={showConfirm} toggle={() => setShowConfirm(!showConfirm)} placeholder="Confirm new password" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Update Password
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Change Email Address */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Change Email Address
            </CardTitle>
            <CardDescription>
              Update the email address associated with your account
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>New Email Address</Label>
              <Input
                type="email"
                placeholder="Enter new email address"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
              />
            </div>
            <Button
              onClick={() => handleEmailChange(newEmail)}
              disabled={savingEmail || !newEmail}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              {savingEmail ? 'Updating...' : 'Update Email'}
            </Button>
          </CardContent>
        </Card>

        {/* 2FA */}
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Shield className="h-4 w-4" />Two-Factor Authentication</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Enable 2FA</p>
                <p className="text-xs text-muted-foreground">Add an extra layer of security with TOTP-based 2FA</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Coming Soon</Badge>
                <Switch disabled />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Login History */}
        <Card>
          <CardHeader><CardTitle className="text-base">Login History</CardTitle></CardHeader>
          <CardContent>
            {eventsLoading ? (
              <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
            ) : loginEvents?.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date/Time</TableHead>
                    <TableHead>IP Address</TableHead>
                    <TableHead className="hidden sm:table-cell">Device</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loginEvents.map((event: any) => (
                    <TableRow key={event.id}>
                      <TableCell className="text-sm">{format(new Date(event.created_at), "PPp")}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{event.ip_address || "—"}</TableCell>
                      <TableCell className="hidden sm:table-cell text-xs text-muted-foreground truncate max-w-[200px]">{event.user_agent || "—"}</TableCell>
                      <TableCell>
                        <Badge variant={event.status === "success" ? "default" : "destructive"} className="text-xs capitalize">{event.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-6">No login events recorded yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default Security;
