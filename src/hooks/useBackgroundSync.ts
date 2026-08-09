import { useEffect, useRef } from 'react';
import { Driver, Rider, SystemStats, Location, Trip } from '../types';
import {
  fetchDrivers,
  saveDriver,
  fetchRiders,
  saveRider,
  fetchStats,
  saveStats,
  saveLocationInDB,
  saveActiveTrip,
  saveTripToHistory,
} from '../supabaseService';

const STALE_THRESHOLD_MS = 60000;

export const useBackgroundSync = (
  supabaseConnected: boolean,
  drivers: Driver[],
  registeredRiders: Rider[],
  stats: SystemStats,
  locations: Location[],
  activeTrip: Trip | null,
  dataSaverMode: boolean,
  setDrivers: (updater: (prev: Driver[]) => Driver[]) => void,
  setRegisteredRiders: (updater: (prev: Rider[]) => Rider[]) => void,
  setStats: (updater: (prev: SystemStats) => SystemStats) => void,
  setLocations: (updater: (prev: Location[]) => Location[]) => void,
  statsLoadedRef: React.MutableRefObject<boolean>,
  isMountedRef: React.MutableRefObject<boolean>
) => {
  const driversSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pricingSaveGuardUntilRef = useRef<number>(0);
  const lastSyncedDriversRef = useRef<Record<string, Partial<Driver>>>({});
  const lastSavedTripRef = useRef<string | null>(null);
  const lastSavedActiveTripIdRef = useRef<string | null>(null);
  const lastSavedTripSnapshotRef = useRef<string>('');
  const activePollingLockRef = useRef(false);

  // Drivers list polling
  useEffect(() => {
    if (!supabaseConnected) return;

    const pollInterval = 8000;

    const interval = setInterval(async () => {
      if (!isMountedRef.current) return;
      try {
        const remoteDrivers = await fetchDrivers();
        if (!isMountedRef.current) return;
        if (remoteDrivers && remoteDrivers.length > 0) {
          const now = Date.now();
          const staleThreshold = STALE_THRESHOLD_MS;
          setDrivers(localDrivers => {
            return remoteDrivers.map((rd) => {
              const ld = localDrivers.find((l) => l.id === rd.id);
              if (ld) {
                const isStale = rd.lastSeen ? (now - new Date(rd.lastSeen).getTime() > staleThreshold) : false;
                 return {
                   ...rd,
                   isOnline: isStale ? false : rd.isOnline,
                   status: isStale ? 'AVAILABLE' : (rd.isOnline ? rd.status : ld.status),
                 };
              }
              return rd;
            });
          });
        }
      } catch (err) {
        console.warn('Drivers polling error:', err);
      }
    }, pollInterval);

    return () => clearInterval(interval);
  }, [supabaseConnected, setDrivers]);

  // General-purpose sync (riders + stats)
  useEffect(() => {
    if (!supabaseConnected) return;

    let syncInterval = 45000;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const scheduleSync = async () => {
      if (timeoutId) clearTimeout(timeoutId);
      try {
        const remoteRiders = await fetchRiders();
        if (remoteRiders && remoteRiders.length > 0) {
          setRegisteredRiders(() => remoteRiders);
        }
        const remoteStats = await fetchStats();
        if (remoteStats && statsLoadedRef.current) {
          setStats(() => remoteStats);
        }
        if (locations.length > 0) {
          await Promise.allSettled(locations.map(l => saveLocationInDB(l)));
        }
      } catch {
        // ignore
      }
      timeoutId = setTimeout(scheduleSync, syncInterval);
    };

    scheduleSync();

    const handleVisibilityChange = () => {
      if (!document.hidden && supabaseConnected) {
        scheduleSync();
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      window.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [supabaseConnected, locations, statsLoadedRef, setRegisteredRiders, setStats]);

  // Debounced push-sync of drivers back to Supabase
  useEffect(() => {
    if (!supabaseConnected || drivers.length === 0) return;

    if (driversSyncTimerRef.current) {
      clearTimeout(driversSyncTimerRef.current);
    }

    driversSyncTimerRef.current = setTimeout(async () => {
      if (!isMountedRef.current || Date.now() < pricingSaveGuardUntilRef.current) return;
      try {
        const now = Date.now();
        const driversToSync = drivers.filter(d => {
          const last = lastSyncedDriversRef.current[d.id];
          if (!last) return true;
          return JSON.stringify(d) !== JSON.stringify(last);
        });

        for (const driver of driversToSync) {
          if (!isMountedRef.current) break;
          await saveDriver(driver);
          lastSyncedDriversRef.current[driver.id] = { ...driver };
        }
      } catch {
        // ignore
      }
    }, 3000);

    return () => {
      if (driversSyncTimerRef.current) {
        clearTimeout(driversSyncTimerRef.current);
      }
    };
  }, [drivers, supabaseConnected]);

  // Active trip auto-save on change
  useEffect(() => {
    if (!supabaseConnected || !activeTrip) return;

    const currentTripKey = JSON.stringify(activeTrip);
    if (lastSavedTripRef.current === currentTripKey) return;

    lastSavedTripRef.current = currentTripKey;
    lastSavedActiveTripIdRef.current = activeTrip.id;
    saveActiveTrip(activeTrip).then((ok) => {
      console.log('[saveActiveTrip useEffect] Saved trip:', activeTrip.id, 'status:', activeTrip.status, 'result:', ok);
    });
  }, [supabaseConnected, activeTrip]);

  // Clear saved trip when activeTrip becomes null
  useEffect(() => {
    if (!supabaseConnected) return;
    if (!activeTrip && lastSavedTripRef.current !== null) {
      const tripIdToClear = lastSavedActiveTripIdRef.current;
      lastSavedTripRef.current = null;
      lastSavedActiveTripIdRef.current = null;
      if (tripIdToClear) {
        saveActiveTrip(null, tripIdToClear).then((ok) => {
          console.log('[saveActiveTrip useEffect] Cleared active trip, result:', ok);
        });
      }
    }
  }, [activeTrip, supabaseConnected]);

  // Sync registered riders
  useEffect(() => {
    if (supabaseConnected && registeredRiders.length > 0) {
      registeredRiders.forEach(r => saveRider(r));
    }
  }, [supabaseConnected, registeredRiders]);

  return {
    pricingSaveGuardUntilRef,
    lastSyncedDriversRef,
    lastSavedTripRef,
    lastSavedTripSnapshotRef,
    activePollingLockRef,
  };
};

