"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  confirmSignUp,
  resendSignUpCode,
  signIn,
  signUp,
} from "aws-amplify/auth";
import { useLocale } from "@/lib/i18n";
import { isBackendEnabled } from "@/lib/backend";

export type AuthStep = "signin" | "signup" | "verify";

export function passwordScore(pw: string): number {
  let s = 0;
  if (pw.length >= 8) s++;
  if (/\d/.test(pw)) s++;
  if (/[a-z]/.test(pw)) s++;
  if (pw.length >= 12) s++;
  return s;
}

export function useAuthFlow() {
  const { t } = useLocale();
  const router = useRouter();
  const [step, setStep] = useState<AuthStep>("signin");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const passwordRef = useRef(""); // memory-only, for post-verify auto sign-in

  const mapError = useCallback(
    (e: unknown): string => {
      const name =
        (e as { name?: string })?.name ?? (e as Error)?.message ?? "";
      if (/UsernameExists|AliasExists/.test(name)) return t("auth.errUserExists");
      if (/UserNotFound/.test(name)) return t("auth.errUserNotFound");
      if (/NotAuthorized|Incorrect.*password/i.test(name)) return t("auth.errWrongPw");
      if (/InvalidPassword|weak/i.test(name)) return t("auth.errWeakPw");
      if (/CodeMismatch/.test(name)) return t("auth.errBadCode");
      if (/ExpiredCode/.test(name)) return t("auth.errExpiredCode");
      if (/UserNotConfirmed/.test(name)) return t("auth.errNotConfirmed");
      return t("auth.errGeneric");
    },
    [t]
  );

  const go = useCallback(
    async (fn: () => Promise<void>): Promise<boolean> => {
      if (!isBackendEnabled()) {
        setError(t("auth.noBackend"));
        return false;
      }
      setLoading(true);
      setError(null);
      setNotice(null);
      try {
        await fn();
        return true;
      } catch (e) {
        setError(mapError(e));
        return false;
      } finally {
        setLoading(false);
      }
    },
    [mapError, t]
  );

  const doSignIn = useCallback(
    async (password: string) => {
      if (!isBackendEnabled()) {
        setError(t("auth.noBackend"));
        return;
      }
      setLoading(true);
      setError(null);
      try {
        await signIn({ username: email.trim(), password });
        router.push("/dashboard");
      } catch (e) {
        const name = (e as { name?: string })?.name ?? "";
        if (/UserNotConfirmed/.test(name)) {
          try {
            await resendSignUpCode({ username: email.trim() });
          } catch {
            // ignore resend failure, step change is the signal
          }
          setError(null);
          setStep("verify");
        } else {
          setError(mapError(e));
        }
      } finally {
        setLoading(false);
      }
    },
    [email, mapError, router, t]
  );

  const doSignUp = useCallback(
    async (name: string, password: string, confirm: string) => {
      if (password !== confirm) {
        setError(t("auth.errPwMismatch"));
        return;
      }
      if (passwordScore(password) < 3) {
        setError(t("auth.errWeakPw"));
        return;
      }
      passwordRef.current = password;
      try {
        const ok = await go(async () => {
          await signUp({
            username: email.trim(),
            password,
            options: { userAttributes: { email: email.trim(), name: name.trim() } },
          });
        });
        if (ok) setStep("verify");
      } catch {
        // error already mapped
      }
    },
    [email, go, t]
  );

  const doVerify = useCallback(
    async (code: string) => {
      const ok = await go(async () => {
        await confirmSignUp({ username: email.trim(), confirmationCode: code.trim() });
      });
      if (ok) {
        // chain straight into a session — no second login needed
        await doSignIn(passwordRef.current);
        passwordRef.current = "";
      }
    },
    [email, go, doSignIn]
  );

  const doResend = useCallback(async (): Promise<boolean> => {
    const ok = await go(async () => {
      await resendSignUpCode({ username: email.trim() });
    });
    if (ok) setNotice(t("auth.resentOk"));
    return ok;
  }, [email, go, t]);

  return {
    step, setStep, email, setEmail, loading, error, setError, notice,
    doSignIn, doSignUp, doVerify, doResend,
  };
}
