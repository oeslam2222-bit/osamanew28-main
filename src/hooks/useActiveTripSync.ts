import { useEffect } from 'react';
import { Trip } from '../types';
import { subscribeToActiveTrips, fetchActiveTrip } from '../supabaseService';
import { mergeChatMessages } from '../utils/tripDispatchUtils';

export const useActiveTripSync = ({
  supabaseConnected,
  driverIsLoggedIn,
  selectedDriverId,
  riderId,
  setActiveTripWithTracking,
  dismissedTripIdsRef,
  lastLocalStatusChangeRef,
}: {
  supabaseConnected: boolean;
  driverIsLoggedIn: boolean;
  selectedDriverId: string | undefined;
  riderId: string | undefined;
  setActiveTripWithTracking: (updater: any) => void;
  dismissedTripIdsRef: React.MutableRefObject<Set<string>>;
  lastLocalStatusChangeRef: React.MutableRefObject<{ status: string; timestamp: number } | null>;
}) => {
  const TRIP_STATUS_ORDER: Record<string, number> = {
    'IDLE': 0,
    'SEARCHING': 1,
    'ACCEPTED': 2,
    'ARRIVED': 3,
    'STARTED': 4,
    'COMPLETED': 5,
    'CANCELLED': 6,
  };

  const markLocalStatusChange = (status: string) => {
    lastLocalStatusChangeRef.current = { status, timestamp: Date.now() };
  };

  // Realtime subscription
  useEffect(() => {
    if (!supabaseConnected) return;
    const userId = driverIsLoggedIn ? selectedDriverId : (riderId || undefined);
    const userRole = driverIsLoggedIn ? 'driver' : (riderId ? 'rider' : undefined);
    const sub = subscribeToActiveTrips(
      (trip) => {
        setActiveTripWithTracking((prev: Trip | null) => {
          if (!trip) {
            if (prev && prev.status === 'COMPLETED' && !dismissedTripIdsRef.current.has(prev.id)) {
              return prev;
            }
            return null;
          }
          if (dismissedTripIdsRef.current.has(trip.id)) {
            return null;
          }
          if (!prev) return trip;
          if (prev.status === 'COMPLETED' && !dismissedTripIdsRef.current.has(prev.id)) {
            return prev;
          }
          if (prev.id !== trip.id) return trip;

          if (prev.status === 'COMPLETED' || trip.status === 'COMPLETED') {
            return {
              ...prev,
              ...trip,
              riderRatingToDriver: trip.riderRatingToDriver ?? prev.riderRatingToDriver,
              riderFeedbackTags: trip.riderFeedbackTags?.length ? trip.riderFeedbackTags : prev.riderFeedbackTags,
              riderFeedbackComment: trip.riderFeedbackComment || prev.riderFeedbackComment,
              driverRatingToRider: trip.driverRatingToRider ?? prev.driverRatingToRider,
              driverFeedbackTags: trip.driverFeedbackTags?.length ? trip.driverFeedbackTags : prev.driverFeedbackTags,
              driverFeedbackComment: trip.driverFeedbackComment || prev.driverFeedbackComment,
            };
          }

          if (prev.status !== trip.status) {
            const prevOrder = TRIP_STATUS_ORDER[prev.status] ?? 0;
            const tripOrder = TRIP_STATUS_ORDER[trip.status] ?? 0;
            if (tripOrder <= prevOrder) return prev;
          }

          const remoteMsgs = trip.chatMessages || [];
          const localMsgs = prev.chatMessages || [];
          const mergedChatMessages = mergeChatMessages(localMsgs, remoteMsgs);

          return { ...trip, chatMessages: mergedChatMessages };
        });
      },
      userId,
      userRole
    );
    return () => sub.unsubscribe();
  }, [supabaseConnected, driverIsLoggedIn, selectedDriverId, riderId]);

  // Fallback: when tab becomes visible, fetch the active trip (covers the case
  // where Realtime channel is stale or disconnected — minimal API usage, only
  // fires when the user returns to the tab)
  useEffect(() => {
    if (!supabaseConnected) return;

    const handleVisibility = async () => {
      if (document.hidden) return;
      const userId = driverIsLoggedIn ? selectedDriverId : (riderId || undefined);
      const userRole = driverIsLoggedIn ? 'driver' : (riderId ? 'rider' : undefined);
      if (!userId || !userRole) return;
      try {
        const remoteTrip = await fetchActiveTrip(userId, userRole);
        if (!remoteTrip) {
          setActiveTripWithTracking((prev: Trip | null) => {
            if (prev && prev.status === 'COMPLETED' && !dismissedTripIdsRef.current.has(prev.id)) {
              return prev;
            }
            return null;
          });
          return;
        }
        if (dismissedTripIdsRef.current.has(remoteTrip.id)) {
          setActiveTripWithTracking((prev: Trip | null) => {
            if (prev && prev.id === remoteTrip.id) return null;
            return prev;
          });
          return;
        }
        if (remoteTrip.status === 'CANCELLED') {
          setActiveTripWithTracking((prev: Trip | null) => {
            if (prev && prev.id === remoteTrip.id) return null;
            return prev;
          });
          return;
        }
        setActiveTripWithTracking((prev: Trip | null) => {
          if (!prev) {
            markLocalStatusChange(remoteTrip.status);
            return remoteTrip;
          }
          if (prev.status === 'COMPLETED' && !dismissedTripIdsRef.current.has(prev.id)) {
            return prev;
          }
          if (prev.id !== remoteTrip.id) return remoteTrip;
          if (prev.status !== remoteTrip.status) {
            const prevOrder = TRIP_STATUS_ORDER[prev.status] ?? 0;
            const remoteOrder = TRIP_STATUS_ORDER[remoteTrip.status] ?? 0;
            if (remoteOrder < prevOrder) return prev;
            markLocalStatusChange(remoteTrip.status);
          }
          const remoteMsgs = remoteTrip.chatMessages || [];
          const localMsgs = prev.chatMessages || [];
          const mergedChatMessages = mergeChatMessages(localMsgs, remoteMsgs);
          return { ...remoteTrip, chatMessages: mergedChatMessages };
        });
      } catch (err) {
        console.warn('[useActiveTripSync] visibility fetch error:', err);
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [supabaseConnected, driverIsLoggedIn, selectedDriverId, riderId]);

  // Polling disabled — using Realtime + visibility fallback to reduce API usage

  return {
    TRIP_STATUS_ORDER,
    markLocalStatusChange,
    setActiveTripWithTracking,
  };
};
