/**
 * Middleware d'authentification JWT
 * Vérifie le token Bearer et attache l'utilisateur à req
 */

const jwt = require('jsonwebtoken');
const supabase = require('../config/supabase');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token d\'authentification manquant' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Récupérer l'utilisateur depuis Supabase pour vérifier qu'il est toujours actif
    const { data: user, error } = await supabase
      .from('users')
      .select('id, auth_id, business_id, full_name, email, role, is_active')
      .eq('auth_id', decoded.authId)
      .single();

    if (error || !user) {
      return res.status(401).json({ error: 'Utilisateur non trouvé' });
    }

    if (!user.is_active) {
      return res.status(403).json({ error: 'Compte désactivé' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Token invalide' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expiré' });
    }
    next(error);
  }
};

// Middleware pour restreindre aux rôles spécifiques
const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user?.role)) {
    return res.status(403).json({ error: 'Accès interdit : rôle insuffisant' });
  }
  next();
};

module.exports = { authenticate, requireRole };
