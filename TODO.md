# TODO: Fix Ride Request Not Showing for All Offered Drivers

## Problem
When a rider requests a ride, only `currentOfferedDriverId` (first nearest driver) sees the trip. Drivers #2–#5 in `offeredDriverIds` never receive it.

## Root Causes
1. **App.tsx filter** — Realtime subscription and polling both block drivers who aren't `currentOfferedDriverId`
2. **No race condition protection** — `saveActiveTrip` uses blind `upsert`, so 5 drivers accepting simultaneously = 5 optimistically think they won
3. **Reject logic assumes sequential dispatch** — Needs to remove rejecting driver from `offeredDriverIds` instead

## Steps - ALL COMPLETED ✅

### ✅ Step 1: Fix `saveActiveTrip` in `supabaseService.ts`
- When `status === 'ACCEPTED'`, uses conditional `.eq('status', 'SEARCHING')` UPDATE
- Returns `false` if no row updated → another driver already accepted (race lost)

### ✅ Step 2: Fix `handleAcceptTrip` in `App.tsx`
- Calls `await saveActiveTrip(updatedAcceptedTrip)` instead of fire-and-forget
- If result is `false`, reverts optimistic UI — trip goes back to SEARCHING (minus this driver from offered list)
- Shows toast: "Another driver was faster"

### ✅ Step 3: Fix realtime subscription filter in `App.tsx`
- Added `!trip.offeredDriverIds?.includes(selectedDriverId)` — ALL offered drivers now see the trip

### ✅ Step 4: Fix polling filter in `App.tsx`
- Added `!remoteActiveTrip.offeredDriverIds?.includes(selectedDriverId)` — ALL offered drivers now see the trip

### ✅ Step 5: Fix `handleRejectTrip` in `App.tsx`
- Removes rejecting driver from `offeredDriverIds` (filter)
- Advances `currentOfferedDriverId` to next driver in remaining list
- Cancel only if no drivers remain
- Other offered drivers still see the trip (no reset to CANCELLED)

### ✅ Bonus: Fix `handleTransferTrip` in `App.tsx`
- Uses same filter-based approach
- Removes transferring driver from `offeredDriverIds`, advances to next

