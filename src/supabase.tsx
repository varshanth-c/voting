// src/supabase.ts

import { createClient } from '@supabase/supabase-js';

// ✅ Corrected: The extra '.local' is removed. This works for TS/TSX.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);