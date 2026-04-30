-- =============================================================
-- SCHÉMA SUPABASE - Appointment Booking SaaS
-- =============================================================
-- Exécuter ce fichier dans l'éditeur SQL de Supabase

-- Extension pour UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================
-- TABLE : businesses (commerces clients du SaaS)
-- =============================================================
CREATE TABLE IF NOT EXISTS businesses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(100) NOT NULL, -- 'coiffeur', 'restaurant', 'médecin', etc.
  phone VARCHAR(20),
  email VARCHAR(255) UNIQUE NOT NULL,
  address TEXT,
  whatsapp_number VARCHAR(20),
  logo_url TEXT,
  settings JSONB DEFAULT '{}', -- config horaires, services, etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================
-- TABLE : users (comptes utilisateurs / gérants)
-- =============================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_id UUID UNIQUE, -- lié à Supabase Auth
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  role VARCHAR(50) DEFAULT 'owner', -- 'owner', 'staff', 'admin'
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================
-- TABLE : services (services proposés par le commerce)
-- =============================================================
CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  duration INTEGER NOT NULL DEFAULT 30, -- durée en minutes
  price DECIMAL(10, 2),
  color VARCHAR(7) DEFAULT '#3B82F6', -- couleur hex pour le calendrier
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================
-- TABLE : customers (clients du commerce)
-- =============================================================
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  whatsapp_number VARCHAR(20),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================
-- TABLE : appointments (rendez-vous)
-- =============================================================
CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  service_id UUID REFERENCES services(id) ON DELETE SET NULL,
  staff_id UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Informations temporelles
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,

  -- Statut du RDV
  status VARCHAR(50) DEFAULT 'pending',
  -- 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show'

  -- Notes et infos additionnelles
  notes TEXT,
  customer_name VARCHAR(255), -- dénormalisé pour affichage rapide
  customer_phone VARCHAR(20),
  service_name VARCHAR(255),

  -- Source de création du RDV
  source VARCHAR(50) DEFAULT 'manual',
  -- 'manual' | 'whatsapp' | 'online' | 'ai'

  -- Rappels envoyés
  reminder_sent BOOLEAN DEFAULT FALSE,
  reminder_sent_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================
-- TABLE : whatsapp_messages (historique conversations WhatsApp)
-- =============================================================
CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  customer_phone VARCHAR(20) NOT NULL,
  customer_name VARCHAR(255),

  -- Message
  direction VARCHAR(10) NOT NULL, -- 'inbound' | 'outbound'
  message_text TEXT NOT NULL,
  message_type VARCHAR(50) DEFAULT 'text',

  -- Analyse IA
  ai_intent VARCHAR(100), -- 'book_appointment' | 'cancel' | 'inquiry' | 'other'
  ai_extracted_data JSONB, -- date, heure, service extraits par Claude
  ai_confidence DECIMAL(3, 2), -- score 0-1

  -- Lien avec RDV créé
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,

  -- Statut traitement
  processed BOOLEAN DEFAULT FALSE,
  processed_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================
-- TABLE : ai_logs (logs des analyses Claude)
-- =============================================================
CREATE TABLE IF NOT EXISTS ai_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  message_id UUID REFERENCES whatsapp_messages(id) ON DELETE SET NULL,

  -- Prompt et réponse
  prompt_text TEXT NOT NULL,
  response_text TEXT,
  model_used VARCHAR(100) DEFAULT 'claude-sonnet-4-6',

  -- Tokens utilisés (pour facturation)
  input_tokens INTEGER,
  output_tokens INTEGER,

  -- Résultat
  success BOOLEAN DEFAULT TRUE,
  error_message TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================
-- INDEX pour performances
-- =============================================================
CREATE INDEX idx_appointments_business_id ON appointments(business_id);
CREATE INDEX idx_appointments_start_time ON appointments(start_time);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_appointments_customer_id ON appointments(customer_id);
CREATE INDEX idx_whatsapp_messages_business_id ON whatsapp_messages(business_id);
CREATE INDEX idx_whatsapp_messages_phone ON whatsapp_messages(customer_phone);
CREATE INDEX idx_customers_business_id ON customers(business_id);
CREATE INDEX idx_services_business_id ON services(business_id);
CREATE INDEX idx_users_auth_id ON users(auth_id);
CREATE INDEX idx_users_business_id ON users(business_id);

-- =============================================================
-- TRIGGERS : mise à jour automatique updated_at
-- =============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_businesses_updated_at
  BEFORE UPDATE ON businesses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_appointments_updated_at
  BEFORE UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================================
-- ROW LEVEL SECURITY (RLS) - Isolation par business
-- =============================================================
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;

-- Politique : un utilisateur ne voit que les données de son business
CREATE POLICY "users_own_business" ON users
  FOR ALL USING (auth.uid() = auth_id);

CREATE POLICY "appointments_own_business" ON appointments
  FOR ALL USING (
    business_id IN (
      SELECT business_id FROM users WHERE auth_id = auth.uid()
    )
  );

CREATE POLICY "services_own_business" ON services
  FOR ALL USING (
    business_id IN (
      SELECT business_id FROM users WHERE auth_id = auth.uid()
    )
  );

CREATE POLICY "customers_own_business" ON customers
  FOR ALL USING (
    business_id IN (
      SELECT business_id FROM users WHERE auth_id = auth.uid()
    )
  );

CREATE POLICY "whatsapp_own_business" ON whatsapp_messages
  FOR ALL USING (
    business_id IN (
      SELECT business_id FROM users WHERE auth_id = auth.uid()
    )
  );

-- =============================================================
-- DONNÉES DE DÉMO (optionnel - commenter en production)
-- =============================================================
INSERT INTO businesses (id, name, type, email, phone, whatsapp_number) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Salon Élégance', 'coiffeur', 'demo@elegance.fr', '+33612345678', '+33612345678');

INSERT INTO services (business_id, name, duration, price, color) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Coupe Femme', 45, 35.00, '#8B5CF6'),
  ('11111111-1111-1111-1111-111111111111', 'Coupe Homme', 30, 20.00, '#3B82F6'),
  ('11111111-1111-1111-1111-111111111111', 'Couleur', 90, 65.00, '#EC4899'),
  ('11111111-1111-1111-1111-111111111111', 'Balayage', 120, 85.00, '#F59E0B');
