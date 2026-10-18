"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BrowserMultiFormatReader, BrowserCodeReader } from "@zxing/browser";
import { DecodeHintType, BarcodeFormat } from "@zxing/library";
import { X, SwitchCamera, Camera, Check, Barcode, AlertCircle } from "lucide-react";
import { beep } from "./ScanProvider";
import { useBodyLock } from "@/lib/useBodyLock";

function friendlyError(e) {
  if (typeof window !== "undefined" && !window.isSecureContext)
    return "Camera requires a secure connection (HTTPS or localhost).";
  const name = e?.name ?? "";
  if (name === "NotAllowedError" || name === "SecurityError")
    return "Camera permission is blocked. Click the camera icon in your browser URL bar to allow access.";
  if (name === "NotFoundError" || name === "OverconstrainedError")
    return "No camera detected on this device.";
  if (name === "NotReadableError")
    return "Camera is in use by another application.";
  return "Unable to start camera feed. Please use manual entry below.";
}

export default function CameraScanner({
  onClose,
  onDetect,
  title = "Scan Barcode",
  hint = "Point camera at product barcode",
}) {
  useBodyLock(true);
  const videoRef = useRef(null);
  const detectRef = useRef(onDetect);
  const [error, setError] = useState("");
  const [devices, setDevices] = useState([]);
  const [deviceId, setDeviceId] = useState(null);
  const [last, setLast] = useState("");
  const [result, setResult] = useState(null);
  const [flashKey, setFlashKey] = useState(0);
  const [manualCode, setManualCode] = useState("");

  useEffect(() => {
    function onResult(e) {
      if (e.detail?.text) setResult(e.detail);
    }
    window.addEventListener("scan-result", onResult);
    return () => window.removeEventListener("scan-result", onResult);
  }, []);

  useEffect(() => {
    detectRef.current = onDetect;
  });

  useEffect(() => {
    let controls = null;
    let cancelled = false;
    let lastCode = "";
    let lastAt = 0;

    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.UPC_A,
      BarcodeFormat.CODE_128,
      BarcodeFormat.CODE_39,
      BarcodeFormat.QR_CODE,
    ]);
    hints.set(DecodeHintType.TRY_HARDER, true);

    const reader = new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 80 });
    const constraints = {
      audio: false,
      video: deviceId
        ? { deviceId: { exact: deviceId } }
        : { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
    };

    reader
      .decodeFromConstraints(constraints, videoRef.current, (result) => {
        if (!result) return;
        const text = result.getText();
        const t = Date.now();
        if (text === lastCode && t - lastAt < 1400) return;
        lastCode = text;
        lastAt = t;
        setLast(text);
        setFlashKey((k) => k + 1);
        beep(true);
        setResult(null);
        detectRef.current?.(text);
      })
      .then((c) => {
        if (cancelled) {
          c.stop();
          return;
        }
        controls = c;
        BrowserCodeReader.listVideoInputDevices()
          .then((list) => !cancelled && setDevices(list))
          .catch(() => {});
      })
      .catch((e) => {
        if (!cancelled) setError(friendlyError(e));
      });

    return () => {
      cancelled = true;
      controls?.stop();
    };
  }, [deviceId]);

  function nextCamera() {
    if (devices.length < 2) return;
    const idx = devices.findIndex((d) => d.deviceId === deviceId);
    setDeviceId(devices[(idx + 1) % devices.length].deviceId);
  }

  function handleManualSubmit(e) {
    e.preventDefault();
    const v = manualCode.trim();
    if (!v) return;
    setLast(v);
    setFlashKey((k) => k + 1);
    beep(true);
    setResult(null);
    detectRef.current?.(v);
    setManualCode("");
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl"
      >
        {/* Clean Header */}
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div>
            <h2 className="font-display text-base font-bold text-ink">{title}</h2>
            <p className="mt-0.5 text-xs text-ink-soft">{hint}</p>
          </div>

          <div className="flex items-center gap-1">
            {devices.length > 1 && (
              <button
                onClick={nextCamera}
                title="Switch Camera"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-soft hover:bg-surface-2 hover:text-ink transition-colors"
              >
                <SwitchCamera size={16} />
              </button>
            )}
            <button
              onClick={onClose}
              title="Close"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-soft hover:bg-surface-2 hover:text-ink transition-colors"
            >
              <X size={17} />
            </button>
          </div>
        </div>

        {/* Camera Feed Container */}
        <div className="p-4 pb-2">
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-slate-950 shadow-inner">
            <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />

            {error ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-slate-900 text-slate-300">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-800 text-slate-400 mb-3 border border-slate-700/60">
                  <Camera size={24} />
                </div>
                <div className="text-sm font-semibold text-white">Camera Access Needed</div>
                <p className="mt-1 text-xs text-slate-400 max-w-xs leading-relaxed">{error}</p>
              </div>
            ) : (
              <>
                {/* Minimalist 4-Corner Target Frame */}
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="relative h-[55%] w-[75%] max-w-[280px]">
                    {/* Corners */}
                    <span className="absolute left-0 top-0 h-5 w-5 rounded-tl border-l-2 border-t-2 border-white/90" />
                    <span className="absolute right-0 top-0 h-5 w-5 rounded-tr border-r-2 border-t-2 border-white/90" />
                    <span className="absolute bottom-0 left-0 h-5 w-5 rounded-bl border-b-2 border-l-2 border-white/90" />
                    <span className="absolute bottom-0 right-0 h-5 w-5 rounded-br border-b-2 border-r-2 border-white/90" />

                    {/* Smooth Scan Line */}
                    <div className="scan-line absolute inset-x-2 h-0.5 rounded-full bg-emerald-400/80 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                  </div>
                </div>

                {/* Subtle Detection Flash */}
                <AnimatePresence>
                  {flashKey > 0 && (
                    <motion.div
                      key={flashKey}
                      initial={{ opacity: 0.4 }}
                      animate={{ opacity: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="pointer-events-none absolute inset-0 bg-emerald-500"
                    />
                  )}
                </AnimatePresence>
              </>
            )}
          </div>
        </div>

        {/* Recent Scan Confirmation Banner */}
        {(result || last) && (
          <div className="px-4 py-1.5">
            <motion.div
              key={`${last}-${result?.text ?? ""}-${flashKey}`}
              initial={{ opacity: 0, y: 6, x: result && !result.ok ? [0, -6, 6, -4, 4, 0] : 0 }}
              animate={{ opacity: 1, y: 0, x: 0 }}
              className={`flex items-start gap-2.5 rounded-lg border px-3 py-2.5 text-xs ${
                result && !result.ok
                  ? "border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300"
                  : "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
              }`}
            >
              {result && !result.ok ? <AlertCircle size={15} className="mt-px shrink-0" /> : <Check size={15} className="mt-px shrink-0" />}
              <div className="min-w-0 flex-1">
                <div className="text-sm font-extrabold leading-snug">{result?.text || "Scanned"}</div>
                {last && <div className="mt-0.5 break-all font-mono text-[11px] opacity-80">{last}</div>}
              </div>
            </motion.div>
          </div>
        )}

        {/* Manual Barcode / SKU Input */}
        <div className="p-4 pt-2">
          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Barcode size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="Or type barcode / SKU manually…"
                className="input py-2! pl-9! text-xs font-mono"
              />
            </div>
            <button
              type="submit"
              disabled={!manualCode.trim()}
              className="btn-primary rounded-xl px-4 py-2 text-xs font-semibold shrink-0 disabled:opacity-40"
            >
              Submit
            </button>
          </form>
        </div>

        {/* Minimal Footer */}
        <div className="flex items-center justify-between border-t border-line bg-surface-2/40 px-5 py-2.5 text-[11px] text-ink-faint">
          <span>EAN-13 • Code 128 • QR</span>
          <span className="flex items-center gap-1.5 font-medium text-ink-soft">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Scanner Ready
          </span>
        </div>
      </motion.div>
    </div>
  );
}
