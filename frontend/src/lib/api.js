// All calls go through the Vite proxy (/api/* → Flask on :5000 in dev).
// In production the built bundle is served by Flask itself, so /api stays relative.

export async function apiFetch(path) {
  try {
    const res = await fetch(path);
    if (!res.ok) {
      console.warn(`API ${path} → ${res.status}`);
      return null;
    }
    return await res.json();
  } catch (e) {
    console.warn(`API ${path} failed:`, e.message);
    return null;
  }
}
