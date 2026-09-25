"use client";

import { useEffect, useRef } from "react";

export function HeroTitle({ text }: { text: string }) {
  const ref = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const words = text.split(" ");
    el.innerHTML = "";
    words.forEach((word, i) => {
      const wrap = document.createElement("span");
      wrap.className = "h1-word";
      const inner = document.createElement("span");
      inner.className = "h1-inner";
      inner.textContent = i < words.length - 1 ? word + "\u00A0" : word;
      if (!reducedMotion) {
        inner.style.transform = "translateY(115%)";
        inner.style.transition = `transform 900ms cubic-bezier(0.16, 1, 0.3, 1) ${i * 90}ms`;
      }
      wrap.appendChild(inner);
      el.appendChild(wrap);
    });
    if (!reducedMotion) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          el.querySelectorAll(".h1-inner").forEach((inner) => {
            (inner as HTMLElement).style.transform = "translateY(0)";
          });
        });
      });
    }
  }, [text]);

  return (
    <h1
      ref={ref}
      className="text-[clamp(2.4rem,5.5vw,4.25rem)] font-semibold leading-[1.05] tracking-[-0.035em] text-foreground"
    />
  );
}
