const API_BASE = import.meta.env.VITE_API_URL || "/api";

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

export function getToken() {
  return localStorage.getItem("recircle_token");
}

export function setSession(token, user) {
  if (token) localStorage.setItem("recircle_token", token);
  if (user) localStorage.setItem("recircle_user", JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem("recircle_token");
  localStorage.removeItem("recircle_user");
}

export function getCachedUser() {
  try {
    const raw = localStorage.getItem("recircle_user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function api(path, { method = "GET", body, token } = {}) {
  const headers = { "Content-Type": "application/json" };
  const authToken = token ?? getToken();
  if (authToken) headers.Authorization = `Bearer ${authToken}`;

  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError("Cannot reach the server. Is the API running on port 5000?", 0);
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiError(data.error || "Request failed.", response.status);
  }
  return data;
}
