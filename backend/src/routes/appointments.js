/**
 * Routes des rendez-vous
 * GET    /api/appointments          - Lister
 * GET    /api/appointments/stats    - Statistiques
 * GET    /api/appointments/:id      - Détail
 * POST   /api/appointments          - Créer
 * PUT    /api/appointments/:id      - Modifier
 * DELETE /api/appointments/:id      - Annuler
 */

const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const {
  getAppointments,
  getAppointmentById,
  createAppointment,
  updateAppointment,
  deleteAppointment,
  getStats,
} = require('../controllers/appointmentController');

const appointmentValidation = [
  body('startTime').isISO8601().withMessage('Date de début invalide (format ISO 8601 requis)'),
  body('endTime').isISO8601().withMessage('Date de fin invalide'),
  body('customerName').trim().isLength({ min: 2 }).withMessage('Nom du client requis'),
];

router.use(authenticate); // Toutes les routes requièrent l'auth

router.get('/stats', getStats);
router.get('/', getAppointments);
router.get('/:id', getAppointmentById);
router.post('/', appointmentValidation, createAppointment);
router.put('/:id', updateAppointment);
router.delete('/:id', deleteAppointment);

module.exports = router;
