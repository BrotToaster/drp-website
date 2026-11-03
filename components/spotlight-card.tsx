"use client";

// Lightweight adaptation of React Bits' SpotlightCard. See THIRD_PARTY_NOTICES.md.
import { useEffect, useRef, type ComponentPropsWithoutRef, type PointerEvent } from "react";

export function SpotlightCard({ children, className = "", ...props }: ComponentPropsWithoutRef<"article">) {
  const card = useRef<HTMLElement>(null);
  const frame = useRef<number | null>(null);
  const enabled = useRef(false);
  const pointer = useRef({ x: 0, y: 0 });
  useEffect(() => {
    const media = window.matchMedia("(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)");
    const update = () => {
      enabled.current = media.matches;
      if (!media.matches) card.current?.style.removeProperty("--spotlight-presence");
    };
    update();
    media.addEventListener("change", update);
    return () => {
      media.removeEventListener("change", update);
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
  }, []);
  const move = (event: PointerEvent<HTMLElement>) => {
    if (!enabled.current || event.pointerType !== "mouse") return;
    const box = event.currentTarget.getBoundingClientRect();
    pointer.current = { x: event.clientX - box.left, y: event.clientY - box.top };
    if (frame.current !== null) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      card.current?.style.setProperty("--spotlight-x", `${pointer.current.x}px`);
      card.current?.style.setProperty("--spotlight-y", `${pointer.current.y}px`);
      card.current?.style.setProperty("--spotlight-presence", "1");
    });
  };
  return <article {...props} ref={card} className={`spotlight-card ${className}`} onPointerMove={move} onPointerLeave={() => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
    card.current?.style.removeProperty("--spotlight-presence");
  }}>{children}</article>;
}
