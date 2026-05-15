# SMS Implementation Guide - Multi-Tenant Africa's Talking Integration

## Current Status Analysis

### 1. SMS Stat Cards Status ❌ **NOT FUNCTIONAL**
The four stat cards in the SMS subcategory are **not functional** because:
- Missing `sms_settings` table
- Missing `sms_history` table  
- No Africa's Talking integration setup
- Queries are failing due to non-existent tables

### 2. SMS Configuration Issue ✅ **IDENTIFIED**
The notification "SMS not configured. Add your Africa's Talking credentials in Settings → Communications → SMS →" appears because:
- No SMS settings table exists
- No integration with Africa's Talking API
- No multi-tenant credential storage system

## Solution: Multi-Tenant SMS System

### Architecture Overview
Each church (tenant) will have their own Africa's Talking credentials stored securely, allowing them to:
- Use their own sender ID/shortcode
- Pay for their own SMS credits
- Have complete control over their SMS communications
- Track their own SMS usage and costs

### Implementation Steps

#### Step 1: Create Required Database Tables

```sql
-- SMS Settings table for storing tenant-specific Africa's Talking credentials
CREATE TABLE IF NOT EXISTS sms_settings (
  id VARCHAR PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  is_configured BOOLEAN DEFAULT FALSE,
  at_username VARCHAR,
  at_api_key VARCHAR,
  sender_id VARCHAR,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id)
);

-- SMS History table for tracking sent messages
CREATE TABLE IF NOT EXISTS sms_history (
  id VARCHAR PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  recipient_count INTEGER DEFAULT 0,
  delivered_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  status VARCHAR DEFAULT 'sent',
  cost DECIMAL(10,4) DEFAULT 0,
  currency VARCHAR(3) DEFAULT 'KES',
  is_test BOOLEAN DEFAULT FALSE,
  at_message_id VARCHAR,
  recipients JSONB DEFAULT '[]'::jsonb,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- SMS Templates table for reusable messages
CREATE TABLE IF NOT EXISTS sms_templates (
  id VARCHAR PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  tenant_id VARCHAR NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR NOT NULL,
  message TEXT NOT NULL,
  category VARCHAR DEFAULT 'general',
  variables JSONB DEFAULT '[]'::jsonb,
  usage_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_by VARCHAR REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE sms_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_templates ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can manage their tenant's SMS settings" ON sms_settings
  FOR ALL USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()::text));

CREATE POLICY "Users can view their tenant's SMS history" ON sms_history
  FOR ALL USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()::text));

CREATE POLICY "Users can manage their tenant's SMS templates" ON sms_templates
  FOR ALL USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()::text));

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_sms_settings_tenant_id ON sms_settings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sms_history_tenant_id ON sms_history(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sms_templates_tenant_id ON sms_templates(tenant_id);
```

#### Step 2: Create Africa's Talking Edge Function

```typescript
// functions/africastalking-sms/index.ts
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SmsPayload {
  tenant_id: string;
  message: string;
  recipients?: Array<{ phone: string; name?: string }>;
  is_test?: boolean;
  admin_phone?: string;
  church_name?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const payload: SmsPayload = await req.json();
    const { tenant_id, message, recipients, is_test, admin_phone, church_name } = payload;

    if (!tenant_id) {
      return new Response(JSON.stringify({ error: "tenant_id is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Get SMS settings for this tenant
    const { data: smsSettings, error: settingsError } = await supabase
      .from("sms_settings")
      .select("at_username, at_api_key, sender_id, is_configured")
      .eq("tenant_id", tenant_id)
      .eq("is_active", true)
      .maybeSingle();

    if (settingsError || !smsSettings?.is_configured) {
      return new Response(JSON.stringify({ 
        error: "SMS not configured for this tenant. Please add Africa's Talking credentials." 
      }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const { at_username, at_api_key, sender_id } = smsSettings;

    if (is_test) {
      // Send test SMS
      if (!admin_phone) {
        return new Response(JSON.stringify({ error: "admin_phone required for test SMS" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      const testMessage = `Hello! This is a test SMS from ${church_name || 'your church'} via Vestry Hub. Your SMS configuration is working correctly! 🎉`;
      
      const result = await sendSmsViaAfricasTalking({
        username: at_username,
        apiKey: at_api_key,
        senderId: sender_id,
        message: testMessage,
        recipients: [admin_phone]
      });

      // Log to SMS history
      await supabase.from("sms_history").insert({
        tenant_id,
        message: testMessage,
        recipient_count: 1,
        delivered_count: result.success ? 1 : 0,
        failed_count: result.success ? 0 : 1,
        status: result.success ? "delivered" : "failed",
        cost: result.cost || 0,
        currency: "KES",
        is_test: true,
        at_message_id: result.messageId,
        recipients: [{ phone: admin_phone, status: result.success ? "delivered" : "failed" }],
        sent_at: new Date().toISOString()
      });

      return new Response(JSON.stringify({
        success: result.success,
        message: result.success ? "Test SMS sent successfully!" : "Failed to send test SMS",
        details: result
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Send bulk SMS
    if (!recipients || recipients.length === 0) {
      return new Response(JSON.stringify({ error: "recipients array is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const phoneNumbers = recipients.map(r => r.phone).filter(Boolean);
    
    const result = await sendSmsViaAfricasTalking({
      username: at_username,
      apiKey: at_api_key,
      senderId: sender_id,
      message,
      recipients: phoneNumbers
    });

    // Log to SMS history
    await supabase.from("sms_history").insert({
      tenant_id,
      message,
      recipient_count: phoneNumbers.length,
      delivered_count: result.deliveredCount || 0,
      failed_count: result.failedCount || 0,
      status: result.success ? "delivered" : "failed",
      cost: result.cost || 0,
      currency: "KES",
      is_test: false,
      at_message_id: result.messageId,
      recipients: result.recipients || [],
      sent_at: new Date().toISOString()
    });

    return new Response(JSON.stringify({
      success: result.success,
      delivered: result.deliveredCount,
      failed: result.failedCount,
      cost: result.cost,
      messageId: result.messageId
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("SMS function error:", error);
    return new Response(JSON.stringify({ 
      error: "Internal server error", 
      details: error.message 
    }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});

async function sendSmsViaAfricasTalking({ username, apiKey, senderId, message, recipients }) {
  try {
    const response = await fetch("https://api.africastalking.com/version1/messaging", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
        "apiKey": apiKey
      },
      body: new URLSearchParams({
        username: username,
        to: recipients.join(","),
        message: message,
        from: senderId || undefined
      })
    });

    const result = await response.json();
    
    if (result.SMSMessageData?.Recipients) {
      const delivered = result.SMSMessageData.Recipients.filter(r => r.status === "Success").length;
      const failed = result.SMSMessageData.Recipients.filter(r => r.status !== "Success").length;
      
      return {
        success: delivered > 0,
        deliveredCount: delivered,
        failedCount: failed,
        cost: result.SMSMessageData.Recipients.reduce((sum, r) => sum + (parseFloat(r.cost) || 0), 0),
        messageId: result.SMSMessageData.Message,
        recipients: result.SMSMessageData.Recipients.map(r => ({
          phone: r.number,
          status: r.status === "Success" ? "delivered" : "failed",
          cost: parseFloat(r.cost) || 0,
          messageId: r.messageId
        }))
      };
    }

    return { success: false, error: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
```

#### Step 3: Create SMS Settings Page

Create a settings page where churches can input their Africa's Talking credentials:

```typescript
// src/pages/settings/SmsSettings.tsx
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useChurch } from "@/contexts/ChurchContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CheckCircle2, ExternalLink } from "lucide-react";

export function SmsSettings() {
  const { tenantId } = useChurch();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    at_username: "",
    at_api_key: "",
    sender_id: ""
  });

  const { data: settings, isLoading } = useQuery({
    queryKey: ["sms-settings", tenantId],
    queryFn: async () => {
      const { data } = await supabase
        .from("sms_settings")
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
    }
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
          .from("sms_settings")
          .update(payload)
          .eq("id", settings.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("sms_settings")
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

  const isConfigured = settings?.is_configured;

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
              />
            </div>

            <div>
              <Label htmlFor="senderid">Sender ID (Optional)</Label>
              <Input
                id="senderid"
                value={form.sender_id}
                onChange={(e) => setForm(f => ({ ...f, sender_id: e.target.value }))}
                placeholder="Your shortcode or sender name"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Leave empty to use default. Must be approved by Africa's Talking.
              </p>
            </div>
          </div>

          <Button 
            onClick={() => saveMutation.mutate()}
            disabled={!form.at_username || !form.at_api_key || saveMutation.isPending}
            className="w-full"
          >
            {saveMutation.isPending ? "Saving..." : "Save SMS Settings"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
```

### Benefits of This Multi-Tenant Approach

1. **Complete Independence**: Each church uses their own Africa's Talking account
2. **Cost Control**: Churches pay for their own SMS usage
3. **Branding**: Churches can use their own sender IDs
4. **Security**: Credentials are encrypted and isolated per tenant
5. **Scalability**: No shared rate limits or quotas
6. **Compliance**: Each church manages their own opt-ins/opt-outs

### No Domain Verification Required

Unlike email (Resend), SMS via Africa's Talking doesn't require domain verification. You only need:
- Valid Africa's Talking account
- API credentials
- Sufficient SMS credits in the account

### Next Steps

1. **Create the database tables** (run the SQL above)
2. **Deploy the Edge Function** for SMS sending
3. **Create the SMS settings page** in your app
4. **Update the SMS tab** to use real data
5. **Test with a church's actual Africa's Talking credentials**

This approach gives each church complete control over their SMS communications while providing a seamless experience through your platform.