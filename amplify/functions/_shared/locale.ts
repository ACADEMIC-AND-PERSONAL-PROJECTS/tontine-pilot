// Message-language detection (reply follows the user, not the UI).
// The reply language follows the USER'S MESSAGE, not the UI locale:
// a French speaker on the English UI still gets French answers.
export function detectLocale(question: string, fallback: string): string {
  const q = question.toLowerCase();
  const frHits = (
    q.match(/[àâäéèêëîïôöùûüçœæ]/g) ?? []
  ).length;
  const frWords = (
    q.match(
      /\b(bonjour|salut|merci|comment|quoi|pourquoi|est-ce|quelqu|quelle?s?|comment|pour|avec|dans|une?|des?|les?|est|sont|pas|plus|tres|toute?s?|votre|notre|mon|ma|mes|je|tu|vous|nous|ils?|elles?|faire|voir|avoir|être|quand|comment|combien|pourquoi|parce|stp|svp|cest|ya|jai|peux|dois|faut|ya t-il)\b/g
    ) ?? []
  ).length;
  const enWords = (
    q.match(
      /\b(hello|hi|thanks|please|how|what|when|where|which|who|the|and|for|with|you|your|are|is|do|does|can|could|should|would|there|here|this|that|about|from|have|has|my|we|they|show|tell|explain|help)\b/g
    ) ?? []
  ).length;
  if (frHits >= 2 || frWords > enWords) return "fr";
  if (enWords > frWords) return "en";
  return fallback;
}


