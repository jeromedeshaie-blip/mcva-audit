"""
LLM Watch — Génération de rapport PDF
Utilise Puppeteer pour capturer la page rapport HTML en PDF,
l'upload dans Supabase Storage et l'envoie par email via Resend.
"""

import os
import subprocess
from datetime import datetime
from supabase import create_client
import resend

supabase = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_KEY"])
resend.api_key = os.environ["RESEND_API_KEY"]


def generate_report(client_id: str, period: str):
    """
    period = "2026-04"
    1. Puppeteer → PDF
    2. Upload Supabase Storage
    3. Enregistrement BDD
    4. Email Resend
    """
    app_url = os.environ["NEXT_PUBLIC_APP_URL"]
    token = os.environ["REPORT_SECRET"]
    report_url = f"{app_url}/llmwatch/report/{client_id}/{period}?token={token}"

    pdf_path = f"/tmp/llmwatch_{client_id}_{period}.pdf"

    # 1. Puppeteer
    result = subprocess.run(
        [
            "node",
            "-e",
            f"""
const puppeteer = require('puppeteer');
(async () => {{
  const browser = await puppeteer.launch({{ args: ['--no-sandbox', '--disable-setuid-sandbox'] }});
  const page = await browser.newPage();
  await page.goto('{report_url}', {{ waitUntil: 'networkidle0', timeout: 30000 }});
  await page.pdf({{ path: '{pdf_path}', format: 'A4', printBackground: true, margin: {{ top: '0', right: '0', bottom: '0', left: '0' }} }});
  await browser.close();
  console.log('OK');
}})();
""",
        ],
        capture_output=True,
        text=True,
        timeout=60,
    )

    if result.returncode != 0:
        raise Exception(f"Puppeteer failed: {result.stderr}")

    # 2. Upload Storage
    with open(pdf_path, "rb") as f:
        pdf_bytes = f.read()

    storage_path = f"reports/{client_id}/{period}.pdf"
    supabase.storage.from_("llmwatch").upload(
        storage_path,
        pdf_bytes,
        file_options={"content-type": "application/pdf", "upsert": "true"},
    )
    pdf_url = supabase.storage.from_("llmwatch").get_public_url(storage_path)

    # 3. BDD
    supabase.table("llmwatch_reports").upsert(
        {
            "client_id": client_id,
            "period": period,
            "pdf_url": pdf_url,
            "sent_at": datetime.utcnow().isoformat(),
        }
    ).execute()

    # 4. Email
    client = (
        supabase.table("llmwatch_clients")
        .select("name, contact_email")
        .eq("id", client_id)
        .single()
        .execute()
        .data
    )

    resend.Emails.send(
        {
            "from": os.environ["RESEND_FROM_EMAIL"],
            "to": client["contact_email"],
            "subject": f"LLM Watch — Votre rapport {period} est disponible",
            "html": f"""
        <p>Bonjour,</p>
        <p>Votre rapport LLM Watch du mois de {period} est disponible.</p>
        <p><a href="{pdf_url}" style="background:#8B2C2C;color:white;padding:10px 20px;text-decoration:none;font-weight:bold;">
          Télécharger le rapport PDF
        </a></p>
        <p>Vous pouvez également consulter votre tableau de bord en temps réel sur
        <a href="{app_url}/llmwatch/dashboard/{client_id}">mcva.ch</a>.</p>
        <br>
        <p style="font-size:12px;color:#999">MCVA Consulting SA · Haute-Nendaz, Valais</p>
        """,
        }
    )

    print(f"[OK] Rapport {period} généré et envoyé pour {client['name']}")
    return pdf_url


if __name__ == "__main__":
    import sys

    if len(sys.argv) != 3:
        print("Usage: python report_generator.py <client_id> <period>")
        sys.exit(1)
    generate_report(sys.argv[1], sys.argv[2])
