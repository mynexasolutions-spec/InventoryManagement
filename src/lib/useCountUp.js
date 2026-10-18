"use client";

import { useEffect, useRef, useState } from "react";

function easeOutExpo(t) {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

export function useCountUp(target, duration = 1100) {
  const [value, setValue] = useState(0);
  const frame = useRef(null);
  const start = useRef(null);

  useEffect(() => {
    start.current = null;
    cancelAnimationFrame(frame.current);

    function tick(ts) {
      if (start.current === null) start.current = ts;
      const elapsed = ts - start.current;
      const progress = Math.min(elapsed / duration, 1);
      setValue(target * easeOutExpo(progress));
      if (progress < 1) frame.current = requestAnimationFrame(tick);
    }

    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
  }, [target, duration]);

  return value;
}
