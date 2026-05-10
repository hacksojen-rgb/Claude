import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Lazy initialization function
let supabaseClient: any = null;

export const getSupabase = () => {
  if (supabaseClient) return supabaseClient;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase credentials missing. VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set.');
    return null;
  }
  
  supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
  return supabaseClient;
};

// Also export a safe proxy if you prefer a singleton-like access, but getSupabase is clearer.
// For backwards compatibility with the existing App.tsx, I'll update App.tsx to use call getSupabase().
