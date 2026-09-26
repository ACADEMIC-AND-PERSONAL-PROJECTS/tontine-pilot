import { defineDemo } from '@matte97p/demowright'

// Edit the selectors/text to match your app, then:
//   npx demowright run demowright.config.js -o output/demo.mp4
export default defineDemo({
  name: 'tontine-pilot-demo',
  url: 'http://localhost:3000',
  viewport: { width: 1280, height: 720 },
  theme: { accent: '#10b981' },
  // music: './assets/track.mp3',
  formats: ['landscape'], // add 'square' and/or 'vertical' for social crops
  steps: [
    { type: 'caption', text: 'TontinePilot — le copilote IA des tontines.', duration: 2600 },
    { type: 'highlight', selector: 'nav', duration: 1600 },
    { type: 'zoom', selector: 'nav', scale: 1.25 },
    { type: 'wait', duration: 800 },
    { type: 'zoomReset' },
    { type: 'click', selector: 'a[href="/dashboard"]' },
    { type: 'wait', selector: 'h1' },
    { type: 'caption', text: 'Qui a payé, qui doit, prochain bénéficiaire.', duration: 2600 },
    { type: 'zoom', selector: 'main', scale: 1.15 },
    { type: 'wait', duration: 1000 },
    { type: 'zoomReset' },
    { type: 'click', selector: 'a[href="/declare"]' },
    { type: 'wait', selector: 'form, textarea, input' },
    { type: 'caption', text: 'Déclare en langage naturel, Bedrock comprend.', duration: 2600 },
    { type: 'type', selector: 'textarea, input[type="text"]', text: "J'ai payé 20000 pour Awa ce mois" },
    { type: 'wait', duration: 1200 },
    { type: 'caption', text: 'Relances empathiques et registre exportable.', duration: 2600 },
    { type: 'click', selector: 'a[href="/export"]' },
    { type: 'wait', duration: 1500 },
    { type: 'endcard', title: 'TontinePilot', subtitle: 'Zero to Shipped × AWS', duration: 2800 },
  ],
})
