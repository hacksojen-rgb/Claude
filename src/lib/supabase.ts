import { createClient } from '@supabase/supabase-js';

// Vite environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Debugging check: এই লগটি শুধুমাত্র ডেভেলপমেন্টে দেখা যাবে
if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Supabase environment variables are missing!");
}

export const supabase = createClient(
  supabaseUrl || '', 
  supabaseAnonKey || ''
);
