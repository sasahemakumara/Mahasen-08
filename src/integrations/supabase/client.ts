import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://txxfaccdpvoacifuumya.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4eGZhY2NkcHZvYWNpZnV1bXlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzUyMDEzNDUsImV4cCI6MjA1MDc3NzM0NX0.92p2KzkVRIVdaQyX3rVVzvqEER7aj5U2LWsLn8xyrjU";

export const supabase = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      flowType: 'pkce'
    }
  }
);