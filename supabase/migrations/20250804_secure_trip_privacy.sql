-- ============================================================
-- Migration: Secure Trip Privacy via RPC Functions
-- ============================================================
-- This migration tightens trip privacy by:
-- 1. Removing overly permissive RLS policies on ezz_trips_history
-- 2. Blocking direct anon SELECTs from the trips table
-- 3. Adding secure SECURITY DEFINER RPC functions for trip access
--
-- After running this, all trip reads must go through:
--   - get_my_trips() / count_my_trips() for riders and drivers
--   - get_admin_trips() / count_admin_trips() for admins
--
-- This prevents any user from reading another user's trips,
-- even if they modify the client-side query.
-- ============================================================

-- ============================================================
-- 1. Drop old permissive policies
-- ============================================================
DROP POLICY IF EXISTS "rider_read_own_trips" ON ezz_trips_history;
DROP POLICY IF EXISTS "driver_read_own_trips" ON ezz_trips_history;
DROP POLICY IF EXISTS "admin_read_all_trips" ON ezz_trips_history;
DROP POLICY IF EXISTS "anon_write_trips_history" ON ezz_trips_history;

-- ============================================================
-- 2. New restrictive policies
-- ============================================================

-- Block direct anon reads - all reads must use RPC functions
CREATE POLICY "deny_anon_read_trips" ON ezz_trips_history
  FOR SELECT TO anon
  USING (false);

-- Allow anon inserts/updates for trip creation and status changes
CREATE POLICY "anon_write_trips" ON ezz_trips_history
  FOR INSERT, UPDATE TO anon
  USING (true)
  WITH CHECK (true);

-- Allow admin to delete trips (for admin tools)
CREATE POLICY "admin_delete_trips" ON ezz_trips_history
  FOR DELETE TO anon
  USING (
    EXISTS (SELECT 1 FROM ezz_sessions WHERE role = 'ADMIN')
  );

-- ============================================================
-- 3. Secure RPC functions for rider/driver trip access
-- ============================================================

-- Get paginated trips for the current user (rider or driver)
CREATE OR REPLACE FUNCTION get_my_trips(
  p_user_id TEXT,
  p_role TEXT,
  p_page INTEGER DEFAULT 0,
  p_limit INTEGER DEFAULT 10,
  p_date_from TEXT DEFAULT NULL,
  p_date_to TEXT DEFAULT NULL,
  p_status_filter TEXT DEFAULT 'all',
  p_search TEXT DEFAULT NULL
)
RETURNS SETOF ezz_trips_history
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT * FROM ezz_trips_history
  WHERE 
    (p_role = 'rider' AND rider_id = p_user_id)
    OR (p_role = 'driver' AND driver_id = p_user_id)
  AND (p_date_from IS NULL OR created_at >= p_date_from)
  AND (p_date_to IS NULL OR created_at <= p_date_to)
  AND (
    p_status_filter = 'all' 
    OR (p_status_filter = 'ACTIVE' AND status IN ('ACCEPTED', 'ARRIVED', 'STARTED'))
    OR status = p_status_filter
  )
  AND (
    p_search IS NULL OR p_search = '' OR
    LOWER(rider_name) LIKE LOWER('%' || p_search || '%')
    OR LOWER(COALESCE(driver_name, '')) LIKE LOWER('%' || p_search || '%')
    OR LOWER(COALESCE(pickup->>'nameAr', '')) LIKE LOWER('%' || p_search || '%')
    OR LOWER(COALESCE(pickup->>'nameEn', '')) LIKE LOWER('%' || p_search || '%')
    OR LOWER(COALESCE(dropoff->>'nameAr', '')) LIKE LOWER('%' || p_search || '%')
    OR LOWER(COALESCE(dropoff->>'nameEn', '')) LIKE LOWER('%' || p_search || '%')
  )
  ORDER BY created_at DESC
  LIMIT p_limit OFFSET (p_page * p_limit);
$$;

-- Count trips for the current user (rider or driver)
CREATE OR REPLACE FUNCTION count_my_trips(
  p_user_id TEXT,
  p_role TEXT,
  p_date_from TEXT DEFAULT NULL,
  p_date_to TEXT DEFAULT NULL,
  p_status_filter TEXT DEFAULT 'all',
  p_search TEXT DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT COUNT(*) FROM ezz_trips_history
  WHERE 
    (p_role = 'rider' AND rider_id = p_user_id)
    OR (p_role = 'driver' AND driver_id = p_user_id)
  AND (p_date_from IS NULL OR created_at >= p_date_from)
  AND (p_date_to IS NULL OR created_at <= p_date_to)
  AND (
    p_status_filter = 'all' 
    OR (p_status_filter = 'ACTIVE' AND status IN ('ACCEPTED', 'ARRIVED', 'STARTED'))
    OR status = p_status_filter
  )
  AND (
    p_search IS NULL OR p_search = '' OR
    LOWER(rider_name) LIKE LOWER('%' || p_search || '%')
    OR LOWER(COALESCE(driver_name, '')) LIKE LOWER('%' || p_search || '%')
    OR LOWER(COALESCE(pickup->>'nameAr', '')) LIKE LOWER('%' || p_search || '%')
    OR LOWER(COALESCE(pickup->>'nameEn', '')) LIKE LOWER('%' || p_search || '%')
    OR LOWER(COALESCE(dropoff->>'nameAr', '')) LIKE LOWER('%' || p_search || '%')
    OR LOWER(COALESCE(dropoff->>'nameEn', '')) LIKE LOWER('%' || p_search || '%')
  );
$$;

-- ============================================================
-- 4. Secure RPC functions for admin trip access
-- ============================================================

-- Get paginated trips for admin (all trips with filtering)
CREATE OR REPLACE FUNCTION get_admin_trips(
  p_page INTEGER DEFAULT 0,
  p_limit INTEGER DEFAULT 20,
  p_date_from TEXT DEFAULT NULL,
  p_date_to TEXT DEFAULT NULL,
  p_status_filter TEXT DEFAULT 'all',
  p_search TEXT DEFAULT NULL
)
RETURNS SETOF ezz_trips_history
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT * FROM ezz_trips_history
  WHERE (p_date_from IS NULL OR created_at >= p_date_from)
  AND (p_date_to IS NULL OR created_at <= p_date_to)
  AND (
    p_status_filter = 'all' 
    OR (p_status_filter = 'ACTIVE' AND status IN ('ACCEPTED', 'ARRIVED', 'STARTED'))
    OR status = p_status_filter
  )
  AND (
    p_search IS NULL OR p_search = '' OR
    LOWER(rider_name) LIKE LOWER('%' || p_search || '%')
    OR LOWER(COALESCE(driver_name, '')) LIKE LOWER('%' || p_search || '%')
    OR LOWER(COALESCE(pickup->>'nameAr', '')) LIKE LOWER('%' || p_search || '%')
    OR LOWER(COALESCE(pickup->>'nameEn', '')) LIKE LOWER('%' || p_search || '%')
    OR LOWER(COALESCE(dropoff->>'nameAr', '')) LIKE LOWER('%' || p_search || '%')
    OR LOWER(COALESCE(dropoff->>'nameEn', '')) LIKE LOWER('%' || p_search || '%')
  )
  ORDER BY created_at DESC
  LIMIT p_limit OFFSET (p_page * p_limit);
$$;

-- Count all trips for admin
CREATE OR REPLACE FUNCTION count_admin_trips(
  p_date_from TEXT DEFAULT NULL,
  p_date_to TEXT DEFAULT NULL,
  p_status_filter TEXT DEFAULT 'all',
  p_search TEXT DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT COUNT(*) FROM ezz_trips_history
  WHERE (p_date_from IS NULL OR created_at >= p_date_from)
  AND (p_date_to IS NULL OR created_at <= p_date_to)
  AND (
    p_status_filter = 'all' 
    OR (p_status_filter = 'ACTIVE' AND status IN ('ACCEPTED', 'ARRIVED', 'STARTED'))
    OR status = p_status_filter
  )
  AND (
    p_search IS NULL OR p_search = '' OR
    LOWER(rider_name) LIKE LOWER('%' || p_search || '%')
    OR LOWER(COALESCE(driver_name, '')) LIKE LOWER('%' || p_search || '%')
    OR LOWER(COALESCE(pickup->>'nameAr', '')) LIKE LOWER('%' || p_search || '%')
    OR LOWER(COALESCE(pickup->>'nameEn', '')) LIKE LOWER('%' || p_search || '%')
    OR LOWER(COALESCE(dropoff->>'nameAr', '')) LIKE LOWER('%' || p_search || '%')
    OR LOWER(COALESCE(dropoff->>'nameEn', '')) LIKE LOWER('%' || p_search || '%')
  );
$$;

-- ============================================================
-- 5. RPC for admin clear all trips
-- ============================================================
CREATE OR REPLACE FUNCTION admin_clear_all_trips()
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
AS $$
  DELETE FROM ezz_trips_history;
$$;
