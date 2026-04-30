/**
 * Routes d'authentification
 * POST /api/auth/register
 * POST /api/auth/login
 * GET  /api/auth/me
 * PUT  /api/auth/profile
 */

const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { register, login, getProfile, updateProfile } = require('../controllers/authController');

// Validation inscription
const registerValidation = [
  body('fullName').trim().isLength({ min: 2 }).withMessage('Nom requis (min 2 caractères)'),
  body('email').isEmail().normalizeEmail().withMessage('Email invalide'),
  body('password').isLength({ min: 8 }).withMessage('Mot de passe requis (min 8 caractères)'),
  body('businessName').trim().isLength({ min: 2 }).withMessage('Nom du commerce requis'),
];

// Validation connexion
const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Email invalide'),
  body('password').notEmpty().withMessage('Mot de passe requis'),
];

router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);
router.get('/me', authenticate, getProfile);
router.put('/profile', authenticate, updateProfile);

module.exports = router;
