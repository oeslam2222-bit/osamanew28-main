import type { VercelRequest, VercelResponse } from '@vercel/node';

const webpush = require('web-push');

const VAPID_PUBLIC_KEY = process.env.VITE_WEB_PUSH_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.WEB_PUSH_VAPID_PRIVATE_KEY;

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
