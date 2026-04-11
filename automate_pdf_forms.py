import re
import sys
import logging
from pathlib import Path

import pdfplumber
import pytesseract
from PIL import Image
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

# -----------------------------
# 1. EXTRACTION DONNÉES PDF
# -----------------------------

def _ocr_page(page) -> str:
    """Fallback OCR on a pdfplumber page when text extraction returns nothing."""
    img = page.to_image(resolution=300).original
    return pytesseract.image_to_string(img, lang="fra")


def extract_data(pdf_path: str) -> dict:
    """
    Extract key fields from a PDF document.
    Uses embedded text first; falls back to OCR for scanned pages.
    """
    pdf_path = Path(pdf_path)
    if not pdf_path.exists():
        raise FileNotFoundError(f"PDF introuvable : {pdf_path}")

    full_text = ""
    with pdfplumber.open(pdf_path) as pdf:
        for i, page in enumerate(pdf.pages):
            page_text = page.extract_text() or ""
            if not page_text.strip():
                logger.info("Page %d : texte vide, recours à l'OCR…", i + 1)
                page_text = _ocr_page(page)
            full_text += page_text + "\n"

    logger.debug("Texte extrait :\n%s", full_text[:500])

    data = _parse_fields(full_text)
    logger.info("Champs extraits : %s", data)
    return data


def _parse_fields(text: str) -> dict:
    """
    Extract structured fields from raw text using regex patterns.
    Extend this mapping to cover additional fields as needed.
    """
    patterns = {
        "nom":         r"Nom\s*[:\-]?\s*([A-ZÀÂÄÉÈÊËÎÏÔÙÛÜ][^\n]{1,50})",
        "prenom":      r"Pr[eé]nom\s*[:\-]?\s*([A-ZÀÂÄÉÈÊËÎÏÔÙÛÜ][^\n]{1,50})",
        "date_naissance": r"(?:Date de naissance|Né\(e\) le)\s*[:\-]?\s*(\d{2}[\/\-]\d{2}[\/\-]\d{4})",
        "lieu_naissance": r"Lieu de naissance\s*[:\-]?\s*([^\n]{1,60})",
        "nationalite": r"Nationalit[eé]\s*[:\-]?\s*([^\n]{1,40})",
        "adresse":     r"Adresse\s*[:\-]?\s*([^\n]{1,80})",
        "telephone":   r"(?:T[eé]l[eé]phone|T[eé]l\.?)\s*[:\-]?\s*([\d\s\.\-\+\(\)]{7,20})",
        "email":       r"(?:Email|E-mail|Courriel)\s*[:\-]?\s*([\w\.\-]+@[\w\.\-]+\.\w+)",
        "numero_passeport": r"(?:Passeport|N°\s*passeport)\s*[:\-]?\s*([A-Z0-9]{6,12})",
    }

    data = {}
    for field, pattern in patterns.items():
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            data[field] = match.group(1).strip()

    return data


# -----------------------------
# 2. AGENT NAVIGATION
# -----------------------------

UPLOAD_FILES = [
    "passeport.pdf",
    "acte_naissance.pdf",
]

TARGET_URL = "https://consulatmaroc.be/"


def automate(data: dict, headless: bool = False) -> None:
    """
    Drive the consulate web form using extracted data.
    headless=False keeps the browser visible for manual review before submission.
    """
    upload_paths = [p for p in UPLOAD_FILES if Path(p).exists()]
    if len(upload_paths) < len(UPLOAD_FILES):
        missing = set(UPLOAD_FILES) - set(upload_paths)
        logger.warning("Fichiers manquants (upload ignoré) : %s", missing)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=headless)
        context = browser.new_context()
        page = context.new_page()

        logger.info("Ouverture de %s", TARGET_URL)
        page.goto(TARGET_URL, wait_until="networkidle")

        # --- Navigation vers la page rendez-vous ---
        _click_safe(page, ["text=Rendez-vous", "text=Appointment", "a[href*='rdv']"])

        # --- Remplissage du formulaire ---
        _fill_safe(page, "input[name='nom'], input[id*='nom'], input[placeholder*='Nom']",
                   data.get("nom", ""))
        _fill_safe(page, "input[name='prenom'], input[id*='prenom'], input[placeholder*='Prénom']",
                   data.get("prenom", ""))
        _fill_safe(page, "input[name='date_naissance'], input[type='date'], input[placeholder*='naissance']",
                   data.get("date_naissance", ""))
        _fill_safe(page, "input[name='telephone'], input[type='tel']",
                   data.get("telephone", ""))
        _fill_safe(page, "input[name='email'], input[type='email']",
                   data.get("email", ""))

        # --- Upload de documents ---
        if upload_paths:
            _upload_safe(page, "input[type='file']", upload_paths)

        # --- Pause manuelle avant soumission ---
        print("\n" + "="*60)
        print("Veuillez vérifier le formulaire dans le navigateur.")
        print("Appuyez sur ENTRÉE pour fermer ou soumettez manuellement.")
        print("="*60)
        input()

        browser.close()


# -----------------------------
# 3. HELPERS PLAYWRIGHT
# -----------------------------

def _click_safe(page, selectors: list[str] | str, timeout: int = 5000) -> bool:
    """Try each selector in order; return True on first success."""
    if isinstance(selectors, str):
        selectors = [selectors]
    for sel in selectors:
        try:
            page.click(sel, timeout=timeout)
            logger.info("Clic réussi sur : %s", sel)
            return True
        except PlaywrightTimeoutError:
            continue
    logger.warning("Aucun élément cliquable trouvé parmi : %s", selectors)
    return False


def _fill_safe(page, selector: str, value: str, timeout: int = 3000) -> bool:
    """Fill the first visible input matching selector; silently skip if absent or value empty."""
    if not value:
        return False
    for sel in selector.split(","):
        sel = sel.strip()
        try:
            locator = page.locator(sel).first
            locator.wait_for(state="visible", timeout=timeout)
            locator.fill(value)
            logger.info("Champ rempli (%s) : %s", sel, value[:20])
            return True
        except PlaywrightTimeoutError:
            continue
    logger.debug("Champ introuvable pour selector : %s", selector)
    return False


def _upload_safe(page, selector: str, files: list[str], timeout: int = 3000) -> bool:
    """Attach files to a file input; skip if input not found."""
    try:
        page.locator(selector).first.wait_for(state="attached", timeout=timeout)
        page.set_input_files(selector, files)
        logger.info("Fichiers uploadés : %s", files)
        return True
    except PlaywrightTimeoutError:
        logger.warning("Input fichier introuvable (%s) – upload ignoré.", selector)
        return False


# -----------------------------
# MAIN
# -----------------------------

if __name__ == "__main__":
    pdf_source = sys.argv[1] if len(sys.argv) > 1 else "document.pdf"
    extracted = extract_data(pdf_source)
    automate(extracted, headless=False)
