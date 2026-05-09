import { createClient } from "@supabase/supabase-js";
import { env } from "../env.js";

export const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_KEY,
  { auth: { persistSession: false } },
);
