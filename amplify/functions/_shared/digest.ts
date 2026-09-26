// Pure digest-script composer (cycle stats -> FR/EN script).
// Testable without AWS; handler in digest-audio/handler.ts calls this.
export function daysLeft(endDate: string | undefined, today = new Date()): number | null {
  if (!endDate) return null;
  const ms = new Date(endDate + "T23:59:59Z").getTime() - today.getTime();
  return Math.max(0, Math.ceil(ms / 86400000));
}

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
  fund: number,
  groupEndDate?: string
) {
  const left = daysLeft(groupEndDate);
  const deadlineFr =
    groupEndDate && left !== null
      ? ` Échéance de la tontine : le ${groupEndDate} — plus que ${left} jour${left > 1 ? "s" : ""}.`
      : "";
  const deadlineEn =
    groupEndDate && left !== null
      ? ` Tontine deadline: ${groupEndDate} — ${left} day${left === 1 ? "" : "s"} left.`
      : "";
  if (locale === "en")
    return `Cycle ${cycleNumber} summary, ${groupName}. Recipient: ${recipient}. Collected: ${collected} FCFA of ${expected}. ${ok} members paid, ${late} late, ${pending} pending. Emergency fund: ${fund} FCFA.${deadlineEn}`;
  return `Bilan cycle ${cycleNumber}, ${groupName}. Bénéficiaire : ${recipient}. Collecté : ${collected} francs CFA sur ${expected}. ${ok} membres à jour, ${late} en retard, ${pending} en attente. Caisse de secours : ${fund} francs.${deadlineFr}`;
}
