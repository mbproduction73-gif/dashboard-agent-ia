'use client';

import { useCallback, useEffect, useState } from 'react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { fr } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { appointmentsApi } from '@/lib/api';
import { Appointment } from '@/types';
import StatusBadge from '@/components/StatusBadge';
import AppointmentModal from '@/components/AppointmentModal';

const STATUS_FILTERS = [
  { label: 'Tous', value: '' },
  { label: 'Confirmés', value: 'confirmed' },
  { label: 'En attente', value: 'pending' },
  { label: 'Terminés', value: 'completed' },
  { label: 'Annulés', value: 'cancelled' },
];

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Appointment | null>(null);

  const fetchAppointments = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data } = await appointmentsApi.getAll({
        status: statusFilter || undefined,
        startDate: startOfMonth(selectedMonth).toISOString(),
        endDate: endOfMonth(selectedMonth).toISOString(),
        limit: 100,
      });
      setAppointments(data.appointments);
    } catch {
      toast.error('Erreur lors du chargement');
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, selectedMonth]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const handleDelete = async (id: string) => {
    if (!confirm('Annuler ce rendez-vous ?')) return;
    try {
      await appointmentsApi.delete(id);
      toast.success('Rendez-vous annulé');
      fetchAppointments();
    } catch {
      toast.error('Erreur lors de l\'annulation');
    }
  };

  const openCreate = () => { setEditTarget(null); setModalOpen(true); };
  const openEdit = (appt: Appointment) => { setEditTarget(appt); setModalOpen(true); };

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rendez-vous</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            {appointments.length} RDV en {format(selectedMonth, 'MMMM yyyy', { locale: fr })}
          </p>
        </div>
        <button onClick={openCreate} className="btn-primary">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nouveau rendez-vous
        </button>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Filtre mois */}
        <input
          type="month"
          value={format(selectedMonth, 'yyyy-MM')}
          onChange={(e) => setSelectedMonth(new Date(e.target.value + '-01'))}
          className="input w-auto"
        />

        {/* Filtre statut */}
        <div className="flex rounded-lg border border-gray-200 bg-white shadow-sm">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={`px-3 py-1.5 text-sm font-medium transition-colors first:rounded-l-lg last:rounded-r-lg ${
                statusFilter === f.value
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden p-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          </div>
        ) : appointments.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-center">
            <svg className="mb-4 h-12 w-12 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-sm text-gray-400">Aucun rendez-vous pour cette période</p>
            <button onClick={openCreate} className="mt-4 btn-primary text-sm">
              Créer le premier RDV
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-100 bg-gray-50">
                <tr>
                  {['Date & Heure', 'Client', 'Service', 'Statut', 'Source', 'Actions'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {appointments.map((appt) => (
                  <tr key={appt.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900">
                        {format(new Date(appt.start_time), 'dd MMM yyyy', { locale: fr })}
                      </p>
                      <p className="text-xs text-gray-500">
                        {format(new Date(appt.start_time), 'HH:mm')} →{' '}
                        {format(new Date(appt.end_time), 'HH:mm')}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900">{appt.customer_name}</p>
                      {appt.customer_phone && (
                        <p className="text-xs text-gray-500">{appt.customer_phone}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-gray-700">{appt.service_name || '—'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={appt.status} />
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                        {appt.source}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEdit(appt)}
                          className="rounded-lg p-1.5 text-gray-400 hover:bg-blue-50 hover:text-blue-600"
                          title="Modifier"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        {appt.status !== 'cancelled' && (
                          <button
                            onClick={() => handleDelete(appt.id)}
                            className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                            title="Annuler"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <AppointmentModal
          appointment={editTarget}
          onClose={() => setModalOpen(false)}
          onSaved={fetchAppointments}
        />
      )}
    </div>
  );
}
