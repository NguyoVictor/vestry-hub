import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CheckCircle2, ExternalLink, MessageSquare, FlaskConical } from "lucide-react";
import { TABLES } from "@/lib/schema";

export function SmsSettings() {
  const { tenantId, name: churchName, userPhone } = useChurch() as any;
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    at_username: "",
    at_api_key: "",
    sender_id: ""
  });
  const [sendingTest, setSendingTest] = useState(false);

  const { data: settings, isLoading } = useQuery({
    queryKey: ["sms-settings", tenantId],
    queryFn: async () => {
      const { data } = await supabase
        .from(TABLES.SMS_SETTINGS)
        .select("*")
        .eq("tenant_id", tenantId)
        .maybeSingle();
      return data;
    },
    onSuccess: (data) => {
      if (data) {
        setForm({
          at_username: data.at_username || "",
          at_api_key: data.at_api_key || "",
          sender_id: data.sender_id || ""
        });
      }
    },
    staleTime: 300_000,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        tenant_id: tenantId,
        at_username: form.at_username,
        at_api_key: form.at_api_key,
        sender_id: form.sender_id,
        is_configured: !!(form.at_username && form.at_api_key),
        updated_at: new Date().toISOString()
      };

      if (settings?.id) {
        const { error } = await supabase
          .from(TABLES.SMS_SETTINGS)
          .update(payload)
          .eq("id", settings.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from(TABLES.SMS_SETTINGS)
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sms-settings", tenantId] });
      toast.success("SMS settings saved successfully!");
    },
    onError: (error) => {
      toast.error("Failed to save SMS settings");
      console.error(error);
    }
  });

  const testSmsMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.functions.invoke("africastalking-sms", {
        body: { 
          tenant_id: tenantId, 
          is_test: true, 
          admin_phone: userPhone, 
          church_name: churchName 
        },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(`✅ Test SMS sent to ${userPhone}`);
      queryClient.invalidateQueries({ queryKey: ["sms-history", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["sms-stats", tenantId] });
    },
    onError: (error) => {
      toast.error(`❌ Failed to send test SMS: ${error.message}`);
    }
  });

  const handleSendTest = async () => {
    if (!userPhone) {
      toast.error("Please add a phone number to your profile to send a test SMS.");
      return;
    }
    if (!settings?.is_configured) {
      toast.error("Please save your SMS settings first.");
      return;
    }
    setSendingTest(true);
    try {
      await testSmsMutation.mutateAsync();
    } finally {
      setSendingTest(false);
    }
  };

  const isConfigured = settings?.is_configured;

  if (isLoading) {
    return <div className="space-y-4">Loading SMS settings...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isConfigured ? (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            ) : (
              <AlertCircle className="h-5 w-5 text-amber-500" />
            )}
            <MessageSquare className="h-5 w-5" />
            Africa's Talking SMS Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">How to get your credentials:</h4>
            <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
              <li>Visit <a href="https://account.africastalking.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-1">Africa's Talking Dashboard <ExternalLink className="h-3 w-3" /></a></li>
              <li>Sign up or log in to your account</li>
              <li>Go to "Settings" → "API Keys" to get your API Key</li>
              <li>Your username is usually your account username</li>
              <li>Sender ID is optional (your shortcode or approved sender name)</li>
            </ol>
          </div>

          <div className="grid gap-4">
            <div>
              <Label htmlFor="username">Username *</Label>
              <Input
                id="username"
                value={form.at_username}
                onChange={(e) => setForm(f => ({ ...f, at_username: e.target.value }))}
                placeholder="Your Africa's Talking username"
                className="font-jakarta"
              />
            </div>

            <div>
              <Label htmlFor="apikey">API Key *</Label>
              <Input
                id="apikey"
                type="password"
                value={form.at_api_key}
                onChange={(e) => setForm(f => ({ ...f, at_api_key: e.target.value }))}
                placeholder="Your Africa's Talking API key"
                className="font-jakarta"
              />
            </div>

            <div>
              <Label htmlFor="senderid">Sender ID (Optional)</Label>
              <Input
                id="senderid"
                value={form.sender_id}
                onChange={(e) => setForm(f => ({ ...f, sender_id: e.target.value }))}
                placeholder="Your shortcode or sender name"
                className="font-jakarta"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Leave empty to use default. Must be approved by Africa's Talking.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <Button 
              onClick={() => saveMutation.mutate()}
              disabled={!form.at_username || !form.at_api_key || saveMutation.isPending}
              className="bg-orange-500 hover:bg-orange-600 text-white font-jakarta"
            >
              {saveMutation.isPending ? "Saving..." : "Save SMS Settings"}
            </Button>

            {isConfigured && (
              <Button 
                variant="outline"
                onClick={handleSendTest}
                disabled={sendingTest || !userPhone}
                className="gap-1.5 font-jakarta"
              >
                <FlaskConical className="h-4 w-4" />
                {sendingTest ? "Sending..." : "Send Test SMS"}
              </Button>
            )}
          </div>

          {isConfigured && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-green-800">
                <CheckCircle2 className="h-4 w-4" />
                <span className="font-medium">SMS is configured!</span>
              </div>
              <p className="text-sm text-green-700 mt-1">
                Your church can now send SMS messages using your Africa's Talking account.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Benefits of Multi-Tenant SMS</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 text-sm">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
              <span><strong>Complete Independence:</strong> Use your own Africa's Talking account</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
              <span><strong>Cost Control:</strong> Pay for your own SMS usage directly</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
              <span><strong>Custom Branding:</strong> Use your own sender ID/shortcode</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
              <span><strong>No Domain Verification:</strong> Unlike email, SMS works immediately</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
              <span><strong>Scalability:</strong> No shared rate limits or quotas</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}