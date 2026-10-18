"use client";

import { useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

const subscribe = () => () => {};

// Renders print-only content directly under <body>. Everything else is hidden by the @media print rules in globals.css.
export default function PrintPortal({ children }) {
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  if (!mounted) return null;
  return createPortal(<div id="print-portal">{children}</div>, document.body);
}
