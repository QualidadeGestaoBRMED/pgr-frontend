const SERVER_API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") || "";
const API_BASE_URL = typeof window === "undefined" ? SERVER_API_BASE_URL : "";
export const FRONTEND_USERNAME_STORAGE_KEY = "pgr.frontend.username";

export function getApiBaseUrl() {
  return API_BASE_URL;
}

function buildApiUrl(path: string) {
  const safePath = path.startsWith("/") ? path : `/${path}`;
  return API_BASE_URL ? `${API_BASE_URL}${safePath}` : safePath;
}

function getFrontendUsernameHeader() {
  if (typeof window === "undefined") return {};
  const username = window.localStorage
    .getItem(FRONTEND_USERNAME_STORAGE_KEY)
    ?.trim();
  if (!username) return {};
  return { "X-Frontend-Username": username };
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

  const response = await fetch(buildApiUrl(path), {
    ...init,
    headers: {
      ...getFrontendUsernameHeader(),
      ...(shouldSetJsonHeader ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers || {}),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `HTTP ${response.status}`);
  }

  if (!expectJson) {
    return null as T;
  }

  return (await response.json()) as T;
}

export function apiGet<T>(path: string) {
  return request<T>(path);
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
  const response = await fetch(buildApiUrl(path), {
    method: "POST",
    headers: {
      ...getFrontendUsernameHeader(),
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `HTTP ${response.status}`);
  }

  return response.blob();
}

export async function apiBlobGet(path: string) {
  const response = await fetch(buildApiUrl(path), {
    method: "GET",
    headers: {
      ...getFrontendUsernameHeader(),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `HTTP ${response.status}`);
  }

  return response.blob();
}
