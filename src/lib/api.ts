const SERVER_API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") || "";
const API_BASE_URL = typeof window === "undefined" ? SERVER_API_BASE_URL : "";

export function getApiBaseUrl() {
  return API_BASE_URL;
}

export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

function isHtmlErrorPayload(value: string) {
  const trimmed = value.trim().toLowerCase();
  return (
    trimmed.startsWith("<!doctype html") ||
    trimmed.startsWith("<html") ||
    trimmed.includes("<head") ||
    trimmed.includes("<body")
  );
}

function buildHttpErrorMessage(status: number) {
  if (status >= 500) {
    return `HTTP ${status} - servico indisponivel temporariamente`;
  }
  return `HTTP ${status}`;
}

function extractErrorMessage(
  rawText: string,
  status: number
): { message: string; code?: string } {
  if (!rawText.trim()) {
    return { message: buildHttpErrorMessage(status) };
  }

  if (isHtmlErrorPayload(rawText)) {
    return { message: buildHttpErrorMessage(status) };
  }

  try {
    const parsed = JSON.parse(rawText) as {
      message?: string;
      code?: string;
      request_id?: string;
      details?:
        | {
            errors?: Array<{
              field?: string;
              message?: string;
            }>;
          }
        | Array<{
            field?: string;
            message?: string;
          }>;
    };
    const message = parsed.message || buildHttpErrorMessage(status);
    const detailErrors = Array.isArray(parsed.details)
      ? parsed.details
      : Array.isArray(parsed.details?.errors)
        ? parsed.details.errors
        : [];
    const detailSuffix = detailErrors.length
      ? ` ${detailErrors
          .map((item) => {
            const field = String(item?.field || "").trim();
            const detailMessage = String(item?.message || "").trim();
            if (field && detailMessage) return `${field}: ${detailMessage}`;
            return field || detailMessage;
          })
          .filter(Boolean)
          .join(" | ")}`
      : "";
    const suffix = parsed.request_id ? ` (request_id: ${parsed.request_id})` : "";
    return { message: `${message}${detailSuffix}${suffix}`, code: parsed.code };
  } catch {
    return { message: rawText };
  }
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
    const { message, code } = extractErrorMessage(rawText, response.status);
    throw new ApiError(message, response.status, code);
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
    const { message, code } = extractErrorMessage(text, response.status);
    throw new ApiError(message, response.status, code);
  }

  return response.blob();
}

type BlobGetRetryOptions = {
  attempts?: number;
  backoffMs?: number;
  statuses?: number[];
};

const wait = (ms: number) =>
  new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });

export async function apiBlobGet(path: string, retry?: BlobGetRetryOptions) {
  const headers = new Headers();
  const attempts = Math.max(1, retry?.attempts ?? 1);
  const backoffMs = Math.max(0, retry?.backoffMs ?? 250);
  const retryStatuses = new Set(retry?.statuses ?? []);

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const response = await fetch(buildApiUrl(path), {
      method: "GET",
      headers,
      credentials: "include",
    });

    if (response.ok) {
      return response.blob();
    }

    const shouldRetry = retryStatuses.has(response.status) && attempt < attempts;
    const text = await response.text();
    if (shouldRetry) {
      await wait(backoffMs * attempt);
      continue;
    }

    const { message, code } = extractErrorMessage(text, response.status);
    throw new ApiError(message, response.status, code);
  }

  throw new Error("Falha ao baixar arquivo.");
}
