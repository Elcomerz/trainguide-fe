import Constants from "expo-constants";

export function apiBase() {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  // The page may be opened at a LAN address. Call the API on that same host.
  if (typeof window !== "undefined" && window.location?.hostname) {
    return `http://${window.location.hostname}:8000`;
  }
  const host = Constants.expoConfig?.hostUri?.split(":")[0];
  if (host) return `http://${host}:8000`;
  return "http://localhost:8000";
}

export async function getJson(path) {
  const response = await fetch(`${apiBase()}${path}`);
  if (!response.ok) {
    throw new Error(`Request failed (${response.status})`);
  }
  return response.json();
}

export function untilLabel(minutes) {
  if (minutes <= 0) return "now";
  if (minutes < 60) return `in ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `in ${hours}h ${rest}m` : `in ${hours}h`;
}

export function delayLabel(minutes) {
  if (minutes == null) return "";
  if (minutes <= 0) return "On time";
  return `+${minutes} min`;
}
