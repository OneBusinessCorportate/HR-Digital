import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/types/database";

/**
 * Server-side Supabase client bound to the request's auth cookies. All reads and
 * mutations of candidate data go through this client so RLS is enforced with the
 * authenticated user's identity — role/user ids from the browser are never
 * trusted.
 */
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component — safe to ignore; middleware
            // refreshes the session cookie.
          }
        },
      },
    },
  );
}
