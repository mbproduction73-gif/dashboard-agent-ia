/**
 * Contrôleur des clients
 */

const supabase = require('../config/supabase');

const getCustomers = async (req, res) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = supabase
      .from('customers')
      .select('*', { count: 'exact' })
      .eq('business_id', req.user.business_id)
      .order('full_name')
      .range(offset, offset + parseInt(limit) - 1);

    if (search) {
      query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
    }

    const { data, error, count } = await query;
    if (error) throw error;

    res.json({ customers: data, total: count });
  } catch (error) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

const createCustomer = async (req, res) => {
  try {
    const { fullName, email, phone, whatsappNumber, notes } = req.body;

    const { data, error } = await supabase
      .from('customers')
      .insert({
        business_id: req.user.business_id,
        full_name: fullName,
        email: email || null,
        phone: phone || null,
        whatsapp_number: whatsappNumber || phone || null,
        notes: notes || null,
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ customer: data });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la création du client' });
  }
};

const updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const { fullName, email, phone, whatsappNumber, notes } = req.body;

    const updates = {};
    if (fullName !== undefined) updates.full_name = fullName;
    if (email !== undefined) updates.email = email;
    if (phone !== undefined) updates.phone = phone;
    if (whatsappNumber !== undefined) updates.whatsapp_number = whatsappNumber;
    if (notes !== undefined) updates.notes = notes;

    const { data, error } = await supabase
      .from('customers')
      .update(updates)
      .eq('id', id)
      .eq('business_id', req.user.business_id)
      .select()
      .single();

    if (error) throw error;
    res.json({ customer: data });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la mise à jour' });
  }
};

module.exports = { getCustomers, createCustomer, updateCustomer };
