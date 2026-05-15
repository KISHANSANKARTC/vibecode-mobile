import { fetch } from "expo/fetch";

// Response envelope type - all app routes return { data: T }
interface ApiResponse<T> {
  data: T;
}

const baseUrl = process.env.EXPO_PUBLIC_BACKEND_URL!;
const SUPABASE_URL = "https://tghuqwogmnslvlbhchpu.supabase.co";
const SUPABASE_API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRnaHVxd29nbW5zbHZsYmhjaHB1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY1NTU5NjEsImV4cCI6MjA4MjEzMTk2MX0.sMeQfnfpKOURYbeq19B0MhUq4Mj0AcTbK27cjx1Anwc";

// Helper to safely extract error message from any object
// Export so it can be used throughout the app
export const extractErrorMessage = (error: any): string => {
  if (typeof error === 'string') {
    // Check if the string looks like a stringified event object
    if (error.includes('isTrusted') || error === '{"isTrusted":true}') {
      return 'A network error occurred. Please check your connection and try again.';
    }
    return error;
  }
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object') {
    // Detect event objects (has isTrusted property)
    if ('isTrusted' in error) return 'A network error occurred. Please check your connection and try again.';
    if (error.message && typeof error.message === 'string') return error.message;
    if (error.error && typeof error.error === 'string') return error.error;
  }
  return 'An unexpected error occurred';
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

    // 1. Handle 204 No Content
    if (response.status === 204) {
      return undefined as T;
    }

    // 2. JSON responses: parse and check for errors
    const contentType = response.headers.get("content-type");
    if (contentType?.includes("application/json")) {
      const json = await response.json();

      // Check if response contains an error (backend error format)
      if (json && json.error) {
        const errorMessage = json.error.message || json.error.code || 'An error occurred';
        throw new Error(errorMessage);
      }

      // If response is successful, unwrap { data }
      if (json && json.data !== undefined) {
        return json.data;
      }

      return json as T;
    }

    // 3. Non-JSON: check for error status
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return undefined as T;
  } catch (error) {
    // Ensure we always throw an Error instance (not event objects)
    if (error instanceof Error) {
      throw error;
    }
    const errorMessage = extractErrorMessage(error);
    throw new Error(errorMessage);
  }
};

const supabaseRequest = async <T>(
  functionName: string,
  body: any
): Promise<T> => {
  const url = `${SUPABASE_URL}/functions/v1/${functionName}`;

  console.log(`[Supabase] Calling ${functionName} at ${url}`);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_API_KEY,
      },
      body: JSON.stringify(body),
    });

    console.log(`[Supabase] Response status: ${response.status}`);

    const contentType = response.headers.get("content-type");
    if (contentType?.includes("application/json")) {
      const json = await response.json();
      console.log(`[Supabase] Response body:`, JSON.stringify(json, null, 2));

      // Check if the response indicates an error
      if (!response.ok) {
        console.error(`[Supabase] Error response: status ${response.status}`);
        // Extract error message from various possible response structures
        let errorMessage = `Supabase error: ${response.status}`;
        let errorObj: any = null;

        if (typeof json === 'object' && json !== null) {
          errorObj = json;
          // Try nested error.message first (for backend error responses)
          if ((json as any).error && typeof (json as any).error === 'object' && (json as any).error.message) {
            errorMessage = (json as any).error.message;
          } else if ((json as any).error && typeof (json as any).error === 'string') {
            // If error is a string (Supabase format), use it directly
            errorMessage = (json as any).error;
          } else if (typeof json === 'object') {
            errorMessage =
              (json as any).message ||
              (json as any).msg ||
              (json as any).error_description ||
              'Supabase error';
          }
        } else if (typeof json === 'string') {
          errorMessage = json;
        }

        // Throw an Error instance with the extracted message
        const error = new Error(errorMessage);
        (error as any).originalError = errorObj;
        throw error;
      }

      return json as T;
    }

    if (!response.ok) {
      console.error(`[Supabase] Non-JSON error response: ${response.status}`);
      throw new Error(`Supabase error: ${response.status}`);
    }

    return undefined as T;
  } catch (error) {
    // Ensure we always throw an Error instance
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
    post: <T>(functionName: string, body: any) =>
      supabaseRequest<T>(functionName, body),
  },
};
