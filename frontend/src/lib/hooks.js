import { useEffect, useRef, useState } from "react";
import { apiFetch } from "./api.js";

// Periodically poll a list of endpoints in parallel.
// Returns { data: {key: response|null}, lastUpdated: Date, refresh: () => void }.
export function usePolling(endpoints, intervalMs = 8000) {
  const [data, setData] = useState(
    Object.fromEntries(Object.keys(endpoints).map((k) => [k, null]))
  );
  const [lastUpdated, setLastUpdated] = useState(null);
  const tickRef = useRef(0);

  const load = async () => {
    tickRef.current += 1;
    const myTick = tickRef.current;
    const keys = Object.keys(endpoints);
    const results = await Promise.all(keys.map((k) => apiFetch(endpoints[k])));
    if (myTick !== tickRef.current) return; // a newer request has started
    setData(Object.fromEntries(keys.map((k, i) => [k, results[i]])));
    setLastUpdated(new Date());
  };

  useEffect(() => {
    load();
    const id = setInterval(load, intervalMs);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intervalMs]);

  return { data, lastUpdated, refresh: load };
}

// Count-up on value change with cubic ease-out.
export function useAnimatedNumber(target, decimals = 0, durationMs = 700) {
  const [display, setDisplay] = useState(target ?? 0);
  const startRef = useRef({ from: 0, to: 0, t0: 0 });

  useEffect(() => {
    if (target === null || target === undefined || Number.isNaN(target)) return;
    startRef.current = { from: display, to: target, t0: performance.now() };
    let raf;
    const step = (now) => {
      const { from, to, t0 } = startRef.current;
      const t = Math.min((now - t0) / durationMs, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      setDisplay(from + (to - from) * ease);
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, durationMs]);

  return decimals === 0
    ? Math.round(display).toLocaleString()
    : display.toFixed(decimals);
}
