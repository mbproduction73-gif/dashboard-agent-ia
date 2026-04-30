/**
 * Contrôleur des rendez-vous
 * CRUD complet + statistiques
 */

const supabase = require('../config/supabase');

/**
 * GET /api/appointments
 * Lister tous les RDV du business avec filtres optionnels
 */
const getAppointments = async (req, res) => {
  try {
    const { status, startDate, endDate, customerId, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = supabase
      .from('appointments')
      .select(`
        *,
        customers(id, full_name, phone, email),
        services(id, name, duration, price, color),
        users!appointments_staff_id_fkey(id, full_name)
      `, { count: 'exact' })
      .eq('business_id', req.user.business_id)
      .order('start_time', { ascending: true })
      .range(offset, offset + parseInt(limit) - 1);

    if (status) query = query.eq('status', status);
    if (startDate) query = query.gte('start_time', startDate);
    if (endDate) query = query.lte('start_time', endDate);
    if (customerId) query = query.eq('customer_id', customerId);

    const { data, error, count } = await query;
    if (error) throw error;

    res.json({
      appointments: data,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Erreur getAppointments:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des rendez-vous' });
  }
};

/**
 * GET /api/appointments/:id
 * Récupérer un RDV par son ID
 */
const getAppointmentById = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        customers(id, full_name, phone, email, whatsapp_number),
        services(id, name, duration, price, color),
        users!appointments_staff_id_fkey(id, full_name)
      `)
      .eq('id', req.params.id)
      .eq('business_id', req.user.business_id)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Rendez-vous non trouvé' });
    }

    res.json({ appointment: data });
  } catch (error) {
    console.error('Erreur getAppointmentById:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

/**
 * POST /api/appointments
 * Créer un nouveau rendez-vous
 */
const createAppointment = async (req, res) => {
  try {
    const {
      customerId,
      customerName,
      customerPhone,
      serviceId,
      serviceName,
      staffId,
      startTime,
      endTime,
      notes,
      source = 'manual',
    } = req.body;

    // Vérifier les conflits de créneau
    const { data: conflicts } = await supabase
      .from('appointments')
      .select('id')
      .eq('business_id', req.user.business_id)
      .neq('status', 'cancelled')
      .lt('start_time', endTime)
      .gt('end_time', startTime);

    if (conflicts && conflicts.length > 0) {
      return res.status(409).json({
        error: 'Ce créneau est déjà occupé. Choisissez un autre horaire.',
      });
    }

    const { data, error } = await supabase
      .from('appointments')
      .insert({
        business_id: req.user.business_id,
        customer_id: customerId || null,
        customer_name: customerName,
        customer_phone: customerPhone || null,
        service_id: serviceId || null,
        service_name: serviceName || null,
        staff_id: staffId || null,
        start_time: startTime,
        end_time: endTime,
        notes: notes || null,
        status: 'confirmed',
        source,
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      message: 'Rendez-vous créé avec succès',
      appointment: data,
    });
  } catch (error) {
    console.error('Erreur createAppointment:', error);
    res.status(500).json({ error: 'Erreur lors de la création du rendez-vous' });
  }
};

/**
 * PUT /api/appointments/:id
 * Modifier un rendez-vous existant
 */
const updateAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      customerId,
      customerName,
      customerPhone,
      serviceId,
      serviceName,
      staffId,
      startTime,
      endTime,
      notes,
      status,
    } = req.body;

    // Vérifier que le RDV appartient au business
    const { data: existing } = await supabase
      .from('appointments')
      .select('id')
      .eq('id', id)
      .eq('business_id', req.user.business_id)
      .single();

    if (!existing) {
      return res.status(404).json({ error: 'Rendez-vous non trouvé' });
    }

    const updates = {};
    if (customerId !== undefined) updates.customer_id = customerId;
    if (customerName !== undefined) updates.customer_name = customerName;
    if (customerPhone !== undefined) updates.customer_phone = customerPhone;
    if (serviceId !== undefined) updates.service_id = serviceId;
    if (serviceName !== undefined) updates.service_name = serviceName;
    if (staffId !== undefined) updates.staff_id = staffId;
    if (startTime !== undefined) updates.start_time = startTime;
    if (endTime !== undefined) updates.end_time = endTime;
    if (notes !== undefined) updates.notes = notes;
    if (status !== undefined) updates.status = status;

    const { data, error } = await supabase
      .from('appointments')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({
      message: 'Rendez-vous mis à jour',
      appointment: data,
    });
  } catch (error) {
    console.error('Erreur updateAppointment:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour' });
  }
};

/**
 * DELETE /api/appointments/:id
 * Annuler (soft delete) un rendez-vous
 */
const deleteAppointment = async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('appointments')
      .update({ status: 'cancelled' })
      .eq('id', id)
      .eq('business_id', req.user.business_id);

    if (error) throw error;

    res.json({ message: 'Rendez-vous annulé' });
  } catch (error) {
    console.error('Erreur deleteAppointment:', error);
    res.status(500).json({ error: 'Erreur lors de l\'annulation' });
  }
};

/**
 * GET /api/appointments/stats
 * Statistiques du tableau de bord
 */
const getStats = async (req, res) => {
  try {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
    const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();

    const businessId = req.user.business_id;

    const [todayResult, monthResult, pendingResult, totalResult] = await Promise.all([
      // RDV aujourd'hui
      supabase
        .from('appointments')
        .select('id', { count: 'exact', head: true })
        .eq('business_id', businessId)
        .gte('start_time', startOfDay)
        .lte('start_time', endOfDay)
        .neq('status', 'cancelled'),

      // RDV ce mois
      supabase
        .from('appointments')
        .select('id', { count: 'exact', head: true })
        .eq('business_id', businessId)
        .gte('start_time', startOfMonth)
        .neq('status', 'cancelled'),

      // RDV en attente
      supabase
        .from('appointments')
        .select('id', { count: 'exact', head: true })
        .eq('business_id', businessId)
        .eq('status', 'pending'),

      // Total RDV
      supabase
        .from('appointments')
        .select('id', { count: 'exact', head: true })
        .eq('business_id', businessId),
    ]);

    res.json({
      stats: {
        today: todayResult.count || 0,
        thisMonth: monthResult.count || 0,
        pending: pendingResult.count || 0,
        total: totalResult.count || 0,
      },
    });
  } catch (error) {
    console.error('Erreur getStats:', error);
    res.status(500).json({ error: 'Erreur lors du calcul des statistiques' });
  }
};

module.exports = {
  getAppointments,
  getAppointmentById,
  createAppointment,
  updateAppointment,
  deleteAppointment,
  getStats,
};
