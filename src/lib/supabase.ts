import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Lazy initialization function
let supabaseClient: any = null;

export const getSupabase = () => {
  if (supabaseClient) return supabaseClient;
  
  // Vite environment variables must be prefixed with VITE_
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Supabase credentials missing! Ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in your environment.');
    return null;
  }
  
  try {
    supabaseClient = createClient(supabaseUrl.trim(), supabaseAnonKey.trim());
    return supabaseClient;
  } catch (err) {
    console.error('Failed to initialize Supabase client:', err);
    return null;
  }
};

// Also export a safe proxy if you prefer a singleton-like access, but getSupabase is clearer.
// For backwards compatibility with the existing App.tsx, I'll update App.tsx to use call getSupabase().
