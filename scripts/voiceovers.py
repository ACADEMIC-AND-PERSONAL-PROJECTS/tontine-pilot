"""Generate the 9 French voiceovers (Polly Léa, neural) + print durations."""
import subprocess
import boto3

LINES = {
    "scene-01": "Bienvenue sur TontinePilot. Le tableau de bord montre la collecte du cycle, qui a payé, et qui doit encore payer.",
    "scene-02": "Gérez plusieurs tontines : basculez de groupe, archivez celles en pause, créez-en de nouvelles.",
    "scene-03": "Créer un groupe prend deux minutes : nom, cotisation, membres avec e-mails et antécédents, ordre IA, confirmation.",
    "scene-04": "Déclarez en langage naturel. Écrivez : j'ai payé vingt-mille pour Awa. L'IA extrait le montant et le bénéficiaire.",
    "scene-05": "Ou déposez une capture Wave ou Orange Money : montant, identifiant et date sont extraits automatiquement.",
    "scene-06": "Chaque membre a un score de confiance. Les profils fiables passent tôt, les retards récurrents plus tard.",
    "scene-07": "Les retards déclenchent des relances empathiques. Et le digest audio lit le bilan du cycle à voix haute.",
    "scene-08": "Exportez le registre complet en CSV. Fini, les disputes sur qui a payé.",
    "scene-09": "Et Tonti, l'assistant, répond à vos questions et relance les membres pour vous.",
}

polly = boto3.client("polly", region_name="us-east-1")
for name, text in LINES.items():
    out = f"public/voiceover/{name}.mp3"
    resp = polly.synthesize_speech(
        Engine="neural", LanguageCode="fr-FR", VoiceId="Lea",
        OutputFormat="mp3", Text=text,
    )
    with open(out, "wb") as f:
        f.write(resp["AudioStream"].read())
    dur = subprocess.check_output(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=noprint_wrappers=1:nokey=1", out]
    ).decode().strip()
    print(f"{name}: {float(dur):.1f}s")
