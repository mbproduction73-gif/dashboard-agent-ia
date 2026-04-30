/**
 * Service d'intégration Claude (Anthropic)
 * Analyse les messages clients pour extraire les intentions de RDV
 */

const Anthropic = require('@anthropic-ai/sdk');
const supabase = require('../config/supabase');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Analyser un message client pour en extraire les informations de RDV
 * @param {string} message - Message du client
 * @param {string} businessId - ID du business pour contexte
 * @param {string} messageId - ID du message WhatsApp pour logging
 * @returns {object} Données extraites + intention
 */
const analyzeAppointmentMessage = async (message, businessId, messageId = null) => {
  // Récupérer les services disponibles pour contexte
  const { data: services } = await supabase
    .from('services')
    .select('name, duration, price')
    .eq('business_id', businessId)
    .eq('is_active', true);

  const servicesContext = services?.length
    ? `Services disponibles : ${services.map(s => `${s.name} (${s.duration} min, ${s.price}€)`).join(', ')}`
    : '';

  const systemPrompt = `Tu es un assistant pour un commerce qui prend des rendez-vous.
${servicesContext}

Ton rôle est d'analyser les messages des clients et d'extraire les informations pertinentes.
Aujourd'hui nous sommes le ${new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.

Réponds UNIQUEMENT en JSON valide avec cette structure exacte :
{
  "intent": "book_appointment" | "cancel_appointment" | "reschedule" | "inquiry" | "other",
  "confidence": 0.0 à 1.0,
  "extracted": {
    "date": "YYYY-MM-DD ou null",
    "time": "HH:MM ou null",
    "service": "nom du service ou null",
    "duration": durée en minutes ou null,
    "clientName": "nom du client ou null",
    "notes": "informations supplémentaires ou null"
  },
  "responseMessage": "message de réponse suggéré en français pour le client",
  "needsMoreInfo": ["liste des informations manquantes pour compléter la réservation"]
}`;

  const userPrompt = `Message du client : "${message}"`;

  let response = null;
  let success = true;
  let errorMessage = null;
  let inputTokens = 0;
  let outputTokens = 0;

  try {
    const completion = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    inputTokens = completion.usage.input_tokens;
    outputTokens = completion.usage.output_tokens;

    const rawText = completion.content[0].text.trim();

    // Extraire le JSON de la réponse
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Réponse IA invalide : pas de JSON trouvé');

    response = JSON.parse(jsonMatch[0]);
  } catch (error) {
    success = false;
    errorMessage = error.message;
    console.error('Erreur Claude:', error);

    // Réponse de fallback
    response = {
      intent: 'other',
      confidence: 0,
      extracted: { date: null, time: null, service: null, duration: null, clientName: null, notes: null },
      responseMessage: 'Je n\'ai pas pu analyser votre message. Pouvez-vous préciser votre demande ?',
      needsMoreInfo: ['date', 'heure', 'service'],
    };
  }

  // Logger l'analyse dans Supabase
  if (businessId) {
    await supabase.from('ai_logs').insert({
      business_id: businessId,
      message_id: messageId,
      prompt_text: `${systemPrompt}\n\n${userPrompt}`,
      response_text: JSON.stringify(response),
      model_used: 'claude-sonnet-4-6',
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      success,
      error_message: errorMessage,
    }).catch(console.error);
  }

  return response;
};

/**
 * Générer un message de confirmation de RDV
 * @param {object} appointment - Données du rendez-vous
 * @param {string} businessName - Nom du commerce
 */
const generateConfirmationMessage = async (appointment, businessName) => {
  const date = new Date(appointment.start_time).toLocaleDateString('fr-FR', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
  const time = new Date(appointment.start_time).toLocaleTimeString('fr-FR', {
    hour: '2-digit', minute: '2-digit'
  });

  try {
    const completion = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 256,
      messages: [{
        role: 'user',
        content: `Génère un court message de confirmation de rendez-vous (max 3 phrases) en français pour :
- Commerce : ${businessName}
- Client : ${appointment.customer_name}
- Service : ${appointment.service_name || 'Rendez-vous'}
- Date : ${date} à ${time}
Ton professionnel et chaleureux.`,
      }],
    });

    return completion.content[0].text;
  } catch (error) {
    // Message par défaut si Claude n'est pas disponible
    return `✅ Votre rendez-vous est confirmé chez ${businessName} !\n📅 ${date} à ${time}\n💈 ${appointment.service_name || 'Rendez-vous'}\nÀ bientôt !`;
  }
};

module.exports = { analyzeAppointmentMessage, generateConfirmationMessage };
