"use client";

import { useCallback, useRef, useState } from "react";
import Toast from "@/components/Toast";

export function useToast() {
  const [toast, setToast] = useState({ show: false, message: "", sub: "" });
  const timer = useRef(null);

  const fire = useCallback((message, sub = "") => {
    clearTimeout(timer.current);
    setToast({ show: true, message, sub });
    timer.current = setTimeout(() => setToast((t) => ({ ...t, show: false })), 2600);
  }, []);

  const node = <Toast show={toast.show} message={toast.message} sub={toast.sub} />;

  return { fire, node };
}
