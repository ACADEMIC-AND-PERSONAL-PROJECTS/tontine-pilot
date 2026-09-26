# TontinePilot Wiki

AI copilot for community rotating savings groups (tontines) — AWS Zero to Shipped hackathon, **Community** lane, **#workplace-efficiency**.

**Live app:** https://main.dhnfua5oyahpy.amplifyapp.com · **Region:** us-east-1 · **Languages:** FR/EN

## Start here
- [Vision](Vision.md) — the idea, the people, the journey from notebook to AI
- [Overview](Overview.md) — what it is, who it serves, feature tour
- [Getting-Started](Getting-Started.md) — run it locally, demo accounts, first group in 5 minutes
- [Architecture](Architecture.md) — services map, request flows, environments

## Build & operate
- [Backend](Backend.md) — Amplify Gen 2, data model, Lambda functions, prompts
- [Frontend](Frontend.md) — Next.js app, routes, i18n, offline/demo fallback
- [AI-Features](AI-Features.md) — NLU declarations, Vision OCR, mediation, rotation, assistant, audio digest
- [Notifications](Notifications.md) — SES emails, SMS, scheduler, templates
- [Auth](Auth.md) — Cognito email+password+code, password policy, route protection
- [Data-and-Trust](Data-and-Trust.md) — isolation per account, trust-score engine, cold start

## Ship it
- [Testing](Testing.md) — unit, integration, live verification scripts
- [Deployment](Deployment.md) — sandbox, hosting, CI/CD, known quirks, freeze rules
- [Security](Security.md) — secret hygiene, IAM, SES sandbox, audit checkpoints
- [Hackathon-Submission](Hackathon-Submission.md) — ship gate, Builder Center, tags, proof pack
