"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type Locale = "en" | "fr";

type Dict = Record<string, string>;

const dictionaries: Record<Locale, Dict> = {
  en: {
    "lang.choose": "Choose your language",
    "lang.sub": "Hackathon judges · Senegalese community. Switch anytime.",
    "lang.continue": "Continue",
    "nav.features": "Features",
    "nav.film": "In action",
    "nav.demo": "Live demo",
    "nav.how": "How it works",
    "nav.login": "Sign in",
    "nav.open": "Open app",
    "nav.back": "Back to site",
    "nav.admin": "Signed in as Aïssatou Diallo · Admin",
    "hero.title": "The AI copilot for community tontines",
    "hero.body":
      "NLP declarations, Mobile Money OCR, empathic mediation, emergency fund, and audio digests — so your group stops arguing over WhatsApp.",
    "hero.cta": "Try the demo",
    "hero.secondary": "See how it works",
    "hero.stat1": "12 members · Liberté neighborhood",
    "hero.stat2": "96% cycle completion",
    "hero.stat3": "No real money moved — tracking only",
    "features.title": "What a notebook will never do",
    "features.f1.t": "Natural-language declarations",
    "features.f1.b":
      "“I paid 20,000 for Awa” → Bedrock extracts amount, month, and recipient.",
    "features.f2.t": "Mobile Money OCR",
    "features.f2.b":
      "Upload a Wave / Orange Money screenshot — amount, transaction ID, and date extracted automatically.",
    "features.f3.t": "Empathic mediator",
    "features.f3.b":
      "Warm reminders, installment plans, and tour-swap proposals before conflict starts.",
    "features.f4.t": "Emergency fund",
    "features.f4.b":
      "Optional reserve (Tontine Flex) to temporarily cover a late payment and unlock the recipient.",
    "features.f5.t": "Audio digest",
    "features.f5.b": "Listen to the cycle summary aloud — inclusive for low-literacy members.",
    "features.f6.t": "AI rotation order",
    "features.f6.b": "Risk-aware tour order: reliable members early, recurring late profiles later.",
    "features.f7.t": "Cycle dashboard",
    "features.f7.b": "Who paid, who owes, next recipient, full history — one screen.",
    "features.f8.t": "Exportable ledger",
    "features.f8.b": "PDF / CSV to end disputes before they start.",
    "demo.title": "September cycle, in the open",
    "demo.body":
      "Demo data for “Tontine Quartier Liberté” — 12 members, 20,000 FCFA / month.",
    "demo.cycle": "Current cycle",
    "demo.open": "OPEN",
    "demo.collected": "Collected",
    "demo.expected": "Expected",
    "demo.paid": "Paid",
    "demo.progress": "Progress",
    "how.title": "Three steps. Zero friction.",
    "how.s1.t": "Create your group",
    "how.s1.b": "Name, amount, members, and an AI-optimized rotation order — under two minutes.",
    "how.s2.t": "Declare by text or receipt",
    "how.s2.b": "Bedrock NLU or Vision OCR structures every informal payment automatically.",
    "how.s3.t": "Mediate & close the cycle",
    "how.s3.b": "Reminders, swaps, emergency cover, audio digest, exportable ledger.",
    "cta.title": "Ready to pilot your tontine?",
    "cta.body":
      "Explore the full demo — OCR receipts, AI mediation, emergency fund, and audio digest.",
    "cta.btn": "Launch demo",
    "film.eyebrow": "Product film",
    "film.title": "See the cycle close in real time",
    "film.body":
      "From informal payment messages to a shared ledger — watch how TontinePilot keeps every member aligned.",
    "film.caption": "OCR · mediation · emergency fund — one continuous loop.",
    "footer.blurb":
      "AI copilot for community rotating savings groups. Clarity instead of WhatsApp chaos.",
    "footer.product": "Product",
    "footer.app": "App",
    "footer.hackathon": "Built for",
    "footer.tags": "AWS Builder Hackathon · #workplace-efficiency · #community",
    "footer.note": "Never handles real money — tracking only.",
    "app.dashboard": "Dashboard",
    "app.groups": "Groups",
    "app.declare": "Declare",
    "app.members": "Members",
    "app.alerts": "Alerts",
    "app.export": "Export",
    "app.newGroup": "New group",
    "dash.title": "Dashboard",
    "dash.declare": "Declare a contribution",
    "dash.export": "Export",
    "dash.collected": "Collected this cycle",
    "dash.completion": "Completion rate",
    "dash.members": "Members",
    "dash.alerts": "Active alerts",
    "dash.contributions": "Contributions",
    "dash.outstanding": "Outstanding",
    "dash.aiAlerts": "AI alerts",
    "dash.past": "Past cycles",
    "dash.viewAll": "View all",
    "dash.forThem": "Declare for them",
    "dash.fund": "Emergency fund",
    "dash.fundHint": "Tontine Flex reserve",
    "dash.audio": "Audio digest",
    "dash.audioHint": "Cycle summary read aloud (Polly-style demo).",
    "dash.audioPlay": "Play digest",
    "dash.audioPlaying": "Playing…",
    "auth.signin": "Sign in",
    "auth.signup": "Create account",
    "auth.verify": "Check your inbox",
    "auth.tagline": "Your tontine, secured and transparent.",
    "auth.email": "Email",
    "auth.password": "Password",
    "auth.name": "Full name",
    "auth.confirmPw": "Confirm password",
    "auth.show": "Show",
    "auth.hide": "Hide",
    "auth.submitSignin": "Sign in",
    "auth.submitSignup": "Create my account",
    "auth.submitCode": "Verify",
    "auth.noAccount": "No account? Create one",
    "auth.hasAccount": "Already have an account? Sign in",
    "auth.codeHint": "6-digit code sent to",
    "auth.resend": "Resend code",
    "auth.resendIn": "Resend in",
    "auth.back": "Back",
    "auth.errGeneric": "Something went wrong. Try again.",
    "auth.errUserNotFound": "No account with this email.",
    "auth.errWrongPw": "Wrong email or password.",
    "auth.errUserExists": "An account already exists with this email.",
    "auth.errWeakPw": "Password too weak (8+ chars, a number, lowercase).",
    "auth.errPwMismatch": "Passwords do not match.",
    "auth.errBadCode": "Wrong code. Check and retry.",
    "auth.errExpiredCode": "Code expired. Request a new one.",
    "auth.errNotConfirmed": "Account not verified — code resent.",
    "auth.noBackend": "Demo mode — login activates with the live backend.",
  },
  fr: {
    "lang.choose": "Choisissez votre langue",
    "lang.sub": "Juges du hackathon · Communauté sénégalaise. Changez quand vous voulez.",
    "lang.continue": "Continuer",
    "nav.features": "Fonctionnalités",
    "nav.film": "En action",
    "nav.demo": "Démo live",
    "nav.how": "Comment ça marche",
    "nav.login": "Connexion",
    "nav.open": "Ouvrir l'app",
    "nav.back": "Retour au site",
    "nav.admin": "Connecté en tant qu'Aïssatou Diallo · Admin",
    "hero.title": "Le copilote IA des tontines communautaires",
    "hero.body":
      "Déclarations NLP, OCR Mobile Money, médiation empathique, caisse de secours et digest audio — pour que votre groupe arrête de se disputer sur WhatsApp.",
    "hero.cta": "Essayer la démo",
    "hero.secondary": "Voir le fonctionnement",
    "hero.stat1": "12 membres · Quartier Liberté",
    "hero.stat2": "96% de complétion des cycles",
    "hero.stat3": "Aucun argent réel — suivi uniquement",
    "features.title": "Ce qu'un cahier ne fera jamais",
    "features.f1.t": "Déclarations en langage naturel",
    "features.f1.b":
      "« J'ai payé 20 000 pour Awa » → Bedrock extrait montant, mois et bénéficiaire.",
    "features.f2.t": "OCR Mobile Money",
    "features.f2.b":
      "Uploadez une capture Wave / Orange Money — montant, ID transaction et date extraits automatiquement.",
    "features.f3.t": "Médiateur empathique",
    "features.f3.b":
      "Relances douces, étalements et propositions d'échange de tour avant le conflit.",
    "features.f4.t": "Caisse de secours",
    "features.f4.b":
      "Réserve facultative (Tontine Flex) pour couvrir temporairement un retard et débloquer le bénéficiaire.",
    "features.f5.t": "Digest audio",
    "features.f5.b": "Écoutez le bilan du cycle à voix haute — inclusif pour les membres peu alphabétisés.",
    "features.f6.t": "Ordre de rotation IA",
    "features.f6.b": "Tour sensible au risque : profils fiables d'abord, retards récurrents plus tard.",
    "features.f7.t": "Dashboard du cycle",
    "features.f7.b": "Qui a payé, qui doit, prochain bénéficiaire, historique — un seul écran.",
    "features.f8.t": "Registre exportable",
    "features.f8.b": "PDF / CSV pour couper court aux disputes.",
    "demo.title": "Le cycle de septembre, en transparence",
    "demo.body":
      "Données de démo du groupe « Tontine Quartier Liberté » — 12 membres, 20 000 FCFA / mois.",
    "demo.cycle": "Cycle en cours",
    "demo.open": "OUVERT",
    "demo.collected": "Collecté",
    "demo.expected": "Attendu",
    "demo.paid": "Payés",
    "demo.progress": "Progression",
    "how.title": "Trois étapes. Zéro friction.",
    "how.s1.t": "Créez votre groupe",
    "how.s1.b": "Nom, montant, membres et ordre de rotation optimisé par l'IA — en moins de deux minutes.",
    "how.s2.t": "Déclarez par texte ou reçu",
    "how.s2.b": "Bedrock NLU ou Vision OCR structure automatiquement chaque paiement informel.",
    "how.s3.t": "Médiez & clôturez le cycle",
    "how.s3.b": "Rappels, échanges, caisse de secours, digest audio, registre exportable.",
    "cta.title": "Prêt à piloter votre tontine ?",
    "cta.body":
      "Explorez la démo complète — OCR des reçus, médiation IA, caisse de secours et digest audio.",
    "cta.btn": "Lancer la démo",
    "film.eyebrow": "Film produit",
    "film.title": "Voir un cycle se fermer en direct",
    "film.body":
      "Des messages de paiement informels au registre partagé — regardez comment TontinePilot aligne chaque membre.",
    "film.caption": "OCR · médiation · caisse de secours — une boucle continue.",
    "footer.blurb":
      "Copilote IA pour les tontines communautaires. De la clarté à la place du chaos WhatsApp.",
    "footer.product": "Produit",
    "footer.app": "App",
    "footer.hackathon": "Construit pour",
    "footer.tags": "AWS Builder Hackathon · #workplace-efficiency · #community",
    "footer.note": "Ne manipule jamais d'argent réel — suivi uniquement.",
    "app.dashboard": "Dashboard",
    "app.groups": "Groupes",
    "app.declare": "Déclarer",
    "app.members": "Membres",
    "app.alerts": "Alertes",
    "app.export": "Exporter",
    "app.newGroup": "Nouveau groupe",
    "dash.title": "Dashboard",
    "dash.declare": "Déclarer une cotisation",
    "dash.export": "Exporter",
    "dash.collected": "Collecté ce cycle",
    "dash.completion": "Taux de complétion",
    "dash.members": "Membres",
    "dash.alerts": "Alertes actives",
    "dash.contributions": "Cotisations",
    "dash.outstanding": "À régulariser",
    "dash.aiAlerts": "Alertes IA",
    "dash.past": "Cycles passés",
    "dash.viewAll": "Tout voir",
    "dash.forThem": "Déclarer pour eux",
    "dash.fund": "Caisse de secours",
    "dash.fundHint": "Réserve Tontine Flex",
    "dash.audio": "Digest audio",
    "dash.audioHint": "Bilan du cycle lu à voix haute (démo style Polly).",
    "dash.audioPlay": "Écouter le bilan",
    "dash.audioPlaying": "Lecture…",
    "auth.signin": "Connexion",
    "auth.signup": "Créer un compte",
    "auth.verify": "Vérifie ta boîte mail",
    "auth.tagline": "Ta tontine, sécurisée et transparente.",
    "auth.email": "E-mail",
    "auth.password": "Mot de passe",
    "auth.name": "Nom complet",
    "auth.confirmPw": "Confirmer le mot de passe",
    "auth.show": "Afficher",
    "auth.hide": "Masquer",
    "auth.submitSignin": "Se connecter",
    "auth.submitSignup": "Créer mon compte",
    "auth.submitCode": "Vérifier",
    "auth.noAccount": "Pas de compte ? Crées-en un",
    "auth.hasAccount": "Déjà un compte ? Connecte-toi",
    "auth.codeHint": "Code à 6 chiffres envoyé à",
    "auth.resend": "Renvoyer le code",
    "auth.resendIn": "Renvoi dans",
    "auth.back": "Retour",
    "auth.errGeneric": "Un problème est survenu. Réessaie.",
    "auth.errUserNotFound": "Aucun compte avec cet e-mail.",
    "auth.errWrongPw": "E-mail ou mot de passe incorrect.",
    "auth.errUserExists": "Un compte existe déjà avec cet e-mail.",
    "auth.errWeakPw": "Mot de passe trop faible (8+ caractères, un chiffre, minuscule).",
    "auth.errPwMismatch": "Les mots de passe ne correspondent pas.",
    "auth.errBadCode": "Code incorrect. Vérifie et réessaie.",
    "auth.errExpiredCode": "Code expiré. Demande-en un nouveau.",
    "auth.errNotConfirmed": "Compte non vérifié — code renvoyé.",
    "auth.noBackend": "Mode démo — la connexion s'active avec le backend live.",
  },
};

type Ctx = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  ready: boolean;
  needsChoice: boolean;
  confirmLocale: (l: Locale) => void;
  t: (key: string) => string;
};

const LocaleContext = createContext<Ctx | null>(null);
const STORAGE_KEY = "tp-locale";

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");
  const [ready, setReady] = useState(false);
  const [needsChoice, setNeedsChoice] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as Locale | null;
    if (saved === "en" || saved === "fr") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage hydration on mount
      setLocaleState(saved);
      setNeedsChoice(false);
    } else {
      setNeedsChoice(true);
    }
    setReady(true);
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    localStorage.setItem(STORAGE_KEY, l);
    document.documentElement.lang = l;
  }, []);

  const confirmLocale = useCallback(
    (l: Locale) => {
      setLocale(l);
      setNeedsChoice(false);
    },
    [setLocale]
  );

  const t = useCallback(
    (key: string) => dictionaries[locale][key] ?? dictionaries.en[key] ?? key,
    [locale]
  );

  const value = useMemo(
    () => ({ locale, setLocale, ready, needsChoice, confirmLocale, t }),
    [locale, setLocale, ready, needsChoice, confirmLocale, t]
  );

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within LocaleProvider");
  return ctx;
}
