import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://siqsougaberroesupskl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpcXNvdWdhYmVycm9lc3Vwc2tsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYzNDI3NTcsImV4cCI6MjEwMTkxODc1N30.QRhYApZAfpR4BghjiR8RaK8KS28pgpz6WANuSjid8bY';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
