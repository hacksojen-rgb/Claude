import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Lazy initialization function
let supabaseClient: any = null;

export const getSupabase = () => {
  if (supabaseClient) return supabaseClient;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase credentials missing. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment variables.');
  }
  
  supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
  return supabaseClient;
};

// Also export a safe proxy if you prefer a singleton-like access, but getSupabase is clearer.
// For backwards compatibility with the existing App.tsx, I'll update App.tsx to use call getSupabase().
