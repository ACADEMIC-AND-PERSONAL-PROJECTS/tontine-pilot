"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Sparkles } from "lucide-react";
import { useLocale } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { client, isBackendEnabled } from "@/lib/backend";

type Msg = { id: number; from: "bot" | "user"; text: string };

let idc = 1;

function answer(input: string, fr: boolean): string {
  const q = input.toLowerCase();
  const has = (...words: string[]) => words.some((w) => q.includes(w));

  if (has("bonjour", "salut", "hello", "hi", "bonsoir", "hey"))
    return fr
      ? "Salut ! Je suis Tonti, l'assistant du groupe. Pose-moi une question sur les cotisations, les retards, la caisse de secours ou l'export du registre."
      : "Hi! I'm Tonti, the group assistant. Ask me about contributions, late payments, the emergency fund, or ledger export.";

  if (has("declar", "cotis", "paye", "paiement", "payment", "contribut", "declare"))
    return fr
      ? "Pour déclarer : va dans « Déclarer », écris par exemple « J'ai payé 20000 pour Cheikh », l'IA extrait montant et bénéficiaire, puis confirme. Un reçu marche aussi via l'onglet OCR."
      : "To declare: open “Declare”, type e.g. “I paid 20000 for Cheikh” — AI extracts amount and recipient, then confirm. Receipts work too via the OCR tab.";

  if (has("ocr", "recu", "reçu", "receipt", "wave", "orange", "capture", "screenshot", "mtn"))
    return fr
      ? "Onglet « Reçu Mobile Money » : dépose ta capture Wave / Orange Money / MTN. Bedrock Vision en extrait montant, ID transaction et date (confiance ~93 %), puis tu confirmes."
      : "Open the “Mobile Money receipt” tab and drop your Wave / Orange Money / MTN screenshot. Bedrock Vision extracts amount, transaction ID and date (~93% confidence), then you confirm.";

  if (has("retard", "late", "relance", "rappel", "reminder", "nudge", "impaye", "ibrahima", "modou", "swap", "echange", "échange", "mediation", "médiation"))
    return fr
      ? "Les retards sont suivis dans « Alertes » : relance douce, proposition d'étalement ou d'échange de tour, puis recours à la caisse de secours. Ibrahima (3 retards) est le cas typique : étalement 10 000 + 10 000 proposé."
      : "Late payments live under “Alerts”: gentle nudge, installment or tour-swap proposal, then emergency-fund cover. Ibrahima (3 lates) is the typical case — a 10,000 + 10,000 plan is proposed.";

  if (has("caisse", "secours", "emergency", "fund", "flex", "reserve"))
    return fr
      ? "La caisse de secours (Tontine Flex, 60 000 FCFA) peut couvrir temporairement un retard critique — ex. les 20 000 FCFA d'Ibrahima pour débloquer Cheikh — avec remboursement attendu sur 2 cycles."
      : "The emergency fund (Tontine Flex, 60,000 FCFA) can temporarily cover a critical late payment — e.g. Ibrahima's 20,000 FCFA to release Cheikh — with repayment expected over 2 cycles.";

  if (has("rotation", "ordre", "order", "tour", "trust", "confiance", "score", "ponctual"))
    return fr
      ? "L'ordre IA classe par score de confiance puis antécédents de retard : profils fiables tôt, retards récurrents plus tard. Vois « Membres » pour les scores et « Nouveau groupe » pour simuler un ordre."
      : "AI rotation ranks by trust score then late history: reliable profiles early, recurring lates later. Check “Members” for scores and “New group” to simulate an order.";

  if (has("export", "csv", "pdf", "registre", "ledger", "imprim"))
    return fr
      ? "Page « Exporter » : télécharge le registre complet en CSV ou un aperçu imprimable — pratique pour couper court aux disputes (« j'ai payé / non tu n'as pas payé »)."
      : "Open the “Export” page: download the full ledger as CSV or a printable preview — handy to settle “I paid / no you didn't” disputes.";

  if (has("audio", "digest", "bilan", "ecouter", "écouter", "polly", "voix", "voice", "listen"))
    return fr
      ? "Le digest audio lit le bilan du cycle à voix haute (démo style Polly) — bouton « Écouter » sur le dashboard et la page Alertes. Inclusif pour les membres peu alphabétisés."
      : "The audio digest reads the cycle summary aloud (Polly-style demo) — the “Play” button on Dashboard and Alerts. Inclusive for low-literacy members.";

  if (has("membre", "member", "ajouter", "add", "email", "mail"))
    return fr
      ? "Membres dans « Membres » (scores visibles). Pour créer un groupe : « Nouveau groupe » — nom, montant, membres avec e-mail/téléphone et antécédents, puis ordre IA recommandé."
      : "Members live under “Members” (visible scores). To create a group: “New group” — name, amount, members with email/phone and history, then the recommended AI order.";

  if (has("groupe", "group", "gerer", "gérer", "manage", "switch", "bascul", "changer", "plusieurs", "multiple", "archive"))
    return fr
      ? "Page « Groupes » : recherche un groupe, ouvre-le pour en faire le groupe actif du dashboard, archive ceux en pause ou supprime les brouillons. « Nouveau groupe » l'ajoute et l'active aussitôt."
      : "Open the “Groups” page: search a group, open it to make it the dashboard's active group, archive paused ones or delete drafts. “New group” adds and activates it right away.";

  if (has("montant", "amount", "combien", "how much", "20000", "20 000", "fcfa"))
    return fr
      ? "La cotisation est de 20 000 FCFA / mois, 12 membres → 240 000 FCFA attendus par cycle. Ce cycle : 200 000 collectés (83 %). Bénéficiaire : Cheikh Fall."
      : "Contribution is 20,000 FCFA / month, 12 members → 240,000 FCFA expected per cycle. This cycle: 200,000 collected (83%). Recipient: Cheikh Fall.";

  if (has("aide", "help", "que peux", "what can", "comment", "how", "ou", "où", "where"))
    return fr
      ? "Je peux aider sur : déclarer une cotisation, lire un reçu OCR, comprendre un retard, la caisse de secours, l'ordre de rotation, l'export, le digest audio. Dis-moi ce qui bloque !"
      : "I can help with: declaring a contribution, reading an OCR receipt, understanding a late payment, the emergency fund, rotation order, export, audio digest. Tell me what's blocking!";

  if (has("merci", "thanks", "thank"))
    return fr ? "Avec plaisir ! Autre question ?" : "You're welcome! Anything else?";

  return fr
    ? "Hmm, je n'ai pas bien saisi (démo locale, pas de Bedrock ici). Essaie : « comment déclarer ? », « un retard ? », « caisse de secours ? », « ordre de rotation ? » ou « export ? »."
    : "Hmm, I didn't quite get that (local demo, no Bedrock here). Try: “how to declare?”, “a late payment?”, “emergency fund?”, “rotation order?” or “export?”.";
}

const SUGGESTIONS_FR = ["Comment déclarer ?", "Un retard ?", "Caisse de secours ?"];
const SUGGESTIONS_EN = ["How to declare?", "A late payment?", "Emergency fund?"];

function renderInline(text: string, key: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*\n]+\*|`[^`]+`)/g);
  if (parts.length === 1) return <Fragment key={key}>{text}</Fragment>;
  return (
    <Fragment key={key}>
      {parts.map((p, i) => {
        if (p.length > 4 && p.startsWith("**") && p.endsWith("**"))
          return <strong key={i}>{p.slice(2, -2)}</strong>;
        if (p.length > 2 && p.startsWith("*") && p.endsWith("*") && !p.startsWith("**"))
          return <em key={i}>{p.slice(1, -1)}</em>;
        if (p.length > 2 && p.startsWith("`") && p.endsWith("`"))
          return (
            <code key={i} className="rounded bg-background/60 px-1 font-mono text-[12px]">
              {p.slice(1, -1)}
            </code>
          );
        return <Fragment key={i}>{p}</Fragment>;
      })}
    </Fragment>
  );
}

// Tiny markdown renderer for bot replies (bold, italic, code, headings,
// - / 1. lists, blank lines). No raw HTML is ever injected.
function renderRich(text: string): React.ReactNode {
  const lines = text.split("\n");
  const blocks: React.ReactNode[] = [];
  let list: string[] = [];
  const flushList = (key: string) => {
    if (!list.length) return;
    blocks.push(
      <ul key={key} className="ml-4 list-disc space-y-0.5">
        {list.map((item, i) => (
          <li key={i}>{renderInline(item, `li-${i}`)}</li>
        ))}
      </ul>
    );
    list = [];
  };
  lines.forEach((line, i) => {
    const item = line.match(/^\s*(?:[-*•]|\d+[.)])\s+(.*)$/);
    if (item) {
      list.push(item[1]);
      return;
    }
    flushList(`ul-${i}`);
    const heading = line.match(/^#{1,3}\s+(.*)$/);
    if (heading) {
      blocks.push(
        <p key={i} className="font-semibold">
          {renderInline(heading[1], `h-${i}`)}
        </p>
      );
    } else if (line.trim() === "") {
      blocks.push(<div key={i} className="h-1.5" />);
    } else {
      blocks.push(<p key={i}>{renderInline(line, `p-${i}`)}</p>);
    }
  });
  flushList("ul-end");
  return <div className="space-y-1">{blocks}</div>;
}

export function AssistantChat() {
  const { locale } = useLocale();
  const fr = locale === "fr";
  const [open, setOpen] = useState(false);
  const [typing, setTyping] = useState(false);
  const [seen, setSeen] = useState(true);
  const [input, setInput] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([
    {
      id: 0,
      from: "bot",
      text: fr
        ? "Salut ! Une question sur ta tontine ? Je peux guider pas à pas."
        : "Hi! Any question about your tontine? I can walk you through.",
    },
  ]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- re-localize greeting on language switch
    setMsgs((prev) =>
      prev.length === 1 && prev[0].id === 0
        ? [
            {
              id: 0,
              from: "bot",
              text: fr
                ? "Salut ! Une question sur ta tontine ? Je peux guider pas à pas."
                : "Hi! Any question about your tontine? I can walk you through.",
            },
          ]
        : prev
    );
  }, [fr]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [msgs, typing, open]);

  async function send(text: string) {
    const clean = text.trim();
    if (!clean || typing) return;
    const userMsg: Msg = { id: idc++, from: "user", text: clean };
    setMsgs((m) => [...m, userMsg]);
    setInput("");
    setTyping(true);
    const reply = (t: string) => {
      setMsgs((m) => [...m, { id: idc++, from: "bot", text: t }]);
      setTyping(false);
    };
    // Live AI first, local brain as fallback (offline / demo mode).
    if (isBackendEnabled()) {
      try {
        const history = [...msgs, userMsg].slice(-7, -1).map((m) => ({
          role: m.from === "user" ? "user" : "assistant",
          text: m.text,
        }));
        const res = await client.queries.askAssistant({
          question: clean,
          locale,
          history: JSON.stringify(history),
        });
        if (!res.errors?.length && res.data?.answer?.trim()) {
          reply(res.data.answer.trim());
          return;
        }
      } catch {
        // fall through to local brain
      }
    }
    window.setTimeout(() => reply(answer(clean, fr)), 650);
  }

  const suggestions = fr ? SUGGESTIONS_FR : SUGGESTIONS_EN;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="shadow-elevate-high flex h-[min(520px,70vh)] w-[min(92vw,380px)] flex-col overflow-hidden rounded-2xl border border-border bg-bg-raised"
            role="dialog"
            aria-label={fr ? "Assistant Tonti" : "Tonti assistant"}
          >
            <div className="flex items-center gap-3 border-b border-border bg-bg-overlay/60 px-4 py-3">
              <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-accent via-fuchsia to-cyan text-white">
                <Sparkles className="h-4 w-4" />
                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-bg-raised bg-ok" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold leading-tight">Tonti</p>
                <p className="text-[11px] text-ok">
                  {fr ? "En ligne · répond vite" : "Online · replies fast"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-muted transition-colors hover:bg-bg-subtle hover:text-foreground"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div data-testid="dw-chat" className="scrollbar-thin flex-1 space-y-3 overflow-y-auto px-4 py-4">
              {msgs.map((m) => (
                <div
                  key={m.id}
                  className={cn("flex", m.from === "user" ? "justify-end" : "justify-start")}
                >
                  <div
                    className={cn(
                      "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed",
                      m.from === "user"
                        ? "rounded-br-md bg-accent text-white"
                        : "rounded-bl-md border border-border bg-bg-subtle/60 text-foreground"
                    )}
                  >
                    {m.from === "user" ? m.text : renderRich(m.text)}
                  </div>
                </div>
              ))}
              {typing && (
                <div className="flex justify-start">
                  <span className="flex items-center gap-1 rounded-2xl rounded-bl-md border border-border bg-bg-subtle/60 px-3.5 py-3">
                    {[0, 1, 2].map((i) => (
                      <motion.span
                        key={i}
                        className="h-1.5 w-1.5 rounded-full bg-muted"
                        animate={{ opacity: [0.3, 1, 0.3], y: [0, -2, 0] }}
                        transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
                      />
                    ))}
                  </span>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            <div className="border-t border-border px-3 pb-3 pt-2">
              <div className="mb-2 flex flex-wrap gap-1.5">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => send(s)}
                    className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted transition-colors hover:border-accent/40 hover:text-foreground"
                  >
                    {s}
                  </button>
                ))}
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  send(input);
                }}
                className="flex items-center gap-2"
              >
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={fr ? "Écris ta question…" : "Type your question…"}
                  className="min-w-0 flex-1 rounded-xl border border-border bg-background/60 px-3 py-2.5 text-sm outline-none transition-colors placeholder:text-muted/60 focus:border-accent/40 focus:ring-1 focus:ring-accent/30"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || typing}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent text-white transition-opacity disabled:opacity-40"
                  aria-label="Send"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          setSeen(true);
        }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="relative flex h-14 w-14 items-center justify-center rounded-full border border-border bg-bg-raised text-accent-hover shadow-elevate-high transition-colors hover:border-accent/40"
        aria-label={fr ? "Ouvrir l'assistant" : "Open assistant"}
      >
        {!seen && !open && (
          <span className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-danger opacity-75" />
            <span className="relative inline-flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 border-background bg-danger text-[8px] font-bold">
              1
            </span>
          </span>
        )}
        {open ? <X className="h-6 w-6" /> : <Sparkles className="h-6 w-6" />}
      </motion.button>
    </div>
  );
}
