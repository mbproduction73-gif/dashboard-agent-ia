/**
 * Route IA directe - analyser un message sans passer par WhatsApp
 * POST /api/ai/analyze
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { analyzeAppointmentMessage } = require('../services/claudeService');

router.post('/analyze', authenticate, async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Champ "message" requis' });
    }

    const result = await analyzeAppointmentMessage(message, req.user.business_id);
    res.json(result);
  } catch (error) {
    console.error('Erreur analyse IA:', error);
    res.status(500).json({ error: 'Erreur lors de l\'analyse IA' });
  }
});

module.exports = router;
