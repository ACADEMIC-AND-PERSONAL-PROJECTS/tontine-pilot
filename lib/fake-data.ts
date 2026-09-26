export interface Member {
  id: string;
  name: string;
  phone: string;
  email: string;
  joinedAt: string;
  avatar?: string;
  trustScore: number;
  lateCount?: number;
  cyclesCompleted?: number;
}

export interface Contribution {
  id: string;
  memberId: string;
  memberName: string;
  amount: number;
  status: "CONFIRMED" | "PENDING" | "LATE" | "COVERED_BY_EMERGENCY_FUND";
  dateDeclared: string;
  rawText: string;
  rawTextEn?: string;
  method?: "TEXT_NLU" | "OCR_RECEIPT" | "MANUAL" | "EMERGENCY_FUND";
  transactionId?: string;
}

export interface Cycle {
  id: string;
  cycleNumber: number;
  recipientMemberId: string;
  recipientName: string;
  startDate: string;
  endDate: string;
  status: "OPEN" | "CLOSED";
  totalExpected: number;
  totalCollected: number;
}

export interface Alert {
  id: string;
  memberId: string;
  memberName: string;
  type:
    | "LATE_PAYMENT"
    | "ANOMALY"
    | "REMINDER"
    | "SWAP_PROPOSAL"
    | "EMERGENCY_DISPATCH";
  message: string;
  messageEn?: string;
  createdAt: string;
  resolved: boolean;
  proposal?: {
    kind: "swap" | "installment" | "emergency";
    details: string;
    detailsEn?: string;
    withMemberName?: string;
  };
}

export interface Group {
  id: string;
  name: string;
  description: string;
  descriptionEn?: string;
  currency: string;
  contributionAmount: number;
  frequency: "WEEKLY" | "MONTHLY";
  memberCount: number;
  currentCycleIndex: number;
  createdAt: string;
  emergencyFundBalance: number;
  emergencyFundTarget: number;
  role?: "Admin" | "Member";
  startDate?: string;
  endDate?: string;
  cycleCollected?: number;
  cycleExpected?: number;
  openAlerts?: number;
  archived?: boolean;
}

export const fakeGroup: Group = {
  id: "group-1",
  name: "Tontine Quartier Liberté",
  description:
    "Association d'épargne solidaire entre voisins du quartier Liberté",
  descriptionEn: "Community savings group with neighbours from Liberté district",
  currency: "FCFA",
  contributionAmount: 20000,
  frequency: "MONTHLY",
  memberCount: 12,
  currentCycleIndex: 4,
  createdAt: "2024-01-15",
  emergencyFundBalance: 60000,
  emergencyFundTarget: 120000,
  startDate: "2024-09-01",
  endDate: "2024-12-31",
  role: "Admin",
  cycleCollected: 200000,
  cycleExpected: 240000,
  openAlerts: 5,
};

export const seedGroups: Group[] = [
  fakeGroup,
  {
    id: "group-2",
    name: "Tontine Amitié Mermoz",
    description: "Petite tontine entre amis du quartier Mermoz",
    descriptionEn: "Small tontine with friends from Mermoz district",
    currency: "FCFA",
    contributionAmount: 15000,
    frequency: "MONTHLY",
    memberCount: 8,
    currentCycleIndex: 2,
    createdAt: "2024-03-10",
    emergencyFundBalance: 15000,
    emergencyFundTarget: 60000,
    role: "Admin",
    cycleCollected: 90000,
    cycleExpected: 120000,
    openAlerts: 2,
  },
  {
    id: "group-3",
    name: "Tontine Famille Wade",
    description: "Tontine familiale, cotisations hebdomadaires",
    descriptionEn: "Family tontine with weekly contributions",
    currency: "FCFA",
    contributionAmount: 10000,
    frequency: "WEEKLY",
    memberCount: 6,
    currentCycleIndex: 6,
    createdAt: "2023-11-05",
    emergencyFundBalance: 30000,
    emergencyFundTarget: 30000,
    role: "Member",
    cycleCollected: 60000,
    cycleExpected: 60000,
    openAlerts: 0,
  },
];

export const fakeMembers: Member[] = [
  {
    id: "m1",
    name: "Aïssatou Diallo",
    phone: "+221 77 123 45 67",
    email: "aissatou.diallo@exemple.sn",
    joinedAt: "2024-01-15",
    trustScore: 98,
    lateCount: 0,
  },
  {
    id: "m2",
    name: "Moussa Ndiaye",
    phone: "+221 76 234 56 78",
    email: "moussa.ndiaye@exemple.sn",
    joinedAt: "2024-01-15",
    trustScore: 95,
    lateCount: 0,
  },
  {
    id: "m3",
    name: "Awa Sarr",
    phone: "+221 78 345 67 89",
    email: "awa.sarr@exemple.sn",
    joinedAt: "2024-01-15",
    trustScore: 92,
    lateCount: 1,
  },
  {
    id: "m4",
    name: "Cheikh Fall",
    phone: "+221 77 456 78 90",
    email: "cheikh.fall@exemple.sn",
    joinedAt: "2024-01-15",
    trustScore: 88,
    lateCount: 1,
  },
  {
    id: "m5",
    name: "Fatou Mbaye",
    phone: "+221 76 567 89 01",
    email: "fatou.mbaye@exemple.sn",
    joinedAt: "2024-01-20",
    trustScore: 96,
    lateCount: 0,
  },
  {
    id: "m6",
    name: "Ibrahima Sow",
    phone: "+221 78 678 90 12",
    email: "ibrahima.sow@exemple.sn",
    joinedAt: "2024-01-20",
    trustScore: 72,
    lateCount: 3,
  },
  {
    id: "m7",
    name: "Mariama Kane",
    phone: "+221 77 789 01 23",
    email: "mariama.kane@exemple.sn",
    joinedAt: "2024-01-25",
    trustScore: 94,
    lateCount: 0,
  },
  {
    id: "m8",
    name: "Ousmane Diop",
    phone: "+221 76 890 12 34",
    email: "ousmane.diop@exemple.sn",
    joinedAt: "2024-01-25",
    trustScore: 90,
    lateCount: 1,
  },
  {
    id: "m9",
    name: "Khadija Touré",
    phone: "+221 78 901 23 45",
    email: "khadija.toure@exemple.sn",
    joinedAt: "2024-02-01",
    trustScore: 97,
    lateCount: 0,
  },
  {
    id: "m10",
    name: "Amadou Ba",
    phone: "+221 77 012 34 56",
    email: "amadou.ba@exemple.sn",
    joinedAt: "2024-02-01",
    trustScore: 86,
    lateCount: 1,
  },
  {
    id: "m11",
    name: "Bineta Sy",
    phone: "+221 76 123 45 67",
    email: "bineta.sy@exemple.sn",
    joinedAt: "2024-02-05",
    trustScore: 93,
    lateCount: 0,
  },
  {
    id: "m12",
    name: "Modou Gueye",
    phone: "+221 78 234 56 78",
    email: "modou.gueye@exemple.sn",
    joinedAt: "2024-02-05",
    trustScore: 89,
    lateCount: 1,
  },
];

/** AI-style rotation: high trust early, risk profiles last. */
export function recommendRotationOrder(members: Member[] = fakeMembers) {
  return [...members].sort((a, b) => {
    if (b.trustScore !== a.trustScore) return b.trustScore - a.trustScore;
    const lateDiff = (a.lateCount ?? 0) - (b.lateCount ?? 0);
    if (lateDiff !== 0) return lateDiff;
    return (b.cyclesCompleted ?? 0) - (a.cyclesCompleted ?? 0);
  });
}

export const currentCycle: Cycle = {
  id: "cycle-4",
  cycleNumber: 4,
  recipientMemberId: "m4",
  recipientName: "Cheikh Fall",
  startDate: "2024-09-01",
  endDate: "2024-09-30",
  status: "OPEN",
  totalExpected: 240000,
  totalCollected: 200000,
};

export const fakeContributions: Contribution[] = [
  {
    id: "c1",
    memberId: "m1",
    memberName: "Aïssatou Diallo",
    amount: 20000,
    status: "CONFIRMED",
    dateDeclared: "2024-09-02",
    rawText: "J'ai payé mes 20000 pour Cheikh",
    rawTextEn: "I paid my 20,000 for Cheikh",
    method: "TEXT_NLU",
  },
  {
    id: "c2",
    memberId: "m2",
    memberName: "Moussa Ndiaye",
    amount: 20000,
    status: "CONFIRMED",
    dateDeclared: "2024-09-03",
    rawText: "Cotisation payée 20k",
    rawTextEn: "Contribution paid 20k",
    method: "OCR_RECEIPT",
    transactionId: "WV-884021",
  },
  {
    id: "c3",
    memberId: "m3",
    memberName: "Awa Sarr",
    amount: 20000,
    status: "CONFIRMED",
    dateDeclared: "2024-09-05",
    rawText: "Payé pour ce mois",
    rawTextEn: "Paid for this month",
    method: "TEXT_NLU",
  },
  {
    id: "c4",
    memberId: "m5",
    memberName: "Fatou Mbaye",
    amount: 20000,
    status: "CONFIRMED",
    dateDeclared: "2024-09-06",
    rawText: "Vingt mille versés",
    rawTextEn: "Twenty thousand paid",
    method: "OCR_RECEIPT",
    transactionId: "OM-229104",
  },
  {
    id: "c5",
    memberId: "m7",
    memberName: "Mariama Kane",
    amount: 20000,
    status: "CONFIRMED",
    dateDeclared: "2024-09-08",
    rawText: "Ma part du mois payée",
    rawTextEn: "My share for the month paid",
    method: "TEXT_NLU",
  },
  {
    id: "c6",
    memberId: "m8",
    memberName: "Ousmane Diop",
    amount: 20000,
    status: "CONFIRMED",
    dateDeclared: "2024-09-10",
    rawText: "J'ai donné 20000 à Aïssatou pour Cheikh",
    rawTextEn: "I gave 20,000 to Aïssatou for Cheikh",
    method: "TEXT_NLU",
  },
  {
    id: "c7",
    memberId: "m9",
    memberName: "Khadija Touré",
    amount: 20000,
    status: "CONFIRMED",
    dateDeclared: "2024-09-12",
    rawText: "Cotisation septembre OK",
    rawTextEn: "September contribution OK",
    method: "OCR_RECEIPT",
    transactionId: "WV-901122",
  },
  {
    id: "c8",
    memberId: "m11",
    memberName: "Bineta Sy",
    amount: 20000,
    status: "CONFIRMED",
    dateDeclared: "2024-09-14",
    rawText: "Payé ma cotisation",
    rawTextEn: "Paid my contribution",
    method: "MANUAL",
  },
  {
    id: "c9",
    memberId: "m4",
    memberName: "Cheikh Fall",
    amount: 20000,
    status: "CONFIRMED",
    dateDeclared: "2024-09-15",
    rawText: "Mes 20k versés même si c'est mon tour",
    rawTextEn: "My 20k paid even though it's my turn",
    method: "TEXT_NLU",
  },
  {
    id: "c10",
    memberId: "m10",
    memberName: "Amadou Ba",
    amount: 20000,
    status: "CONFIRMED",
    dateDeclared: "2024-09-18",
    rawText: "Vingt mille payés",
    rawTextEn: "Twenty thousand paid",
    method: "TEXT_NLU",
  },
  {
    id: "c11",
    memberId: "m6",
    memberName: "Ibrahima Sow",
    amount: 0,
    status: "LATE",
    dateDeclared: "",
    rawText: "",
  },
  {
    id: "c12",
    memberId: "m12",
    memberName: "Modou Gueye",
    amount: 0,
    status: "PENDING",
    dateDeclared: "",
    rawText: "",
  },
];

export const fakeAlerts: Alert[] = [
  {
    id: "a1",
    memberId: "m6",
    memberName: "Ibrahima Sow",
    type: "LATE_PAYMENT",
    message:
      "Ibrahima, rappel amical : ta cotisation de 20 000 FCFA pour le cycle de septembre est en retard. Peux-tu régulariser rapidement ? Merci !",
    messageEn:
      "Ibrahima, friendly reminder: your 20,000 FCFA contribution for the September cycle is late. Can you settle it soon? Thank you!",
    createdAt: "2024-09-20",
    resolved: false,
    proposal: {
      kind: "installment",
      details: "Étalement proposé : 10 000 FCFA cette semaine, 10 000 la suivante.",
      detailsEn: "Proposed plan: 10,000 FCFA this week, 10,000 next.",
    },
  },
  {
    id: "a2",
    memberId: "m12",
    memberName: "Modou Gueye",
    type: "REMINDER",
    message:
      "Modou, n'oublie pas : la date limite pour ta cotisation de septembre approche (30 septembre). Merci de payer avant la fin du mois.",
    messageEn:
      "Modou, don't forget: the deadline for your September contribution is near (September 30). Please pay before month end.",
    createdAt: "2024-09-22",
    resolved: false,
  },
  {
    id: "a3",
    memberId: "m6",
    memberName: "Ibrahima Sow",
    type: "ANOMALY",
    message:
      "Ibrahima Sow présente un pattern de retard récurrent : 3 retards sur les 4 derniers cycles. Il serait bon de discuter avec lui pour comprendre sa situation.",
    messageEn:
      "Ibrahima Sow shows a recurring late pattern: 3 late payments over the last 4 cycles. Worth checking in to understand his situation.",
    createdAt: "2024-09-15",
    resolved: false,
  },
  {
    id: "a4",
    memberId: "m6",
    memberName: "Ibrahima Sow",
    type: "SWAP_PROPOSAL",
    message:
      "Médiation IA : Ibrahima signale une difficulté temporaire. Proposition d'échanger son prochain tour (cycle 7) avec Fatou Mbaye (trust 96), qui accepte de recevoir plus tôt.",
    messageEn:
      "AI mediation: Ibrahima reports a temporary difficulty. Proposal to swap his upcoming turn (cycle 7) with Fatou Mbaye (trust 96), who agrees to receive earlier.",
    createdAt: "2024-09-21",
    resolved: false,
    proposal: {
      kind: "swap",
      details: "Échange de tour : Ibrahima ↔ Fatou (cycle 7 ↔ cycle 5).",
      detailsEn: "Tour swap: Ibrahima ↔ Fatou (cycle 7 ↔ cycle 5).",
      withMemberName: "Fatou Mbaye",
    },
  },
  {
    id: "a5",
    memberId: "m6",
    memberName: "Ibrahima Sow",
    type: "EMERGENCY_DISPATCH",
    message:
      "Pour débloquer le versement de Cheikh sans attendre : la caisse de secours (60 000 FCFA) peut couvrir temporairement les 20 000 FCFA d'Ibrahima. Remboursement attendu sur 2 cycles.",
    messageEn:
      "To release Cheikh's payout without waiting: the emergency fund (60,000 FCFA) can temporarily cover Ibrahima's 20,000 FCFA. Repayment expected over 2 cycles.",
    createdAt: "2024-09-23",
    resolved: false,
    proposal: {
      kind: "emergency",
      details: "Débit caisse de secours : 20 000 FCFA · solde restant 40 000 FCFA.",
      detailsEn: "Emergency fund debit: 20,000 FCFA · remaining balance 40,000 FCFA.",
    },
  },
];

export const audioDigestScript = {
  fr: `Bilan cycle 4, Tontine Quartier Liberté. Bénéficiaire : Cheikh Fall. Collecté : 200 000 francs CFA sur 240 000. 10 membres à jour, 1 en retard, 1 en attente. Caisse de secours : 60 000 francs. Le médiateur propose un étalement pour Ibrahima et un éventuel recours à la caisse de secours.`,
  en: `Cycle 4 summary, Liberté neighborhood tontine. Recipient: Cheikh Fall. Collected: 200,000 FCFA of 240,000. 10 members paid, 1 late, 1 pending. Emergency fund: 60,000 FCFA. The mediator proposes an installment plan for Ibrahima and optional emergency cover.`,
};

export const pastCycles: Cycle[] = [
  {
    id: "cycle-1",
    cycleNumber: 1,
    recipientMemberId: "m1",
    recipientName: "Aïssatou Diallo",
    startDate: "2024-06-01",
    endDate: "2024-06-30",
    status: "CLOSED",
    totalExpected: 240000,
    totalCollected: 240000,
  },
  {
    id: "cycle-2",
    cycleNumber: 2,
    recipientMemberId: "m2",
    recipientName: "Moussa Ndiaye",
    startDate: "2024-07-01",
    endDate: "2024-07-31",
    status: "CLOSED",
    totalExpected: 240000,
    totalCollected: 240000,
  },
  {
    id: "cycle-3",
    cycleNumber: 3,
    recipientMemberId: "m3",
    recipientName: "Awa Sarr",
    startDate: "2024-08-01",
    endDate: "2024-08-31",
    status: "CLOSED",
    totalExpected: 240000,
    totalCollected: 220000,
  },
];

export const stats = {
  totalMembers: 12,
  totalCollected: 700000,
  completionRate: 96,
  activeAlerts: 5,
};

/** Locale-aware helpers — demo content is authored in FR, translated to EN. */
export function contributionText(c: Contribution, locale: string = "fr") {
  if (locale === "en") return c.rawTextEn ?? c.rawText;
  return c.rawText;
}

export function alertMessageText(a: Alert, locale: string = "fr") {
  if (locale === "en") return a.messageEn ?? a.message;
  return a.message;
}

export function alertProposalText(
  a: Alert,
  locale: string = "fr"
): string | undefined {
  if (!a.proposal) return undefined;
  if (locale === "en") return a.proposal.detailsEn ?? a.proposal.details;
  return a.proposal.details;
}

export function groupDescriptionText(g: Group, locale: string = "fr") {
  if (locale === "en") return g.descriptionEn ?? g.description;
  return g.description;
}

/** Simulated Wave / Orange Money OCR result for demo. */
export function fakeOcrReceipt(fileName: string) {
  const wave = /wave|wv/i.test(fileName);
  return {
    amount: 20000,
    transactionId: wave ? "WV-991204" : "OM-441882",
    recipientName: "Cheikh Fall",
    date: "2024-09-24",
    isSuccessful: true,
    provider: wave ? "Wave" : "Orange Money",
    confidence: 0.93,
  };
}
