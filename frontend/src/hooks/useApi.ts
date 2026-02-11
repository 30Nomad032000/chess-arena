import { useCallback } from "react";

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

interface ApiHelpers {
  get: <T = unknown>(path: string) => Promise<T>;
  post: <T = unknown>(path: string, body?: unknown) => Promise<T>;
}

async function request<T>(path: string, options: RequestInit): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!res.ok) {
    let message = `Request failed: ${res.status} ${res.statusText}`;
    try {
      const body = await res.json();
      if (body.error) message = body.error;
      else if (body.message) message = body.message;
    } catch {
      // no json body
    }
    throw new Error(message);
  }

  if (res.status === 204) return undefined as T;

  return res.json() as Promise<T>;
}

export function useApi(): ApiHelpers {
  const get = useCallback(<T = unknown>(path: string): Promise<T> => {
    return request<T>(path, { method: "GET" });
  }, []);

  const post = useCallback(
    <T = unknown>(path: string, body?: unknown): Promise<T> => {
      return request<T>(path, {
        method: "POST",
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
    },
    []
  );

  return { get, post };
}
