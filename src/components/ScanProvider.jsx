"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import CameraScanner from "./CameraScanner";

const ScanContext = createContext(null);

export function beep(ok = true, text = "") {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("scan-result", { detail: { ok, text } }));
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = ok ? "sine" : "square";
    osc.frequency.value = ok ? 1040 : 200;
    gain.gain.value = 0.06;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + (ok ? 0.1 : 0.28));
    setTimeout(() => ctx.close(), 500);
    navigator.vibrate?.(ok ? 30 : [60, 40, 60]);
  } catch {}
}

export function ScanProvider({ children }) {
  const handlerRef = useRef(null);
  const [camera, setCamera] = useState(null);

  const dispatch = useCallback((code, source) => {
    handlerRef.current?.(code, source);
  }, []);

  // USB / Bluetooth scanners type the code very fast and finish with Enter. Typing inside inputs is left alone.
  useEffect(() => {
    let buf = "";
    let last = 0;
    function onKey(e) {
      const t = e.target;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const now = performance.now();
      if (now - last > 100) buf = "";
      last = now;
      if (e.key === "Enter") {
        if (buf.length >= 6) {
          e.preventDefault();
          handlerRef.current?.(buf, "scanner");
        }
        buf = "";
        return;
      }
      if (e.key.length === 1) buf += e.key;
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const value = useMemo(
    () => ({
      handlerRef,
      dispatch,
      openCamera: (opts = {}) => setCamera(opts),
      closeCamera: () => setCamera(null),
      cameraOpen: !!camera,
    }),
    [dispatch, camera]
  );

  return (
    <ScanContext.Provider value={value}>
      {children}
      {camera && <CameraScanner title={camera.title} hint={camera.hint} onClose={() => setCamera(null)} onDetect={(code) => dispatch(code, "camera")} />}
    </ScanContext.Provider>
  );
}

export function useScanner() {
  return useContext(ScanContext);
}

// Views register what a scan should do while they are on screen.
export function useScanHandler(handler) {
  const { handlerRef } = useContext(ScanContext);
  useEffect(() => {
    handlerRef.current = handler;
    return () => {
      if (handlerRef.current === handler) handlerRef.current = null;
    };
  });
}
