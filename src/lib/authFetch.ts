import { supabase } from "@/integrations/supabase/client";

/**
 * fetch() wrapper that attaches the signed-in user's access token so the
 * Python backends can authenticate the request and isolate the user's data.
 */
export async function authFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (token) headers.set("Authorization", `Bearer ${token}`);
  } catch {
    // no session — request proceeds unauthenticated and the backend decides
  }
  return fetch(input, { ...init, headers });
}
