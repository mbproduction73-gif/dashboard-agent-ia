'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { Appointment, AppointmentFormData, Service } from '@/types';
import { appointmentsApi, servicesApi } from '@/lib/api';

interface Props {
  appointment?: Appointment | null;
  defaultStartTime?: string;
  onClose: () => void;
  onSaved: () => void;
}

export default function AppointmentModal({ appointment, defaultStartTime, onClose, onSaved }: Props) {
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const isEdit = !!appointment;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<AppointmentFormData>({
    defaultValues: appointment
      ? {
          customerName: appointment.customer_name,
          customerPhone: appointment.customer_phone || '',
          serviceId: appointment.service_id || '',
          serviceName: appointment.service_name || '',
          startTime: format(new Date(appointment.start_time), "yyyy-MM-dd'T'HH:mm"),
          endTime: format(new Date(appointment.end_time), "yyyy-MM-dd'T'HH:mm"),
          notes: appointment.notes || '',
          status: appointment.status,
        }
      : {
          startTime: defaultStartTime || format(new Date(), "yyyy-MM-dd'T'HH:mm"),
          status: 'confirmed',
        },
  });

  const selectedServiceId = watch('serviceId');

  // Charger les services et auto-compléter la durée
  useEffect(() => {
    servicesApi.getAll().then(({ data }) => setServices(data.services));
  }, []);

  useEffect(() => {
    if (!selectedServiceId) return;
    const svc = services.find((s) => s.id === selectedServiceId);
    if (!svc) return;
    setValue('serviceName', svc.name);
    // Calculer end_time automatiquement
    const start = watch('startTime');
    if (start) {
      const endDate = new Date(start);
      endDate.setMinutes(endDate.getMinutes() + svc.duration);
      setValue('endTime', format(endDate, "yyyy-MM-dd'T'HH:mm"));
    }
  }, [selectedServiceId, services, setValue, watch]);

  const onSubmit = async (data: AppointmentFormData) => {
    setIsLoading(true);
    try {
      if (isEdit) {
        await appointmentsApi.update(appointment.id, data);
        toast.success('Rendez-vous modifié');
      } else {
        await appointmentsApi.create(data);
        toast.success('Rendez-vous créé');
      }
      onSaved();
      onClose();
    } catch (error: unknown) {
      const msg =
        (error as { response?: { data?: { error?: string } } })?.response?.data?.error
        || 'Erreur lors de la sauvegarde';
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg animate-fade-in rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEdit ? 'Modifier le rendez-vous' : 'Nouveau rendez-vous'}
          </h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-6">
          {/* Client */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Nom du client *</label>
              <input
                {...register('customerName', { required: 'Nom requis' })}
                placeholder="Marie Martin"
                className="input"
              />
              {errors.customerName && <p className="mt-1 text-xs text-red-500">{errors.customerName.message}</p>}
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Téléphone</label>
              <input
                {...register('customerPhone')}
                type="tel"
                placeholder="+33612345678"
                className="input"
              />
            </div>
          </div>

          {/* Service */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Service</label>
            <select {...register('serviceId')} className="input">
              <option value="">-- Sélectionner un service --</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.duration} min{s.price ? ` · ${s.price}€` : ''})
                </option>
              ))}
            </select>
          </div>

          {/* Horaires */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Début *</label>
              <input
                {...register('startTime', { required: 'Heure de début requise' })}
                type="datetime-local"
                className="input"
              />
              {errors.startTime && <p className="mt-1 text-xs text-red-500">{errors.startTime.message}</p>}
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Fin *</label>
              <input
                {...register('endTime', { required: 'Heure de fin requise' })}
                type="datetime-local"
                className="input"
              />
              {errors.endTime && <p className="mt-1 text-xs text-red-500">{errors.endTime.message}</p>}
            </div>
          </div>

          {/* Statut (edit uniquement) */}
          {isEdit && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Statut</label>
              <select {...register('status')} className="input">
                <option value="pending">En attente</option>
                <option value="confirmed">Confirmé</option>
                <option value="completed">Terminé</option>
                <option value="cancelled">Annulé</option>
                <option value="no_show">Absent</option>
              </select>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">Notes</label>
            <textarea
              {...register('notes')}
              rows={2}
              placeholder="Informations supplémentaires..."
              className="input resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Annuler
            </button>
            <button type="submit" disabled={isLoading} className="btn-primary flex-1">
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Sauvegarde...
                </span>
              ) : isEdit ? 'Modifier' : 'Créer le RDV'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
