import { fetch } from "expo/fetch";
import { supabase } from "@/lib/supabase";

// Response envelope type - all app routes return { data: T }
interface ApiResponse<T> {
  data: T;
}

const baseUrl = process.env.EXPO_PUBLIC_BACKEND_URL || "";
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "";

// Helper to safely extract error message from any object.
// Export so it can be used throughout the app.
export const extractErrorMessage = (error: any): string => {
  if (typeof error === "string") {
    if (error.includes("isTrusted") || error === '{"isTrusted":true}') {
      return "A network error occurred. Please check your connection and try again.";
    }
    return error;
  }
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object") {
    if ("isTrusted" in error) {
      return "A network error occurred. Please check your connection and try again.";
    }
    if (error.message && typeof error.message === "string") return error.message;
    if (error.error && typeof error.error === "string") return error.error;
  }
  return "An unexpected error occurred";
};

const request = async <T>(
  url: string,
  options: { method?: string; body?: string; headers?: Record<string, string> } = {}
): Promise<T> => {
  try {
    const response = await fetch(`${baseUrl}${url}`, {
      ...options,
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
      },
    });

    if (response.status === 204) {
      return undefined as T;
    }

    const contentType = response.headers.get("content-type");
    if (contentType?.includes("application/json")) {
      const json = await response.json();

      if (json && json.error) {
        const errorMessage = json.error.message || json.error.code || "An error occurred";
        throw new Error(errorMessage);
      }

      if (json && json.data !== undefined) {
        return json.data;
      }

      return json as T;
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return undefined as T;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(extractErrorMessage(error));
  }
};

/**
 * Call a Supabase Edge Function by name.
 *
 * For verify_jwt=true edge functions, the user's session access token is
 * forwarded as Authorization: Bearer. For anonymous (verify_jwt=false)
 * functions, only the anon key is sent.
 *
 * NOTE: Most callers should prefer `supabase.functions.invoke('<fn>', { body })`
 * directly — it handles auth forwarding automatically. This wrapper exists
 * for parity with `api.get/post/...`.
 */
const supabaseRequest = async <T>(functionName: string, body: any): Promise<T> => {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error(
      "Supabase env vars missing. Check EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY."
    );
  }

  const url = `${SUPABASE_URL}/functions/v1/${functionName}`;

  // Forward the user's session token when available so verify_jwt=true
  // edge functions accept the request.
  const { data: { session } } = await supabase.auth.getSession();
  const authToken = session?.access_token || SUPABASE_ANON_KEY;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(body),
    });

    const contentType = response.headers.get("content-type");
    if (contentType?.includes("application/json")) {
      const json = await response.json();

      if (!response.ok) {
        let errorMessage = `Supabase error: ${response.status}`;
        let errorObj: any = null;

        if (typeof json === "object" && json !== null) {
          errorObj = json;
          const j = json as any;
          if (j.error && typeof j.error === "object" && j.error.message) {
            errorMessage = j.error.message;
          } else if (j.error && typeof j.error === "string") {
            errorMessage = j.error;
          } else {
            errorMessage = j.message || j.msg || j.error_description || errorMessage;
          }
        } else if (typeof json === "string") {
          errorMessage = json;
        }

        const error = new Error(errorMessage);
        (error as any).originalError = errorObj;
        throw error;
      }

      return json as T;
    }

    if (!response.ok) {
      throw new Error(`Supabase error: ${response.status}`);
    }

    return undefined as T;
  } catch (error) {
    const errorMessage = extractErrorMessage(error);
    console.error(`[Supabase] Error calling ${functionName}:`, errorMessage);
    throw new Error(errorMessage);
  }
};

export const api = {
  get: <T>(url: string) => request<T>(url),
  post: <T>(url: string, body: any) =>
    request<T>(url, { method: "POST", body: JSON.stringify(body) }),
  put: <T>(url: string, body: any) =>
    request<T>(url, { method: "PUT", body: JSON.stringify(body) }),
  delete: <T>(url: string) => request<T>(url, { method: "DELETE" }),
  patch: <T>(url: string, body: any) =>
    request<T>(url, { method: "PATCH", body: JSON.stringify(body) }),
  supabase: {
    post: <T>(functionName: string, body: any) => supabaseRequest<T>(functionName, body),
  },
};
