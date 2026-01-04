import { createClient } from "@supabase/supabase-js";

// Ambil URL & Key dari .env
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY;

// Validasi agar tidak crash jika lupa isi .env
if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase Environment Variables");
}

// Buat koneksi (tanpa generic type Database dulu agar simpel)
export const supabase = createClient(supabaseUrl, supabaseKey);
