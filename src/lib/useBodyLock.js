import { useEffect } from "react";

// While a modal, drawer or full-page sheet is open, the page behind it must not scroll (one scrollbar only).
export function useBodyLock(locked) {
  useEffect(() => {
    if (!locked) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [locked]);
}
