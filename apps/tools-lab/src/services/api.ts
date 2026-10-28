export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const clientKey = sessionStorage.getItem("veristrata_ai_tools_key") || "";
  const response = await fetch(path, { ...init, headers: { "content-type": "application/json", ...(clientKey ? { authorization: `Bearer ${clientKey}` } : {}), ...init?.headers } });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error?.message || `Request failed (${response.status})`);
  return body as T;
}

export const post = <T,>(path: string, body: unknown) => api<T>(path, { method: "POST", body: JSON.stringify(body) });
