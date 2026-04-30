/**
 * Contrôleur WhatsApp
 * Simulation de webhook + traitement des messages entrants via IA
 */

const supabase = require('../config/supabase');
const { analyzeAppointmentMessage, generateConfirmationMessage } = require('../services/claudeService');

/**
 * GET /api/whatsapp/webhook
 * Vérification du webhook WhatsApp (Meta API)
 */
const verifyWebhook = (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    console.log('✅ Webhook WhatsApp vérifié');
    res.status(200).send(challenge);
  } else {
    res.status(403).json({ error: 'Token de vérification invalide' });
  }
};

/**
 * POST /api/whatsapp/webhook
 * Réception d'un message WhatsApp entrant (Meta API)
 */
const receiveWebhook = async (req, res) => {
  try {
    res.sendStatus(200); // Répondre immédiatement à Meta

    const body = req.body;
    if (body.object !== 'whatsapp_business_account') return;

    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const message = changes?.value?.messages?.[0];

    if (!message || message.type !== 'text') return;

    const customerPhone = message.from;
    const messageText = message.text.body;
    const customerName = changes?.value?.contacts?.[0]?.profile?.name || 'Client inconnu';

    // Trouver le business associé au numéro WhatsApp
    const phoneNumberId = changes?.value?.metadata?.phone_number_id;
    const { data: business } = await supabase
      .from('businesses')
      .select('id, name')
      .eq('whatsapp_number', phoneNumberId)
      .single();

    if (!business) {
      console.warn('Business non trouvé pour le numéro:', phoneNumberId);
      return;
    }

    await processIncomingMessage(customerPhone, customerName, messageText, business);
  } catch (error) {
    console.error('Erreur webhook WhatsApp:', error);
  }
};

/**
 * POST /api/whatsapp/simulate
 * Simuler l'envoi d'un message WhatsApp (pour démo/tests)
 */
const simulateMessage = async (req, res) => {
  try {
    const { customerPhone, customerName, message } = req.body;
    const business = {
      id: req.user.business_id,
      name: 'Votre Commerce',
    };

    // Récupérer le nom du business
    const { data: businessData } = await supabase
      .from('businesses')
      .select('name')
      .eq('id', req.user.business_id)
      .single();

    if (businessData) business.name = businessData.name;

    const result = await processIncomingMessage(
      customerPhone || '+33600000000',
      customerName || 'Client Test',
      message,
      business,
      true // isSimulation
    );

    res.json(result);
  } catch (error) {
    console.error('Erreur simulateMessage:', error);
    res.status(500).json({ error: 'Erreur lors de la simulation' });
  }
};

/**
 * Traiter un message entrant : analyse IA + enregistrement + réponse suggérée
 */
const processIncomingMessage = async (customerPhone, customerName, messageText, business, isSimulation = false) => {
  // 1. Enregistrer le message entrant
  const { data: savedMessage, error: msgError } = await supabase
    .from('whatsapp_messages')
    .insert({
      business_id: business.id,
      customer_phone: customerPhone,
      customer_name: customerName,
      direction: 'inbound',
      message_text: messageText,
    })
    .select()
    .single();

  if (msgError) throw msgError;

  // 2. Analyser avec Claude
  const analysis = await analyzeAppointmentMessage(
    messageText,
    business.id,
    savedMessage.id
  );

  // 3. Mettre à jour le message avec l'analyse IA
  await supabase
    .from('whatsapp_messages')
    .update({
      ai_intent: analysis.intent,
      ai_extracted_data: analysis.extracted,
      ai_confidence: analysis.confidence,
      processed: true,
      processed_at: new Date().toISOString(),
    })
    .eq('id', savedMessage.id);

  // 4. Si intention claire de réservation avec toutes les infos, créer le RDV
  let createdAppointment = null;
  if (
    analysis.intent === 'book_appointment' &&
    analysis.confidence >= 0.8 &&
    analysis.extracted.date &&
    analysis.extracted.time &&
    analysis.needsMoreInfo?.length === 0
  ) {
    const startTime = new Date(`${analysis.extracted.date}T${analysis.extracted.time}`);
    const duration = analysis.extracted.duration || 30;
    const endTime = new Date(startTime.getTime() + duration * 60000);

    const { data: appointment } = await supabase
      .from('appointments')
      .insert({
        business_id: business.id,
        customer_name: analysis.extracted.clientName || customerName,
        customer_phone: customerPhone,
        service_name: analysis.extracted.service,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        status: 'confirmed',
        source: 'whatsapp',
        notes: analysis.extracted.notes,
      })
      .select()
      .single();

    if (appointment) {
      createdAppointment = appointment;

      // Lier le message au RDV créé
      await supabase
        .from('whatsapp_messages')
        .update({ appointment_id: appointment.id })
        .eq('id', savedMessage.id);
    }
  }

  // 5. Générer et enregistrer la réponse suggérée
  let responseText = analysis.responseMessage;
  if (createdAppointment) {
    responseText = await generateConfirmationMessage(createdAppointment, business.name);
  }

  // Enregistrer la réponse sortante
  await supabase
    .from('whatsapp_messages')
    .insert({
      business_id: business.id,
      customer_phone: customerPhone,
      customer_name: customerName,
      direction: 'outbound',
      message_text: responseText,
    });

  return {
    messageId: savedMessage.id,
    analysis,
    suggestedResponse: responseText,
    appointmentCreated: createdAppointment,
    isSimulation,
  };
};

/**
 * GET /api/whatsapp/messages
 * Historique des messages WhatsApp
 */
const getMessages = async (req, res) => {
  try {
    const { phone, page = 1, limit = 30 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = supabase
      .from('whatsapp_messages')
      .select('*', { count: 'exact' })
      .eq('business_id', req.user.business_id)
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1);

    if (phone) query = query.eq('customer_phone', phone);

    const { data, error, count } = await query;
    if (error) throw error;

    res.json({ messages: data, total: count });
  } catch (error) {
    console.error('Erreur getMessages:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

module.exports = { verifyWebhook, receiveWebhook, simulateMessage, getMessages };
