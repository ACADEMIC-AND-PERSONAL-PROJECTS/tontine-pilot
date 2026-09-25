// Pure digest-script composer (cycle stats -> FR/EN script).
// Testable without AWS; handler in digest-audio/handler.ts calls this.
export function scriptFor(
  locale: string,
  cycleNumber: number,
  groupName: string,
  recipient: string,
  collected: number,
  expected: number,
  ok: number,
  late: number,
  pending: number,
  fund: number
) {
  if (locale === "en")
    return `Cycle ${cycleNumber} summary, ${groupName}. Recipient: ${recipient}. Collected: ${collected} FCFA of ${expected}. ${ok} members paid, ${late} late, ${pending} pending. Emergency fund: ${fund} FCFA.`;
  return `Bilan cycle ${cycleNumber}, ${groupName}. Bénéficiaire : ${recipient}. Collecté : ${collected} francs CFA sur ${expected}. ${ok} membres à jour, ${late} en retard, ${pending} en attente. Caisse de secours : ${fund} francs.`;
}
