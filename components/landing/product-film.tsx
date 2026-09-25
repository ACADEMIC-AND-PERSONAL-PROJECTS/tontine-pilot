"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { Pause, Play } from "lucide-react";
import { useLocale } from "@/lib/i18n";

export function ProductFilm() {
  const { t } = useLocale();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(true);

  const toggle = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      void v.play();
      setPlaying(true);
    } else {
      v.pause();
      setPlaying(false);
    }
  };

  return (
    <section
      id="film"
      className="relative border-t border-border py-[clamp(5rem,12vh,10rem)]"
    >
      <div className="mx-auto w-full max-w-[1200px] px-6 sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="mb-12 max-w-xl"
        >
          <p className="mb-4 text-xs font-medium uppercase tracking-[0.2em] text-accent-hover">
            {t("film.eyebrow")}
          </p>
          <h2 className="text-[clamp(1.75rem,3.5vw,2.5rem)] font-medium tracking-[-0.02em]">
            {t("film.title")}
          </h2>
          <p className="mt-4 max-w-[48ch] text-[15px] leading-relaxed text-muted">
            {t("film.body")}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
          className="relative"
        >
          {/* Outer luminous frame */}
          <div
            className="pointer-events-none absolute -inset-[1px] rounded-[22px] opacity-90"
            style={{
              background:
                "linear-gradient(135deg, rgba(250,204,21,0.35), rgba(139,92,246,0.45) 40%, rgba(34,211,238,0.25) 80%, rgba(217,70,239,0.3))",
            }}
          />
          <div className="shadow-elevate-high relative overflow-hidden rounded-[21px] border border-white/[0.08] bg-bg-raised">
            {/* Soft brand wash behind video */}
            <div
              className="pointer-events-none absolute inset-0 z-[1]"
              style={{
                background:
                  "radial-gradient(ellipse 80% 60% at 50% 100%, rgba(139,92,246,0.18), transparent 55%)",
              }}
            />

            <div className="relative aspect-[16/9] w-full bg-[#05060d]">
              <video
                ref={videoRef}
                className="absolute inset-0 h-full w-full object-cover"
                src="/video2.mp4"
                autoPlay
                muted
                loop
                playsInline
                poster="/logo.jpeg"
              />

              {/* Cinematic letterbox vignette */}
              <div
                className="pointer-events-none absolute inset-0 z-[2]"
                style={{
                  background:
                    "linear-gradient(to top, rgba(7,9,19,0.75) 0%, transparent 28%), linear-gradient(to bottom, rgba(7,9,19,0.35) 0%, transparent 18%), radial-gradient(ellipse at center, transparent 40%, rgba(7,9,19,0.45) 100%)",
                }}
              />

              {/* Bottom caption bar */}
              <div className="absolute inset-x-0 bottom-0 z-[3] flex items-end justify-between gap-4 p-5 sm:p-7">
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-gold/90">
                    TontinePilot
                  </p>
                  <p className="mt-1.5 max-w-sm text-sm text-foreground/90 sm:text-[15px]">
                    {t("film.caption")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={toggle}
                  aria-label={playing ? "Pause" : "Play"}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/15 bg-black/40 text-foreground backdrop-blur-md transition-colors hover:border-gold/40 hover:bg-black/55"
                >
                  {playing ? (
                    <Pause className="h-4 w-4" fill="currentColor" />
                  ) : (
                    <Play className="h-4 w-4 translate-x-0.5" fill="currentColor" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
