/**
 * Contrôleur d'authentification
 * Gestion : inscription, connexion, profil
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const supabase = require('../config/supabase');

// Générer un JWT signé
const generateToken = (authId, businessId) => {
  return jwt.sign(
    { authId, businessId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

/**
 * POST /api/auth/register
 * Inscription d'un nouveau gérant + création du business
 */
const register = async (req, res) => {
  try {
    const { fullName, email, password, businessName, businessType, phone } = req.body;

    // Vérifier si l'email existe déjà
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      return res.status(409).json({ error: 'Cet email est déjà utilisé' });
    }

    // Hasher le mot de passe
    const passwordHash = await bcrypt.hash(password, 12);

    // Créer un auth_id unique (simule Supabase Auth)
    const authId = uuidv4();

    // Créer le business
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .insert({
        name: businessName,
        type: businessType || 'autre',
        email,
        phone: phone || null,
      })
      .select()
      .single();

    if (businessError) throw businessError;

    // Créer l'utilisateur
    const { data: user, error: userError } = await supabase
      .from('users')
      .insert({
        auth_id: authId,
        business_id: business.id,
        full_name: fullName,
        email,
        role: 'owner',
      })
      .select('id, auth_id, business_id, full_name, email, role')
      .single();

    if (userError) throw userError;

    // Stocker le hash du mot de passe dans les settings du business
    // (En production, utiliser Supabase Auth directement)
    await supabase
      .from('businesses')
      .update({ settings: { passwordHash } })
      .eq('id', business.id);

    const token = generateToken(authId, business.id);

    res.status(201).json({
      message: 'Compte créé avec succès',
      token,
      user: {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        role: user.role,
        businessId: user.business_id,
        businessName: business.name,
      },
    });
  } catch (error) {
    console.error('Erreur register:', error);
    res.status(500).json({ error: 'Erreur lors de la création du compte' });
  }
};

/**
 * POST /api/auth/login
 * Connexion utilisateur
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Récupérer l'utilisateur
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, auth_id, business_id, full_name, email, role, is_active')
      .eq('email', email)
      .single();

    if (userError || !user) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    if (!user.is_active) {
      return res.status(403).json({ error: 'Compte désactivé' });
    }

    // Récupérer le hash du mot de passe
    const { data: business } = await supabase
      .from('businesses')
      .select('name, settings')
      .eq('id', user.business_id)
      .single();

    const passwordHash = business?.settings?.passwordHash;
    if (!passwordHash) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    const isValidPassword = await bcrypt.compare(password, passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    const token = generateToken(user.auth_id, user.business_id);

    res.json({
      message: 'Connexion réussie',
      token,
      user: {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        role: user.role,
        businessId: user.business_id,
        businessName: business.name,
      },
    });
  } catch (error) {
    console.error('Erreur login:', error);
    res.status(500).json({ error: 'Erreur lors de la connexion' });
  }
};

/**
 * GET /api/auth/me
 * Récupérer le profil de l'utilisateur connecté
 */
const getProfile = async (req, res) => {
  try {
    const { data: business } = await supabase
      .from('businesses')
      .select('name, type, phone, email, address, whatsapp_number, logo_url')
      .eq('id', req.user.business_id)
      .single();

    res.json({
      user: {
        id: req.user.id,
        fullName: req.user.full_name,
        email: req.user.email,
        role: req.user.role,
        businessId: req.user.business_id,
      },
      business,
    });
  } catch (error) {
    console.error('Erreur getProfile:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

/**
 * PUT /api/auth/profile
 * Mettre à jour le profil
 */
const updateProfile = async (req, res) => {
  try {
    const { fullName, businessName, phone, address, whatsappNumber } = req.body;

    if (fullName) {
      await supabase
        .from('users')
        .update({ full_name: fullName })
        .eq('id', req.user.id);
    }

    const businessUpdates = {};
    if (businessName) businessUpdates.name = businessName;
    if (phone) businessUpdates.phone = phone;
    if (address) businessUpdates.address = address;
    if (whatsappNumber) businessUpdates.whatsapp_number = whatsappNumber;

    if (Object.keys(businessUpdates).length > 0) {
      await supabase
        .from('businesses')
        .update(businessUpdates)
        .eq('id', req.user.business_id);
    }

    res.json({ message: 'Profil mis à jour avec succès' });
  } catch (error) {
    console.error('Erreur updateProfile:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour' });
  }
};

module.exports = { register, login, getProfile, updateProfile };
