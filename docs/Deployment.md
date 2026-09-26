# Deployment

## Backend environments
- **Sandbox** (`npx ampx sandbox --identifier tontine`, us-east-1): dev backend.
  Watch rebuilds apply infra/schema/policies reliably.
- **Quirk (verified multiple times)**: watch rebuilds do NOT refresh deployed
  Lambda CODE ("Deployment completed" while bytes stay frozen), and can even
  overwrite manual pushes with stale bundles. Procedure: after every
  handler/_shared change AND after every sandbox deploy, run
  `./scripts/deploy-functions.sh [fn...]` (esbuild + SSM banner + cjs_shim +
  `update-function-code`), then re-run `scripts/verify.ts`.
- **Hosting**: Amplify Hosting Git branch `main` → public URL. `amplify.yml`
  pins npm 11 (`npm ci` is broken on this tree — arborist drift; plain
  `npm install` is proven green). Root `tsconfig` excludes `amplify/` and
  `scripts/` (own configs; keeps the hosting typecheck green).

## CI/CD
GitHub Actions: typecheck, lint (node_modules/amplify excluded), tests, build,
gitleaks secret scan. Recurrent small commits, secret scan after every step.

## Freeze rules (until winners announced)
No breaking schema changes · backup first · never delete the sandbox stack
(the public URL bundles its outputs) · confirm the URL hourly on Oct 2.

## Costs
Expected demo total < $5 (on-demand Bedrock, SES cents, free-tier hosting).
$20 budget alarm set.
