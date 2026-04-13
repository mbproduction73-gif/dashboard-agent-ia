# Agent Autonome IA - Claude (Anthropic)

Agent autonome Node.js connecte a l'API Anthropic (Claude).
Il peut rechercher sur le web, lire/ecrire des fichiers et executer des commandes.

## Installation rapide

### 1. Cloner le repo
```bash
git clone https://github.com/mbproduction73-gif/dashboard-agent-ia.git
cd dashboard-agent-ia
```

### 2. Installer les dependances
```bash
cd agent
npm install
```

### 3. Configurer la cle API
```bash
cp ../.env.example .env
# Editez .env et ajoutez votre cle Anthropic
```

Contenu du fichier `.env`:
```
ANTHROPIC_API_KEY=sk-ant-votre-vraie-cle-ici
```

### 4. Lancer l'agent

**Mode interactif** (conversation):
```bash
node index.js
```

**Mode direct** (une seule tache):
```bash
node index.js "Recherche les dernières nouvelles sur l'IA et sauvegarde un résumé dans resultats.txt"
```

## Exemples de taches

```
> Tache: Recherche qui est Elon Musk et fais un résumé
> Tache: Liste les fichiers dans le dossier courant
> Tache: Crée un fichier hello.txt avec le contenu "Bonjour le monde"
> Tache: Recherche les meilleurs frameworks Node.js en 2024 et sauvegarde les résultats
> Tache: Quelle est la météo à Paris aujourd'hui ?
```

## Outils disponibles

| Outil | Description |
|-------|-------------|
| `web_search` | Recherche DuckDuckGo |
| `read_url` | Lire le contenu d'une page web |
| `write_file` | Ecrire dans un fichier local |
| `read_file` | Lire un fichier local |
| `list_files` | Lister les fichiers d'un dossier |
| `run_command` | Executer une commande shell |

## Structure du projet

```
dashboard-agent-ia/
├── agent/
│   ├── index.js        <- Agent principal (boucle agentique)
│   ├── tools.js        <- Definition et execution des outils
│   └── package.json    <- Dependances Node.js
├── .env.example        <- Template configuration
└── README.md
```

## Comment ca marche

1. Vous donnez une tache a l'agent
2. Claude (via API Anthropic) analyse la tache
3. Claude choisit les outils a utiliser
4. Les outils s'executent et renvoient les resultats
5. Claude continue jusqu'a completion de la tache
6. Resultat final affiche dans le terminal

## Prerequis

- Node.js 18+
- Cle API Anthropic (https://console.anthropic.com/)
