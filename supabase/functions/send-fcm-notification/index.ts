import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getMessaging, getToken, onMessage } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging.js";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const firebaseConfig = {
  apiKey: "AIzaSyDNuhL_OpNMq2HSFJ6Pz871mSkXCXYwFXA",
  authDomain: "symmetric-setup-kcf5x.firebaseapp.com",
  projectId: "symmetric-setup-kcf5x",
  storageBucket: "symmetric-setup-kcf5x.firebasestorage.app",
  messagingSenderId: "963124202476",
  appId: "1:963124202476:web:6342dc6bb0696b81fa8ec9",
};

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tripId, title, body, driverTokens, rideId } = await req.json();

    if (!driverTokens || !Array.isArray(driverTokens) || driverTokens.length === 0) {
      return new Response(JSON.stringify({ error: 'No driver tokens provided' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Send FCM notification to each driver token
    const results = [];
    for (const token of driverTokens) {
      try {
        const message = {
          notification: {
            title: title || '🚖 New Ride Available',
            body: body || 'A new ride request is available',
          },
          data: {
            rideId: rideId || tripId,
            status: 'SEARCHING',
            clickAction: '/',
          },
          token: token,
        };

        const response = await fetch(`https://fcm.googleapis.com/fcm/send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + (await getAccessToken()),
          },
          body: JSON.stringify(message),
        });

        const result = await response.json();
        results.push({ token: token.substring(0, 20) + '...', success: response.ok, result });
      } catch (err) {
        console.error('Error sending FCM:', err);
        results.push({ token: token.substring(0, 20) + '...', success: false, error: err.message });
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

async function getAccessToken(): Promise<string> {
  // This is a placeholder - in production, use a service account key
  // stored securely in Supabase secrets or environment variables
  throw new Error('Service account key not configured. Please set up Firebase Admin SDK.');
}
