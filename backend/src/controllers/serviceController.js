/**
 * Contrôleur des services (coupe, couleur, etc.)
 */

const supabase = require('../config/supabase');

const getServices = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('business_id', req.user.business_id)
      .order('name');

    if (error) throw error;
    res.json({ services: data });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

const createService = async (req, res) => {
  try {
    const { name, description, duration, price, color } = req.body;

    const { data, error } = await supabase
      .from('services')
      .insert({
        business_id: req.user.business_id,
        name,
        description,
        duration: parseInt(duration) || 30,
        price: parseFloat(price) || null,
        color: color || '#3B82F6',
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ service: data });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la création du service' });
  }
};

const updateService = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, duration, price, color, isActive } = req.body;

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (duration !== undefined) updates.duration = parseInt(duration);
    if (price !== undefined) updates.price = parseFloat(price);
    if (color !== undefined) updates.color = color;
    if (isActive !== undefined) updates.is_active = isActive;

    const { data, error } = await supabase
      .from('services')
      .update(updates)
      .eq('id', id)
      .eq('business_id', req.user.business_id)
      .select()
      .single();

    if (error) throw error;
    res.json({ service: data });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la mise à jour' });
  }
};

const deleteService = async (req, res) => {
  try {
    const { id } = req.params;
    await supabase
      .from('services')
      .update({ is_active: false })
      .eq('id', id)
      .eq('business_id', req.user.business_id);

    res.json({ message: 'Service désactivé' });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

module.exports = { getServices, createService, updateService, deleteService };
