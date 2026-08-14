import type { VercelRequest, VercelResponse } from '@vercel/node';

let webpush: any;
let hasWebPush = false;

try {
  webpush = require('web-push');
  hasWebPush = typeof webpush?.setVapidDetails === 'function';
} catch {
  console.warn('[notify-driver] web-push package not available');
}

if (!hasWebPush) {
  console.warn('[notify-driver] web-push is not available in this environment');
}

const VAPID_PUBLIC_KEY = process.env.VITE_WEB_PUSH_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.WEB_PUSH_VAPID_PRIVATE_KEY;

async function getAvailableDrivers(supabase: any): Promise<any[]> {
  try {
    const { data: drivers, error: driversError } = await supabase
      .from('ezz_drivers')
      .select('id,name')
      .eq('is_online', true)
      .eq('status', 'AVAILABLE')
      .eq('approval_status', 'APPROVED');

    if (driversError) {
      console.error('[notify-driver] Error fetching drivers:', driversError);
      return [];
    }

    if (!drivers || drivers.length === 0) return [];

    const driverIds = drivers.map((d: any) => d.id);

    const { data: subscriptions, error: subsError } = await supabase
      .from('ezz_push_subscriptions')
      .select('driver_id,endpoint,p256dh,auth')
      .in('driver_id', driverIds);

    if (subsError) {
      console.error('[notify-driver] Error fetching push subscriptions:', subsError);
      return [];
    }

    const subMap = new Map((subscriptions || []).map((s: any) => [s.driver_id, s]));

    return drivers
      .map((d: any) => ({
        id: d.id,
        name: d.name,
        web_push_subscription: subMap.get(d.id) || null,
      }))
      .filter((d: any) => d.web_push_subscription && d.web_push_subscription.endpoint);
  } catch (err: any) {
    console.error('[notify-driver] getAvailableDrivers failed:', err.message);
    return [];
  }
}

async function sendPushNotification(
  subscription: any,
  payload: any
): Promise<boolean> {
  try {
    if (!hasWebPush) return false;

    webpush.setVapidDetails(
      'mailto:support@captain-ezz.com',
      VAPID_PUBLIC_KEY,
      VAPID_PRIVATE_KEY
    );

    await webpush.sendNotification(subscription, JSON.stringify(payload));
    return true;
  } catch (err: any) {
    console.warn('[notify-driver] Push failed:', err.message);
    return false;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      console.warn('[notify-driver] VAPID keys not configured, skipping push notifications');
      return res.status(200).json({
        success: true,
        message: 'VAPID keys not configured',
        notificationsSent: 0,
      });
    }

    if (!hasWebPush) {
      console.warn('[notify-driver] web-push not available, skipping push notifications');
      return res.status(200).json({
        success: true,
        message: 'web-push not available',
        notificationsSent: 0,
      });
    }

    let body: any = {};
    try {
      body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    } catch {
      body = {};
    }

    const { tripId, pickup, vehicleType } = body;

    if (!tripId) {
      return res.status(400).json({ error: 'tripId is required' });
    }

    const { createClient } = await import('@supabase/supabase-js');
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return res.status(200).json({
        success: true,
        message: 'Supabase credentials not configured',
        notificationsSent: 0,
      });
    }

    let supabase: any;
    try {
      supabase = createClient(supabaseUrl, supabaseKey);
    } catch (err: any) {
      console.error('[notify-driver] Failed to create Supabase client:', err.message);
      return res.status(200).json({
        success: true,
        message: 'Supabase client creation failed',
        notificationsSent: 0,
      });
    }

    let trip: any = null;
    try {
      const result = await supabase
        .from('ezz_active_trip')
        .select('id,status,pickup,dropoff,rider_name,requested_vehicle_type,fare')
        .eq('id', tripId)
        .maybeSingle();

      trip = result.data;
      if (result.error) {
        console.error('[notify-driver] Error fetching trip:', result.error);
      }
    } catch (err: any) {
      console.error('[notify-driver] Exception fetching trip:', err.message);
    }

    if (!trip || trip.status !== 'SEARCHING') {
      return res.status(200).json({
        success: true,
        message: 'Trip not found or no longer searching',
        notificationsSent: 0,
      });
    }

    const drivers = await getAvailableDrivers(supabase);

    if (drivers.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No available drivers',
        notificationsSent: 0,
      });
    }

    const pickupName = (trip.pickup && (trip.pickup.nameAr || trip.pickup.nameEn)) || pickup || 'موقع غير معروف';
    const dropoffName = (trip.dropoff && (trip.dropoff.nameAr || trip.dropoff.nameEn)) || 'وجهة غير معروفة';

    let notificationsSent = 0;

    for (const driver of drivers) {
      const subscription = driver.web_push_subscription;
      if (!subscription || !subscription.endpoint) continue;

      const payload = {
        title: '🚖 رحلة جديدة متاحة!',
        body: `رحلة من ${pickupName} إلى ${dropoffName} - ${trip.rider_name || 'راكب'}`,
        data: {
          type: 'NEW_TRIP',
          tripId: trip.id,
          pickup: trip.pickup,
          dropoff: trip.dropoff,
          riderName: trip.rider_name,
          fare: trip.fare,
          requestedVehicleType: trip.requested_vehicle_type || vehicleType,
        },
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        vibrate: [200, 100, 200, 100, 200],
        tag: `trip-${trip.id}`,
        renotify: true,
        requireInteraction: true,
      };

      const sent = await sendPushNotification(subscription, payload);
      if (sent) {
        notificationsSent++;
      }
    }

    return res.status(200).json({
      success: true,
      tripsFound: 1,
      driversNotified: drivers.length,
      notificationsSent,
    });
  } catch (err: any) {
    console.error('[notify-driver] Error:', err);
    return res.status(500).json({ error: err.message || 'Internal error' });
  }
}
