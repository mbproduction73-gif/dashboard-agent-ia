import { AppointmentStatus } from '@/types';

const STATUS_LABELS: Record<AppointmentStatus, string> = {
  pending:   'En attente',
  confirmed: 'Confirmé',
  cancelled: 'Annulé',
  completed: 'Terminé',
  no_show:   'Absent',
};

export default function StatusBadge({ status }: { status: AppointmentStatus }) {
  return (
    <span className={`badge-${status}`}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}
