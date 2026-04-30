'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { appointmentsApi } from '@/lib/api';
import { Appointment, DashboardStats } from '@/types';
import { getStoredUser } from '@/lib/auth';
import StatusBadge from '@/components/StatusBadge';

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}

const StatCard = ({ label, value, icon, color }: StatCardProps) => (
  <div className="card flex items-center gap-4">
    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${color}`}>
      {icon}
    </div>
    <div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-500">{label}</p>
    </div>
  </div>
);

export default function DashboardPage() {
  const user = getStoredUser();
  const [stats, setStats] = useState<DashboardStats>({ today: 0, thisMonth: 0, pending: 0, total: 0 });
  const [upcoming, setUpcoming] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [statsRes, apptRes] = await Promise.all([
          appointmentsApi.getStats(),
          appointmentsApi.getAll({
            startDate: new Date().toISOString(),
            limit: 5,
            status: 'confirmed',
          }),
        ]);
        setStats(statsRes.data.stats);
        setUpcoming(apptRes.data.appointments);
      } catch (error) {
        console.error('Erreur chargement dashboard:', error);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const today = format(new Date(), "EEEE d MMMM yyyy", { locale: fr });

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Bonjour, {user?.fullName?.split(' ')[0]} 👋
          </h1>
          <p className="mt-1 text-sm capitalize text-gray-500">{today}</p>
        </div>
        <Link href="/dashboard/appointments" className="btn-primary">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nouveau rendez-vous
        </Link>
      </div>

      {/* Stats cards */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card h-24 animate-pulse bg-gray-100" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            label="Aujourd'hui"
            value={stats.today}
            color="bg-blue-50"
            icon={<svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
          />
          <StatCard
            label="Ce mois"
            value={stats.thisMonth}
            color="bg-green-50"
            icon={<svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
          />
          <StatCard
            label="En attente"
            value={stats.pending}
            color="bg-yellow-50"
            icon={<svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          />
          <StatCard
            label="Total RDV"
            value={stats.total}
            color="bg-purple-50"
            icon={<svg className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
          />
        </div>
      )}

      {/* Prochains RDV */}
      <div className="card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Prochains rendez-vous</h2>
          <Link href="/dashboard/appointments" className="text-sm font-medium text-blue-600 hover:text-blue-700">
            Voir tout →
          </Link>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-lg bg-gray-100" />
            ))}
          </div>
        ) : upcoming.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-gray-200 py-10 text-center">
            <svg className="mx-auto mb-3 h-10 w-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-sm text-gray-400">Aucun rendez-vous à venir</p>
            <Link href="/dashboard/appointments" className="mt-3 inline-block text-sm font-medium text-blue-600">
              Ajouter le premier
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {upcoming.map((appt) => (
              <li key={appt.id} className="flex items-center gap-4 py-3">
                <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-xl bg-blue-50">
                  <span className="text-xs font-bold leading-none text-blue-700">
                    {format(new Date(appt.start_time), 'dd', { locale: fr })}
                  </span>
                  <span className="text-xs uppercase leading-none text-blue-500">
                    {format(new Date(appt.start_time), 'MMM', { locale: fr })}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium text-gray-900">{appt.customer_name}</p>
                  <p className="text-xs text-gray-500">
                    {format(new Date(appt.start_time), 'HH:mm')} · {appt.service_name || 'RDV'}
                  </p>
                </div>
                <StatusBadge status={appt.status} />
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Accès rapides */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Link href="/dashboard/whatsapp" className="card group flex items-center gap-4 transition-shadow hover:shadow-md">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-green-50 transition-colors group-hover:bg-green-100">
            <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-gray-900">Simulateur WhatsApp IA</p>
            <p className="text-sm text-gray-500">Tester l&apos;analyse de messages clients</p>
          </div>
        </Link>

        <Link href="/dashboard/settings" className="card group flex items-center gap-4 transition-shadow hover:shadow-md">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-purple-50 transition-colors group-hover:bg-purple-100">
            <svg className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-gray-900">Paramètres</p>
            <p className="text-sm text-gray-500">Services, profil, notifications</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
