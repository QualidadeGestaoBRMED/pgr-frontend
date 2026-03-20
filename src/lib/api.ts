const SERVER_API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") || "";
const API_BASE_URL = typeof window === "undefined" ? SERVER_API_BASE_URL : "";

export function getApiBaseUrl() {
  return API_BASE_URL;
}

function buildApiUrl(path: string) {
  const safePath = path.startsWith("/") ? path : `/${path}`;
  return API_BASE_URL ? `${API_BASE_URL}${safePath}` : safePath;
}

async function request<T>(
  path: string,
  init?: RequestInit,
  expectJson = true
): Promise<T> {
  const hasBody = init?.body !== undefined;
  const method = (init?.method || "GET").toUpperCase();
  const isFormData =
    typeof FormData !== "undefined" && init?.body instanceof FormData;
  const shouldSetJsonHeader = hasBody && method !== "GET" && !isFormData;
  const headers = new Headers(init?.headers);

  if (shouldSetJsonHeader) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(buildApiUrl(path), {
    ...init,
    headers,
    credentials: "include",
  });

  if (!response.ok) {
    if (typeof window !== "undefined" && response.status === 401) {
      if (!window.location.pathname.startsWith("/login")) {
        window.location.href = "/login";
      }
    }
    const rawText = await response.text();
    try {
      const parsed = JSON.parse(rawText) as {
        message?: string;
        code?: string;
        request_id?: string;
      };
      const message = parsed.message || `HTTP ${response.status}`;
      const suffix = parsed.request_id ? ` (request_id: ${parsed.request_id})` : "";
      throw new Error(`${message}${suffix}`);
    } catch {
      throw new Error(rawText || `HTTP ${response.status}`);
    }
  }

  if (!expectJson) {
    return null as T;
  }

  return (await response.json()) as T;
}

export function apiGet<T>(path: string) {
  return request<T>(path, {
    cache: "no-store",
  });
}

export function apiPost<T>(path: string, body?: unknown) {
  return request<T>(path, {
    method: "POST",
    body: body ? JSON.stringify(body) : undefined,
  });
}

export function apiPostForm<T>(path: string, body: FormData) {
  return request<T>(path, {
    method: "POST",
    body,
  });
}

export function apiPut<T>(path: string, body?: unknown) {
  return request<T>(path, {
    method: "PUT",
    body: body ? JSON.stringify(body) : undefined,
  });
}

export function apiDelete<T>(path: string) {
  return request<T>(path, {
    method: "DELETE",
  });
}

export async function apiBlob(path: string, body?: unknown) {
  const headers = new Headers({
    "Content-Type": "application/json",
  });

  const response = await fetch(buildApiUrl(path), {
    method: "POST",
    headers,
    body: body ? JSON.stringify(body) : undefined,
    credentials: "include",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `HTTP ${response.status}`);
  }

  return response.blob();
}

export async function apiBlobGet(path: string) {
  const headers = new Headers();

  const response = await fetch(buildApiUrl(path), {
    method: "GET",
    headers,
    credentials: "include",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `HTTP ${response.status}`);
  }

  return response.blob();
}
