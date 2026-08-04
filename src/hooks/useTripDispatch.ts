import { useEffect, useRef } from 'react';
import { Trip, TripStatus, Driver, Location, Region, SystemStats } from '../types';
import {
  getCoordsFromXY,
} from '../utils/tripDispatchUtils';

export const useTripDispatch = (
  activeTrip: Trip | null,
  supabaseConnected: boolean,
  lang: 'ar' | 'en',
  rider: { isLoggedIn: boolean } | null,
  drivers: Driver[],
  locations: Location[],
  regions: Region[],
  stats: SystemStats,
  isMountedRef: React.MutableRefObject<boolean>,
  setDrivers: (updater: (prev: Driver[]) => Driver[]) => void,
  setActiveTripWithTracking: (updater: any) => void,
  setTripsHistory: (updater: any) => void,
  triggerToast: (title: string, message: string, type: string) => void,
  playNotificationSound: (sound: string) => void,
  speakText: (text: string, lang: string) => void,
  refreshWaitingTrip: () => Promise<boolean>,
  saveTripToHistory: (trip: Trip, userId?: string, role?: 'rider' | 'driver' | 'admin', deviceId?: string) => Promise<void>,
  saveActiveTrip: (trip: Trip | null, clearTripId?: string) => Promise<void>
) => {
  const lastRouteCacheUseRef = useRef<number>(Date.now());

  // Dispatch timer countdown
  useEffect(() => {
    if (!activeTrip || activeTrip.status !== 'SEARCHING' || !activeTrip.currentOfferedDriverId) return;

    const timer = setInterval(() => {
      setActiveTripWithTracking((prev: Trip | null) => {
        if (!prev || prev.status !== 'SEARCHING' || !prev.currentOfferedDriverId) {
          clearInterval(timer);
          return prev;
        }

        const currentTimer = prev.dispatchTimer ?? 600;
        if (currentTimer <= 1) {
          clearInterval(timer);
          const cancelled = { ...prev, status: 'CANCELLED' as TripStatus, completedAt: new Date().toISOString() };
          setTripsHistory((history: Trip[]) => [cancelled, ...history]);
          if (supabaseConnected) {
             saveTripToHistory(cancelled);
            saveActiveTrip(null, prev.id).catch(() => {});
          }
          playNotificationSound('alert');
          speakText(
            lang === 'ar'
              ? 'انتهت مهلة انتظار الرحلة. يمكنك طلب رحلة جديدة.'
              : 'The ride waiting time has expired. You can request a new ride.',
            lang === 'ar' ? 'ar-EG' : 'en-US'
          );
          triggerToast(
            lang === 'ar' ? 'انتهت مهلة الانتظار' : 'Waiting time expired',
            lang === 'ar'
              ? 'لم يقبل أي سائق الرحلة في الوقت المحدد. يمكنك المحاولة مرة أخرى.'
              : 'No driver accepted the ride in time. You can try again.',
            'warning'
          );
          return null;
        }

        if (currentTimer === 30) {
          // Warning notification
        }

        return { ...prev, dispatchTimer: currentTimer - 1 };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [activeTrip?.status, activeTrip?.currentOfferedDriverId, lang, supabaseConnected]);

  // Auto-refresh waiting trip every 2 minutes
  useEffect(() => {
    if (!activeTrip || activeTrip.status !== 'SEARCHING' || !rider?.isLoggedIn) return;

    const refreshInterval = setInterval(() => {
      if (!isMountedRef.current) return;
      refreshWaitingTrip().then((ok) => {
        if (ok) {
          console.log('[WaitingTripRefresh] Trip refreshed successfully');
        }
      });
    }, 120000);

    return () => clearInterval(refreshInterval);
  }, [activeTrip?.id, activeTrip?.status, rider?.isLoggedIn, supabaseConnected]);

  // GPS Movement Simulation
  useEffect(() => {
    if (!activeTrip || !activeTrip.driverId) return;

    let targetX = 0;
    let targetY = 0;

    if (activeTrip.status === 'ACCEPTED') {
      targetX = activeTrip.pickup.x || 50;
      targetY = activeTrip.pickup.y || 50;
    } else if (activeTrip.status === 'STARTED') {
      targetX = activeTrip.dropoff.x || 50;
      targetY = activeTrip.dropoff.y || 50;
    } else {
      return;
    }

    const interval = setInterval(() => {
      if (!isMountedRef.current) return;
      setDrivers((prevDrivers) => {
        let reached = false;
        const next = prevDrivers.map((drv) => {
          if (drv.id !== activeTrip.driverId) return drv;

          const dx = targetX - drv.currentX;
          const dy = targetY - drv.currentY;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 4) {
            reached = true;
            const coords = getCoordsFromXY(targetX, targetY);
            return {
              ...drv,
              currentX: targetX,
              currentY: targetY,
              lat: coords.lat,
              lng: coords.lng,
            };
          }

          const step = 4;
          const moveX = (dx / dist) * step;
          const moveY = (dy / dist) * step;
          const newX = drv.currentX + moveX;
          const newY = drv.currentY + moveY;
          const coords = getCoordsFromXY(newX, newY);

          return {
            ...drv,
            currentX: newX,
            currentY: newY,
            lat: coords.lat,
            lng: coords.lng,
          };
        });

        if (reached) {
          clearInterval(interval);
        }
        return next;
      });
    }, 200);

    return () => clearInterval(interval);
  }, [activeTrip?.status, activeTrip?.driverId]);

  return { lastRouteCacheUseRef };
};
