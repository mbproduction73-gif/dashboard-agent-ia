// =============================================================
// Types TypeScript globaux
// =============================================================

export interface User {
  id: string;
  fullName: string;
  email: string;
  role: 'owner' | 'staff' | 'admin';
  businessId: string;
  businessName: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
}

export type AppointmentStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';
export type AppointmentSource = 'manual' | 'whatsapp' | 'online' | 'ai';

export interface Appointment {
  id: string;
  business_id: string;
  customer_id: string | null;
  service_id: string | null;
  staff_id: string | null;
  start_time: string;
  end_time: string;
  status: AppointmentStatus;
  notes: string | null;
  customer_name: string;
  customer_phone: string | null;
  service_name: string | null;
  source: AppointmentSource;
  reminder_sent: boolean;
  created_at: string;
  // Relations
  customers?: Customer;
  services?: Service;
}

export interface Service {
  id: string;
  business_id: string;
  name: string;
  description: string | null;
  duration: number;
  price: number | null;
  color: string;
  is_active: boolean;
}

export interface Customer {
  id: string;
  business_id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  whatsapp_number: string | null;
  notes: string | null;
}

export interface WhatsAppMessage {
  id: string;
  business_id: string;
  customer_phone: string;
  customer_name: string;
  direction: 'inbound' | 'outbound';
  message_text: string;
  ai_intent: string | null;
  ai_extracted_data: Record<string, unknown> | null;
  ai_confidence: number | null;
  appointment_id: string | null;
  processed: boolean;
  created_at: string;
}

export interface DashboardStats {
  today: number;
  thisMonth: number;
  pending: number;
  total: number;
}

export interface AIAnalysis {
  intent: 'book_appointment' | 'cancel_appointment' | 'reschedule' | 'inquiry' | 'other';
  confidence: number;
  extracted: {
    date: string | null;
    time: string | null;
    service: string | null;
    duration: number | null;
    clientName: string | null;
    notes: string | null;
  };
  responseMessage: string;
  needsMoreInfo: string[];
}

export interface AppointmentFormData {
  customerName: string;
  customerPhone?: string;
  customerId?: string;
  serviceId?: string;
  serviceName?: string;
  staffId?: string;
  startTime: string;
  endTime: string;
  notes?: string;
  status?: AppointmentStatus;
}
