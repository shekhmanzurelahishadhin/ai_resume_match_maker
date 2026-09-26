"use client";

import { useEffect, useState } from "react";
import { animate, useReducedMotion } from "framer-motion";

/** Counts up from 0 to the numeric part of `value`, keeping any suffix like "%". */
export function AnimatedValue({ value }: { value: string | number }) {
  const reduce = useReducedMotion();
  const match = String(value).match(/^(-?\d+(?:\.\d+)?)(.*)$/);
  const target = match ? Number(match[1]) : null;
  const suffix = match ? match[2] : "";
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (target === null || reduce) return;
    const controls = animate(0, target, {
      duration: 1.1,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    return () => controls.stop();
  }, [target, reduce]);

  if (target === null || reduce) return <>{value}</>;
  return (
    <>
      {display}
      {suffix}
    </>
  );
}
