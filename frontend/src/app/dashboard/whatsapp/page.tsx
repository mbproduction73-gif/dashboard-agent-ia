'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { whatsappApi, aiApi } from '@/lib/api';
import { AIAnalysis } from '@/types';

interface SimulateForm {
  customerName: string;
  customerPhone: string;
  message: string;
}

interface SimulationResult {
  analysis: AIAnalysis;
  suggestedResponse: string;
  appointmentCreated: { customer_name: string; start_time: string; service_name?: string } | null;
}

// Messages de démo pour tester rapidement
const DEMO_MESSAGES = [
  "Bonjour, je voudrais prendre rendez-vous pour une coupe femme vendredi à 14h",
  "Salut ! Est-ce que vous avez de la place demain matin pour un balayage ?",
  "Bonjour, je souhaite annuler mon rendez-vous de jeudi",
  "C'est combien pour une couleur complète ?",
  "Je m'appelle Sophie, je voudrais réserver une coupe homme pour lundi 10h",
];

export default function WhatsAppPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [quickAnalysis, setQuickAnalysis] = useState<AIAnalysis | null>(null);

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<SimulateForm>({
    defaultValues: { customerPhone: '+33612345678' },
  });

  const onSubmit = async (data: SimulateForm) => {
    setIsLoading(true);
    setResult(null);
    try {
      const { data: res } = await whatsappApi.simulate(data);
      setResult(res);
      toast.success('Message simulé avec succès');
    } catch {
      toast.error('Erreur lors de la simulation');
    } finally {
      setIsLoading(false);
    }
  };

  const analyzeQuick = async (msg: string) => {
    setValue('message', msg);
    setIsLoading(true);
    try {
      const { data } = await aiApi.analyze(msg);
      setQuickAnalysis(data);
    } catch {
      toast.error('Erreur d\'analyse IA');
    } finally {
      setIsLoading(false);
    }
  };

  const getIntentLabel = (intent: string) => {
    const map: Record<string, string> = {
      book_appointment: '📅 Réservation',
      cancel_appointment: '❌ Annulation',
      reschedule: '🔄 Reprogrammation',
      inquiry: '❓ Question',
      other: '💬 Autre',
    };
    return map[intent] || intent;
  };

  const getConfidenceColor = (conf: number) => {
    if (conf >= 0.8) return 'text-green-600 bg-green-50';
    if (conf >= 0.5) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">WhatsApp IA</h1>
        <p className="mt-1 text-sm text-gray-500">
          Simulez la réception d&apos;un message client et voyez comment l&apos;IA l&apos;analyse pour créer automatiquement un rendez-vous.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Panel de simulation */}
        <div className="space-y-4">
          <div className="card">
            <h2 className="mb-4 font-semibold text-gray-900">Simuler un message entrant</h2>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Nom client</label>
                  <input
                    {...register('customerName', { required: 'Requis' })}
                    placeholder="Marie Martin"
                    className="input"
                  />
                  {errors.customerName && <p className="mt-1 text-xs text-red-500">{errors.customerName.message}</p>}
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Téléphone</label>
                  <input
                    {...register('customerPhone', { required: 'Requis' })}
                    placeholder="+33612345678"
                    className="input"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Message WhatsApp</label>
                <textarea
                  {...register('message', { required: 'Message requis' })}
                  rows={4}
                  placeholder="Bonjour, je voudrais prendre RDV pour..."
                  className="input resize-none"
                />
                {errors.message && <p className="mt-1 text-xs text-red-500">{errors.message.message}</p>}
              </div>

              <button type="submit" disabled={isLoading} className="btn-primary w-full">
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Analyse en cours...
                  </span>
                ) : (
                  <>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                    Envoyer & analyser
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Messages de démo */}
          <div className="card">
            <h3 className="mb-3 text-sm font-semibold text-gray-700">Messages de démo</h3>
            <div className="space-y-2">
              {DEMO_MESSAGES.map((msg, i) => (
                <button
                  key={i}
                  onClick={() => analyzeQuick(msg)}
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-left text-xs text-gray-600 transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                >
                  &ldquo;{msg}&rdquo;
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Résultats */}
        <div className="space-y-4">
          {/* Analyse rapide */}
          {quickAnalysis && (
            <div className="card border-purple-100 bg-purple-50/30">
              <div className="mb-3 flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-purple-500" />
                <h3 className="text-sm font-semibold text-gray-900">Analyse rapide IA</h3>
              </div>
              <AnalysisDisplay analysis={quickAnalysis} getIntentLabel={getIntentLabel} getConfidenceColor={getConfidenceColor} />
            </div>
          )}

          {/* Résultat simulation complète */}
          {result && (
            <>
              {result.appointmentCreated && (
                <div className="rounded-xl border border-green-200 bg-green-50 p-4">
                  <div className="flex items-center gap-2 text-green-800">
                    <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm font-semibold">Rendez-vous créé automatiquement !</p>
                  </div>
                  <p className="mt-1 text-xs text-green-700">
                    {result.appointmentCreated.customer_name} — {new Date(result.appointmentCreated.start_time).toLocaleString('fr-FR')}
                    {result.appointmentCreated.service_name ? ` — ${result.appointmentCreated.service_name}` : ''}
                  </p>
                </div>
              )}

              <div className="card">
                <h3 className="mb-3 text-sm font-semibold text-gray-900">Analyse du message</h3>
                <AnalysisDisplay analysis={result.analysis} getIntentLabel={getIntentLabel} getConfidenceColor={getConfidenceColor} />
              </div>

              <div className="card border-green-100">
                <h3 className="mb-2 text-sm font-semibold text-gray-900">Réponse suggérée</h3>
                <div className="rounded-lg bg-green-50 p-3">
                  <p className="whitespace-pre-wrap text-sm text-green-800">{result.suggestedResponse}</p>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(result.suggestedResponse);
                    toast.success('Copié !');
                  }}
                  className="mt-2 btn-secondary text-xs"
                >
                  Copier la réponse
                </button>
              </div>
            </>
          )}

          {!result && !quickAnalysis && (
            <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 py-20 text-center">
              <svg className="mb-3 h-12 w-12 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <p className="text-sm text-gray-400">Les résultats de l&apos;analyse IA apparaîtront ici</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Composant réutilisable pour afficher l'analyse
function AnalysisDisplay({
  analysis,
  getIntentLabel,
  getConfidenceColor,
}: {
  analysis: AIAnalysis;
  getIntentLabel: (i: string) => string;
  getConfidenceColor: (c: number) => string;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="rounded-lg bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700">
          {getIntentLabel(analysis.intent)}
        </span>
        <span className={`rounded-lg px-2 py-1 text-xs font-semibold ${getConfidenceColor(analysis.confidence)}`}>
          Confiance : {Math.round(analysis.confidence * 100)}%
        </span>
      </div>

      {/* Données extraites */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: 'Date', value: analysis.extracted.date },
          { label: 'Heure', value: analysis.extracted.time },
          { label: 'Service', value: analysis.extracted.service },
          { label: 'Client', value: analysis.extracted.clientName },
          { label: 'Durée', value: analysis.extracted.duration ? `${analysis.extracted.duration} min` : null },
          { label: 'Notes', value: analysis.extracted.notes },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-lg bg-gray-50 px-3 py-2">
            <p className="text-xs text-gray-400">{label}</p>
            <p className="text-sm font-medium text-gray-800">{value || <span className="text-gray-300">—</span>}</p>
          </div>
        ))}
      </div>

      {analysis.needsMoreInfo && analysis.needsMoreInfo.length > 0 && (
        <div className="rounded-lg bg-yellow-50 px-3 py-2">
          <p className="text-xs font-medium text-yellow-700">Informations manquantes :</p>
          <p className="text-xs text-yellow-600">{analysis.needsMoreInfo.join(', ')}</p>
        </div>
      )}
    </div>
  );
}
