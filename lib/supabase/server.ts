/**
 * SSR Supabase client factory.
 *
 * Uses SUPABASE_URL (internal Docker network URL, e.g. http://kong:8000)
 * when available, falling back to NEXT_PUBLIC_SUPABASE_URL for non-Docker
 * environments (local dev with `npm run dev`).
 *
 * NEVER use this in Client Components — use lib/supabase/client.ts instead.
 */
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    // SUPABASE_URL is the docker-internal URL (not exposed to the browser)
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );
}
