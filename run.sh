#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# run.sh — Lance l'agent d'automatisation PDF
#
# Usage:
#   ./run.sh [chemin/vers/document.pdf]
#
# Variables d'environnement:
#   HEADLESS=true   mode serveur (navigateur invisible)
#   HEADLESS=false  mode local   (navigateur visible, défaut)
#
# Exemples:
#   ./run.sh
#   ./run.sh ~/Documents/dossier.pdf
#   HEADLESS=true ./run.sh dossier.pdf
# ---------------------------------------------------------------------------

set -euo pipefail

PDF="${1:-documents/document.pdf}"
HEADLESS="${HEADLESS:-false}"

echo "========================================"
echo "  Dashboard Agent IA — Déploiement"
echo "========================================"
echo "  PDF source : $PDF"
echo "  Mode       : $([ "$HEADLESS" = "true" ] && echo 'Headless (serveur)' || echo 'Navigateur visible')"
echo "========================================"

# --- Vérifie que le PDF existe ---
if [ ! -f "$PDF" ]; then
    echo "ERREUR : fichier introuvable → $PDF"
    echo "Crée le dossier 'documents/' et place tes PDFs dedans."
    exit 1
fi

# --- Détection : Docker disponible ? ---
if command -v docker &>/dev/null && [ -f "Dockerfile" ]; then
    echo ""
    echo "Docker détecté → construction de l'image…"
    docker build -t dashboard-agent-ia . --quiet

    # Autorise Docker à accéder au display X (navigateur visible)
    if [ "$HEADLESS" != "true" ] && [ -n "${DISPLAY:-}" ]; then
        xhost +local:docker 2>/dev/null || true
    fi

    echo "Lancement du conteneur…"
    docker run --rm \
        -e HEADLESS="$HEADLESS" \
        -e DISPLAY="${DISPLAY:-}" \
        -v "$(pwd)/documents:/app/documents" \
        -v /tmp/.X11-unix:/tmp/.X11-unix \
        --network host \
        dashboard-agent-ia "/app/documents/$(basename "$PDF")"

# --- Sinon : exécution locale directe ---
else
    echo ""
    echo "Docker non disponible → exécution locale Python."

    if ! command -v python3 &>/dev/null; then
        echo "ERREUR : python3 introuvable. Installe Python 3.9+."
        exit 1
    fi

    # Crée et active un venv si absent
    if [ ! -d ".venv" ]; then
        echo "Création de l'environnement virtuel…"
        python3 -m venv .venv
    fi

    # shellcheck disable=SC1091
    source .venv/bin/activate

    pip install -q -r requirements.txt
    playwright install chromium --quiet

    HEADLESS="$HEADLESS" python3 automate_pdf_forms.py "$PDF"
fi
