import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const code = url.searchParams.get('code')
    const state = url.searchParams.get('state')
    const error = url.searchParams.get('error')

    // Handle OAuth errors
    if (error) {
      console.error('Canva OAuth error:', error)
      return new Response(null, {
        status: 302,
        headers: {
          'Location': '/graphics-studio?error=oauth_failed'
        }
      })
    }

    if (!code || !state) {
      return new Response(null, {
        status: 302,
        headers: {
          'Location': '/graphics-studio?error=missing_params'
        }
      })
    }

    // Decode state to get tenant_id and code_verifier
    let tenantId: string
    let codeVerifier: string
    
    try {
      const decodedState = atob(state)
      const [extractedTenantId, extractedCodeVerifier] = decodedState.split(':')
      tenantId = extractedTenantId
      codeVerifier = extractedCodeVerifier
    } catch (e) {
      console.error('Invalid state parameter:', e)
      return new Response(null, {
        status: 302,
        headers: {
          'Location': '/graphics-studio?error=invalid_state'
        }
      })
    }

    // Get Canva credentials from secrets
    const clientId = Deno.env.get('CANVA_CLIENT_ID')
    const clientSecret = Deno.env.get('CANVA_CLIENT_SECRET')

    if (!clientId || !clientSecret) {
      console.error('Canva credentials not configured')
      return new Response(null, {
        status: 302,
        headers: {
          'Location': '/graphics-studio?error=config_error'
        }
      })
    }

    // Determine redirect URI based on environment
    const isProduction = Deno.env.get('ENVIRONMENT') === 'production'
    const redirectUri = isProduction 
      ? 'https://vestryhub.com/auth/canva/callback'
      : 'http://localhost:8080/auth/canva/callback'

    // Exchange authorization code for tokens
    const tokenResponse = await fetch('https://api.canva.com/rest/v1/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
        code_verifier: codeVerifier,
        redirect_uri: redirectUri,
      }),
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error('Token exchange failed:', errorText)
      return new Response(null, {
        status: 302,
        headers: {
          'Location': '/graphics-studio?error=token_exchange_failed'
        }
      })
    }

    const tokenData = await tokenResponse.json()
    const { access_token, refresh_token, expires_in } = tokenData

    // Get user profile from Canva
    const profileResponse = await fetch('https://api.canva.com/rest/v1/users/me', {
      headers: {
        'Authorization': `Bearer ${access_token}`,
      },
    })

    let canvaUserId = 'unknown'
    let canvaUserName = null
    let canvaUserEmail = null

    if (profileResponse.ok) {
      const profileData = await profileResponse.json()
      canvaUserId = profileData.id || 'unknown'
      canvaUserName = profileData.display_name || null
      canvaUserEmail = profileData.email || null
    }

    // Calculate expiration time
    const expiresAt = new Date(Date.now() + (expires_in * 1000)).toISOString()

    // Initialize Supabase client with service role key for admin operations
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Store tokens in database
    const { error: insertError } = await supabaseClient
      .from('canva_tokens')
      .upsert({
        tenant_id: tenantId,
        access_token: access_token,
        refresh_token: refresh_token,
        expires_at: expiresAt,
        canva_user_id: canvaUserId,
        canva_user_name: canvaUserName,
        canva_user_email: canvaUserEmail,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'tenant_id'
      })

    if (insertError) {
      console.error('Database insert error:', insertError)
      return new Response(null, {
        status: 302,
        headers: {
          'Location': '/graphics-studio?error=database_error'
        }
      })
    }

    // Redirect back to Graphics Studio with success
    return new Response(null, {
      status: 302,
      headers: {
        'Location': '/graphics-studio?connected=true'
      }
    })

  } catch (error) {
    console.error('Canva callback error:', error)
    return new Response(null, {
      status: 302,
      headers: {
        'Location': '/graphics-studio?error=callback_failed'
      }
    })
  }
})