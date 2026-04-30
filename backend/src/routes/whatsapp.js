/**
 * Routes WhatsApp
 * GET  /api/whatsapp/webhook    - Vérification Meta
 * POST /api/whatsapp/webhook    - Messages entrants
 * POST /api/whatsapp/simulate   - Simulation pour démo
 * GET  /api/whatsapp/messages   - Historique
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { verifyWebhook, receiveWebhook, simulateMessage, getMessages } = require('../controllers/whatsappController');

// Le webhook Meta n'a pas besoin d'auth (il vérifie son propre token)
router.get('/webhook', verifyWebhook);
router.post('/webhook', receiveWebhook);

// Routes protégées
router.post('/simulate', authenticate, simulateMessage);
router.get('/messages', authenticate, getMessages);

module.exports = router;
