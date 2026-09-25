"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/landing/brand-mark";
import { useLocale } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { CodeInput } from "./code-input";
import { passwordScore, useAuthFlow } from "./use-auth-flow";

const inputCls =
  "w-full rounded-xl border border-border bg-background/60 px-4 py-2.5 text-sm outline-none transition-colors placeholder:text-muted/60 focus:border-accent/40 focus:ring-1 focus:ring-accent/30";

export function AuthCard() {
  const { t } = useLocale();
  const flow = useAuthFlow();
  const { step, setStep, email, setEmail, loading, error } = flow;
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [code, setCode] = useState("");
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (step === "verify" && cooldown === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- (re)start 60s resend timer on entering verify
      setCooldown(60);
      return;
    }
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown, step]);

  const score = passwordScore(password);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      className="panel-luminous w-[min(92vw,420px)] rounded-2xl p-6 sm:p-8"
    >
      <div className="flex flex-col items-center text-center">
        <BrandMark size={40} />
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">
          <span className="gradient-text">TontinePilot</span>
        </h1>
        <p className="mt-1 text-sm text-muted">{t("auth.tagline")}</p>
      </div>

      <div className="mt-6 flex gap-1 rounded-xl border border-border bg-background/40 p-1">
        {(["signin", "signup"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStep(s)}
            className={cn(
              "flex-1 rounded-[10px] px-3 py-2 text-sm font-medium transition-colors",
              step === s || (step === "verify" && s === "signup")
                ? "bg-accent-glow text-accent-hover"
                : "text-muted hover:text-foreground"
            )}
          >
            {s === "signin" ? t("auth.signin") : t("auth.signup")}
          </button>
        ))}
      </div>

      <motion.div
        key={step}
        animate={error ? { x: [0, -8, 8, -6, 6, 0] } : {}}
        transition={{ duration: 0.4 }}
      >
        <AnimatePresence mode="wait">
          {step === "signin" && (
            <motion.form
              key="signin"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.25 }}
              className="mt-5 space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                flow.doSignIn(password);
              }}
            >
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                required
                placeholder={t("auth.email")}
                className={inputCls}
              />
              <div className="relative">
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type={showPw ? "text" : "password"}
                  required
                  placeholder={t("auth.password")}
                  className={cn(inputCls, "pr-16")}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1 rounded-lg px-2 py-1 text-xs text-muted hover:text-foreground"
                >
                  {showPw ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  {showPw ? t("auth.hide") : t("auth.show")}
                </button>
              </div>
              {error && <p className="text-xs text-danger">{error}</p>}
              <Button type="submit" disabled={loading} className="w-full gap-2">
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {t("auth.submitSignin")}
              </Button>
              <button
                type="button"
                onClick={() => setStep("signup")}
                className="mx-auto block text-xs text-muted hover:text-foreground hover:underline"
              >
                {t("auth.noAccount")}
              </button>
            </motion.form>
          )}

          {step === "signup" && (
            <motion.form
              key="signup"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.25 }}
              className="mt-5 space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                flow.doSignUp(name, password, confirm);
              }}
            >
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder={t("auth.name")}
                className={inputCls}
              />
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                required
                placeholder={t("auth.email")}
                className={inputCls}
              />
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type={showPw ? "text" : "password"}
                required
                placeholder={t("auth.password")}
                className={inputCls}
              />
              <div className="flex gap-1">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={cn(
                      "h-1 flex-1 rounded-full transition-colors",
                      i < score
                        ? score >= 3
                          ? "bg-ok"
                          : score === 2
                            ? "bg-warn"
                            : "bg-danger"
                        : "bg-bg-subtle"
                    )}
                  />
                ))}
              </div>
              <input
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                type="password"
                required
                placeholder={t("auth.confirmPw")}
                className={inputCls}
              />
              {error && <p className="text-xs text-danger">{error}</p>}
              <Button type="submit" disabled={loading} className="w-full gap-2">
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {t("auth.submitSignup")}
              </Button>
              <button
                type="button"
                onClick={() => setStep("signin")}
                className="mx-auto block text-xs text-muted hover:text-foreground hover:underline"
              >
                {t("auth.hasAccount")}
              </button>
            </motion.form>
          )}

          {step === "verify" && (
            <motion.div
              key="verify"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.25 }}
              className="mt-5 space-y-4"
            >
              <div className="flex flex-col items-center text-center">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-ok/15 text-ok">
                  <Check className="h-5 w-5" />
                </span>
                <p className="mt-3 text-sm font-medium">{t("auth.verify")}</p>
                <p className="mt-1 text-xs text-muted">
                  {t("auth.codeHint")} <span className="font-medium text-foreground">{email}</span>
                </p>
              </div>
              <CodeInput value={code} onChange={setCode} onComplete={(v) => flow.doVerify(v)} />
              {error && <p className="text-center text-xs text-danger">{error}</p>}
              <Button
                disabled={loading || code.trim().length < 6}
                className="w-full gap-2"
                onClick={() => flow.doVerify(code)}
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {t("auth.submitCode")}
              </Button>
              <div className="flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => setStep("signin")}
                  className="text-muted hover:text-foreground hover:underline"
                >
                  {t("auth.back")}
                </button>
                {cooldown > 0 ? (
                  <span className="text-muted-dim">
                    {t("auth.resendIn")} {cooldown}s
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      flow.doResend();
                      setCooldown(60);
                    }}
                    className="font-medium text-accent-hover hover:underline"
                  >
                    {t("auth.resend")}
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
