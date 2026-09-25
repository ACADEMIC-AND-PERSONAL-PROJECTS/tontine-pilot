"use client";

import { motion } from "framer-motion";
import { useLocale } from "@/lib/i18n";

export function HowItWorks() {
  const { t } = useLocale();
  const steps = [
    { title: t("how.s1.t"), body: t("how.s1.b") },
    { title: t("how.s2.t"), body: t("how.s2.b") },
    { title: t("how.s3.t"), body: t("how.s3.b") },
  ];

  return (
    <section
      id="how"
      className="relative border-t border-border py-[clamp(5rem,12vh,10rem)]"
    >
      <div className="mx-auto w-full max-w-[1200px] px-6 sm:px-8">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="mb-16 max-w-xl text-[clamp(1.75rem,3.5vw,2.5rem)] font-medium tracking-[-0.02em]"
        >
          {t("how.title")}
        </motion.h2>

        <div className="grid gap-10 md:grid-cols-3 md:gap-8">
          {steps.map((s, i) => (
            <motion.article
              key={s.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
              className="panel-luminous rounded-2xl p-7 transition-colors hover:border-border-hover"
            >
              <span className="font-mono text-sm font-medium text-accent-hover">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-4 text-xl font-medium tracking-tight">{s.title}</h3>
              <p className="mt-3 text-[15px] leading-relaxed text-muted">{s.body}</p>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
