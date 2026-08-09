import type { VercelRequest, VercelResponse } from '@vercel/node';

const webpush = require('web-push');

const FALLBACK_VAPID_PUBLIC_KEY = 'BK9sPXpbo7aiQFmkupvZS_5Y8oMlFYqlnWDorLlgmbJRbSbqfgllFLDr3kQmkK9KbYWskORGLwMH5mSFb4UnvI0';
const VAPID_PUBLIC_KEY = process.env.VITE_WEB_PUSH_VAPID_PUBLIC_KEY || FALLBACK_VAPID_PUBLIC_KEY;
const FALLBACK_VAPID_PRIVATE_KEY = 'GSza88Vs5d0zWeFcbhupefcPcTMHGBHUs6F2ReUnWqw';
const VAPID_PRIVATE_KEY = process.env.WEB_PUSH_VAPID_PRIVATE_KEY || FALLBACK_VAPID_PRIVATE_KEY;

if (!webpush.setVapidDetails) {
  console.warn('[notify-driver] web-push is not available in this environment');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { subscription, payload } = req.body || {};
    if (!subscription || !payload) {
      return res.status(400).json({ error: 'subscription and payload are required' });
    }

    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      return res.status(500).json({ error: 'VAPID keys are not configured on the server' });
    }

    webpush.setVapidDetails(
      'mailto:support@captain-ezz.com',
      VAPID_PUBLIC_KEY,
      VAPID_PRIVATE_KEY
    );

    await webpush.sendNotification(subscription, JSON.stringify(payload));
    return res.status(200).json({ success: true });
  } catch (err: any) {
    console.warn('[notify-driver] push failed:', err);
    const status = err.statusCode || 400;
    return res.status(status).json({ error: err.message || 'notification failed' });
  }
}
