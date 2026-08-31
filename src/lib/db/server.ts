import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getSupabaseServiceEnv } from "@/lib/env";

export function createServiceClient() {
  const { url, serviceRoleKey } = getSupabaseServiceEnv();
  return createSupabaseClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
