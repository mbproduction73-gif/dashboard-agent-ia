# AgendaPro - SaaS de Prise de Rendez-vous

Application web complète pour automatiser la gestion des rendez-vous pour les commerces (coiffeurs, restaurants, médecins, etc.) avec intégration WhatsApp et IA Claude.

## Architecture

```
dashboard-agent-ia/
├── frontend/          # Next.js 14 + TypeScript + Tailwind
│   └── src/
│       ├── app/       # Pages (login, register, dashboard)
│       ├── components/# Composants réutilisables
│       ├── hooks/     # useAuth
│       ├── lib/       # api.ts, auth.ts
│       └── types/     # Types TypeScript
├── backend/           # Node.js + Express REST API
│   └── src/
│       ├── config/    # Supabase client
│       ├── controllers/
│       ├── middleware/ # Auth JWT
│       ├── routes/
│       └── services/  # Claude IA service
└── supabase/
    └── schema.sql     # Tables + RLS + triggers
```

## Stack technique

| Couche     | Technologie                          |
|------------|--------------------------------------|
| Frontend   | Next.js 14, TypeScript, Tailwind CSS |
| Backend    | Node.js, Express                     |
| Base de données | Supabase (PostgreSQL)           |
| IA         | Claude claude-sonnet-4-6 (Anthropic) |
| Auth       | JWT + bcrypt                         |
| WhatsApp   | Meta Business API (webhook)          |

## Installation rapide

### 1. Base de données Supabase
1. Créer un projet sur [supabase.com](https://supabase.com)
2. Aller dans SQL Editor → New query
3. Coller et exécuter `supabase/schema.sql`

### 2. Backend
```bash
cd backend
cp .env.example .env
# Éditer .env avec vos clés Supabase + Anthropic
npm install
npm run dev   # → http://localhost:4000
```

### 3. Frontend
```bash
cd frontend
cp .env.example .env.local
# NEXT_PUBLIC_API_URL=http://localhost:4000
npm install
npm run dev   # → http://localhost:3000
```

## Variables d'environnement Backend

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | URL du projet Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé service role Supabase |
| `JWT_SECRET` | Secret JWT (chaîne aléatoire longue) |
| `ANTHROPIC_API_KEY` | Clé API Anthropic |
| `WHATSAPP_VERIFY_TOKEN` | Token vérification webhook Meta |
| `FRONTEND_URL` | URL frontend (CORS) |

## API Endpoints

### Auth
```
POST /api/auth/register   Inscription (+ création du commerce)
POST /api/auth/login      Connexion
GET  /api/auth/me         Profil connecté
PUT  /api/auth/profile    Mise à jour profil
```

### Rendez-vous
```
GET    /api/appointments          Lister (filtres: status, dates)
GET    /api/appointments/stats    Statistiques dashboard
POST   /api/appointments          Créer
PUT    /api/appointments/:id      Modifier
DELETE /api/appointments/:id      Annuler (soft delete)
```

### Services & Clients
```
GET/POST/PUT/DELETE /api/services    CRUD services
GET/POST/PUT        /api/customers   CRUD clients
```

### WhatsApp + IA
```
GET  /api/whatsapp/webhook    Vérification Meta webhook
POST /api/whatsapp/webhook    Messages entrants (auto-analyse)
POST /api/whatsapp/simulate   Simulateur de démo
GET  /api/whatsapp/messages   Historique conversations
POST /api/ai/analyze          Analyse directe d'un message
```

## Fonctionnalités

- **Auth** : Inscription/connexion par commerce, JWT, isolation multi-tenant
- **Dashboard** : Statistiques temps réel, prochains RDV
- **Rendez-vous** : CRUD complet, détection conflits de créneaux
- **IA Claude** : Extraction date/heure/service/nom depuis messages naturels
- **WhatsApp** : Webhook Meta + simulateur intégré pour démonstration
- **Services** : Configuration personnalisée (durée, prix, couleur)
- **Sécurité** : RLS Supabase, rate limiting, helmet, bcrypt

## Déploiement

```bash
# Frontend → Vercel
cd frontend && vercel deploy

# Backend → Railway / Render / Fly.io
cd backend && # configurer les env vars puis deploy
```
