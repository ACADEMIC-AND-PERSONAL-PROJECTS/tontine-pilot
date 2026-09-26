import { readFile } from 'node:fs/promises'
import { defineDemo } from '@matte97p/demowright'

// Full product tour, French captions + Léa voiceovers (public/voiceover/scene-NN.mp3).
// Audio length caps each scene: caption duration ~= voiceover + action buffer.
// Secrets via env only: DEMO_EMAIL / DEMO_PASSWORD.
//   npm run dev  (port 3101)  →  npx demowright run demowright.config.js -o output/demo.mp4
//   npx demowright run demowright.config.js --dry-run   (validate only)

const SAY = {
  s1: "Bienvenue sur TontinePilot. Le tableau de bord montre la collecte du cycle, qui a payé, et qui doit encore payer.",
  s2: "Gérez plusieurs tontines : basculez de groupe, archivez celles en pause, créez-en de nouvelles.",
  s3: "Créer un groupe prend deux minutes : nom, cotisation, membres avec e-mails et antécédents, ordre IA, confirmation.",
  s4: "Déclarez en langage naturel. Écrivez : j'ai payé vingt-mille pour Awa. L'IA extrait le montant et le bénéficiaire.",
  s5: "Ou déposez une capture Wave ou Orange Money : montant, identifiant et date sont extraits automatiquement.",
  s6: "Chaque membre a un score de confiance. Les profils fiables passent tôt, les retards récurrents plus tard.",
  s7: "Les retards déclenchent des relances empathiques. Et le digest audio lit le bilan du cycle à voix haute.",
  s8: "Exportez le registre complet en CSV. Fini, les disputes sur qui a payé.",
  s9: "Et Tonti, l'assistant, répond à vos questions et relance les membres pour vous.",
}

async function synthesize(text) {
  const { readFile } = await import('node:fs/promises')
  const { execSync } = await import('node:child_process')
  const entry = Object.entries(SAY).find(([, v]) => v === text)
  if (!entry) throw new Error('no voiceover for: ' + text.slice(0, 40))
  const idx = entry[0].replace('s', '')
  return readFile(`public/voiceover/scene-${idx}.mp3`)
}

export default defineDemo({
  name: 'tontine-pilot-tour',
  url: 'http://localhost:3101/dashboard',
  viewport: { width: 1280, height: 720 },
  theme: { accent: '#8B5CF6' },
  init: "try{localStorage.setItem('tp-locale','fr')}catch(e){}",
  formats: ['landscape'],
  auth: {
    url: 'http://localhost:3101/login',
    fields: [
      { selector: 'input[type="email"]', env: 'DEMO_EMAIL' },
      { selector: 'input[type="password"]', env: 'DEMO_PASSWORD' },
    ],
    submit: 'text=Se connecter',
    waitUrl: '**/dashboard**',
    after: ['text=Français'],
  },
  voice: synthesize,
  steps: [
    // 1 — dashboard (~14s)
    { type: 'caption', text: 'Le tableau de bord : collecte, cotisations, caisse.', say: SAY.s1, duration: 7500 },
    { type: 'highlight', selector: '[data-testid="dw-contributions"]', duration: 1800 },
    { type: 'zoom', selector: 'main', scale: 1.12 },
    { type: 'wait', duration: 2500 },
    { type: 'zoomReset' },
    // 2 — groups (~10s)
    { type: 'goto', url: 'http://localhost:3101/groups' },
    { type: 'caption', text: 'Plusieurs tontines, un seul pilote.', say: SAY.s2, duration: 6000 },
    { type: 'highlight', selector: '[data-testid="dw-groups"]', duration: 2000 },
    { type: 'wait', duration: 1500 },
    // 3 — group/new (~11s)
    { type: 'goto', url: 'http://localhost:3101/group/new' },
    { type: 'caption', text: 'Créer un groupe en cinq étapes.', say: SAY.s3, duration: 7800 },
    { type: 'highlight', selector: '[data-testid="dw-declare"]', duration: 1800 },
    { type: 'wait', duration: 1200 },
    // 4 — declare text (~18s, no confirm: demo writes nothing)
    { type: 'goto', url: 'http://localhost:3101/declare' },
    { type: 'caption', text: 'Déclarez en langage naturel.', say: SAY.s4, duration: 8000 },
    { type: 'type', selector: 'textarea', text: "J'ai payé 20000 pour Awa ce mois", perChar: 28 },
    { type: 'click', selector: '[data-testid="dw-parse"]' },
    { type: 'wait', selector: '[data-testid="dw-declare"] dl', timeout: 20000 },
    { type: 'highlight', selector: 'text=Résultat structuré', duration: 2200 },
    // 5 — declare OCR tab (~9s)
    { type: 'click', selector: '[data-testid="dw-ocr-tab"]' },
    { type: 'caption', text: 'Ou par capture Mobile Money.', say: SAY.s5, duration: 6500 },
    { type: 'highlight', selector: '[data-testid="dw-declare"]', duration: 1500 },
    // 6 — members (~10s)
    { type: 'goto', url: 'http://localhost:3101/members' },
    { type: 'caption', text: 'Confiance et rotation IA.', say: SAY.s6, duration: 6500 },
    { type: 'highlight', selector: '[data-testid="dw-members"]', duration: 2000 },
    { type: 'wait', duration: 1200 },
    // 7 — alerts + real Polly digest (~17s)
    { type: 'goto', url: 'http://localhost:3101/alerts' },
    { type: 'caption', text: 'Relances douces et digest vocal.', say: SAY.s7, duration: 6200 },
    { type: 'click', selector: '[data-testid="dw-digest-play"]' },
    { type: 'wait', duration: 6000 },
    { type: 'highlight', selector: '[data-testid="dw-alerts"]', duration: 2000 },
    // 8 — export (~10s)
    { type: 'goto', url: 'http://localhost:3101/export' },
    { type: 'caption', text: 'Un registre qui clôt les disputes.', say: SAY.s8, duration: 5900 },
    { type: 'click', selector: '[data-testid="dw-export-csv"]' },
    { type: 'wait', duration: 1500 },
    { type: 'highlight', selector: '[data-testid="dw-export"]', duration: 1800 },
    // 9 — assistant (~15s)
    { type: 'goto', url: 'http://localhost:3101/dashboard' },
    { type: 'click', selector: 'button[aria-label="Ouvrir l\u2019assistant"]' },
    { type: 'wait', selector: 'input[placeholder*="question"]' },
    { type: 'caption', text: 'Tonti répond et agit pour vous.', say: SAY.s9, duration: 5200 },
    { type: 'type', selector: 'input[placeholder*="question"]', text: 'Qui est en retard ce mois ?' },
    { type: 'key', key: 'Enter' },
    { type: 'wait', duration: 9000 },
    // 10 — endcard
    { type: 'endcard', title: 'TontinePilot', subtitle: 'Zero to Shipped × AWS', duration: 3200 },
  ],
})
