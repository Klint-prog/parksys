-- ================================================
-- PARKING SYSTEM - DATABASE INITIALIZATION
-- ================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ================================================
-- USERS TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'operator' CHECK (role IN ('admin', 'operator', 'viewer')),
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- PARKING SPOTS TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS parking_spots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    spot_number VARCHAR(10) UNIQUE NOT NULL,
    floor VARCHAR(10) NOT NULL DEFAULT 'T',
    section VARCHAR(10),
    spot_type VARCHAR(20) NOT NULL DEFAULT 'standard' CHECK (spot_type IN ('standard', 'disabled', 'reserved', 'vip', 'electric')),
    status VARCHAR(20) NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'reserved', 'maintenance')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- VEHICLES TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plate VARCHAR(20) UNIQUE NOT NULL,
    brand VARCHAR(50),
    model VARCHAR(50),
    color VARCHAR(30),
    vehicle_type VARCHAR(20) DEFAULT 'car' CHECK (vehicle_type IN ('car', 'motorcycle', 'truck', 'van')),
    owner_name VARCHAR(100),
    owner_phone VARCHAR(20),
    owner_email VARCHAR(150),
    is_monthly BOOLEAN DEFAULT false,
    monthly_plan_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- PRICING PLANS TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS pricing_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    plan_type VARCHAR(20) NOT NULL CHECK (plan_type IN ('hourly', 'daily', 'monthly', 'event')),
    vehicle_type VARCHAR(20) DEFAULT 'car',
    price_per_hour DECIMAL(10,2),
    price_per_day DECIMAL(10,2),
    monthly_price DECIMAL(10,2),
    max_daily_price DECIMAL(10,2),
    grace_period_minutes INTEGER DEFAULT 15,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- PARKING SESSIONS TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS parking_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_code VARCHAR(20) UNIQUE NOT NULL DEFAULT 'PKG-' || UPPER(SUBSTR(MD5(RANDOM()::TEXT), 1, 8)),
    vehicle_id UUID REFERENCES vehicles(id),
    spot_id UUID REFERENCES parking_spots(id),
    pricing_plan_id UUID REFERENCES pricing_plans(id),
    operator_id UUID REFERENCES users(id),
    plate VARCHAR(20) NOT NULL,
    entry_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    exit_time TIMESTAMPTZ,
    duration_minutes INTEGER,
    calculated_price DECIMAL(10,2),
    discount_percent DECIMAL(5,2) DEFAULT 0,
    final_price DECIMAL(10,2),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- PAYMENTS TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES parking_sessions(id),
    payment_method VARCHAR(30) NOT NULL CHECK (payment_method IN ('cash', 'credit_card', 'debit_card', 'pix', 'monthly_plan')),
    amount DECIMAL(10,2) NOT NULL,
    change_amount DECIMAL(10,2) DEFAULT 0,
    card_brand VARCHAR(30),
    card_last_digits VARCHAR(4),
    transaction_id VARCHAR(100),
    authorization_code VARCHAR(50),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'declined', 'cancelled', 'refunded')),
    payment_time TIMESTAMPTZ DEFAULT NOW(),
    operator_id UUID REFERENCES users(id),
    receipt_number VARCHAR(20) UNIQUE DEFAULT 'REC-' || UPPER(SUBSTR(MD5(RANDOM()::TEXT), 1, 8)),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- MONTHLY PLANS TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS monthly_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_id UUID NOT NULL REFERENCES vehicles(id),
    pricing_plan_id UUID NOT NULL REFERENCES pricing_plans(id),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    monthly_price DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- AUDIT LOG TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50),
    entity_id UUID,
    old_data JSONB,
    new_data JSONB,
    ip_address INET,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- CARD MACHINE TRANSACTIONS TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS card_machine_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_id UUID REFERENCES payments(id),
    terminal_id VARCHAR(50),
    merchant_id VARCHAR(50),
    transaction_type VARCHAR(20) CHECK (transaction_type IN ('credit', 'debit', 'pix')),
    installments INTEGER DEFAULT 1,
    gross_amount DECIMAL(10,2),
    net_amount DECIMAL(10,2),
    fees DECIMAL(10,2),
    nsu VARCHAR(20),
    authorization_code VARCHAR(20),
    card_brand VARCHAR(20),
    card_last_digits VARCHAR(4),
    holder_name VARCHAR(100),
    response_code VARCHAR(10),
    response_message TEXT,
    payload JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- INDEXES
-- ================================================
CREATE INDEX IF NOT EXISTS idx_sessions_plate ON parking_sessions(plate);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON parking_sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_entry_time ON parking_sessions(entry_time);
CREATE INDEX IF NOT EXISTS idx_payments_session ON payments(session_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_spots_status ON parking_spots(status);
CREATE INDEX IF NOT EXISTS idx_vehicles_plate ON vehicles(plate);

-- ================================================
-- FUNCTIONS & TRIGGERS
-- ================================================

-- Update updated_at automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_spots_updated_at BEFORE UPDATE ON parking_spots FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON vehicles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON parking_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Calculate duration and price on exit
CREATE OR REPLACE FUNCTION calculate_session_price()
RETURNS TRIGGER AS $$
DECLARE
    plan pricing_plans%ROWTYPE;
    duration_mins INTEGER;
    price DECIMAL(10,2);
BEGIN
    IF NEW.exit_time IS NOT NULL AND OLD.exit_time IS NULL THEN
        duration_mins := EXTRACT(EPOCH FROM (NEW.exit_time - NEW.entry_time)) / 60;
        NEW.duration_minutes := duration_mins;
        
        SELECT * INTO plan FROM pricing_plans WHERE id = NEW.pricing_plan_id;
        
        IF plan.id IS NOT NULL THEN
            -- Calculate based on hours
            price := CEIL(duration_mins::DECIMAL / 60) * plan.price_per_hour;
            
            -- Apply daily max if exists
            IF plan.max_daily_price IS NOT NULL AND price > plan.max_daily_price THEN
                price := plan.max_daily_price;
            END IF;
            
            -- Apply grace period (free if within grace period)
            IF duration_mins <= plan.grace_period_minutes THEN
                price := 0;
            END IF;
            
            NEW.calculated_price := price;
            NEW.final_price := price * (1 - COALESCE(NEW.discount_percent, 0) / 100);
        END IF;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER calc_session_price BEFORE UPDATE ON parking_sessions FOR EACH ROW EXECUTE FUNCTION calculate_session_price();

-- ================================================
-- SEED DATA
-- ================================================

-- Default admin user (password: Admin@2024)
INSERT INTO users (name, email, password_hash, role) VALUES
('Administrador', 'admin@parkingsystem.com', crypt('Admin@2024', gen_salt('bf')), 'admin'),
('Operador João', 'joao@parkingsystem.com', crypt('Oper@2024', gen_salt('bf')), 'operator'),
('Viewer Ana', 'ana@parkingsystem.com', crypt('View@2024', gen_salt('bf')), 'viewer')
ON CONFLICT (email) DO NOTHING;

-- Parking spots (Ground floor: A, First floor: B, Second floor: C)
DO $$
DECLARE
    floor_letter TEXT;
    spot_num INTEGER;
    spot_type TEXT;
BEGIN
    FOREACH floor_letter IN ARRAY ARRAY['A', 'B', 'C'] LOOP
        FOR spot_num IN 1..30 LOOP
            IF spot_num <= 3 THEN
                spot_type := 'disabled';
            ELSIF spot_num <= 5 THEN
                spot_type := 'electric';
            ELSIF spot_num <= 8 THEN
                spot_type := 'vip';
            ELSE
                spot_type := 'standard';
            END IF;
            
            INSERT INTO parking_spots (spot_number, floor, section, spot_type)
            VALUES (floor_letter || LPAD(spot_num::TEXT, 2, '0'), floor_letter, 
                    CASE WHEN spot_num <= 15 THEN 'L' ELSE 'R' END, spot_type)
            ON CONFLICT (spot_number) DO NOTHING;
        END LOOP;
    END LOOP;
END $$;

-- Pricing plans
INSERT INTO pricing_plans (name, description, plan_type, vehicle_type, price_per_hour, max_daily_price, grace_period_minutes, monthly_price) VALUES
('Carro - Padrão', 'Tarifa padrão para automóveis', 'hourly', 'car', 8.00, 60.00, 15, NULL),
('Moto - Padrão', 'Tarifa padrão para motos', 'hourly', 'motorcycle', 4.00, 30.00, 15, NULL),
('Caminhão - Padrão', 'Tarifa para veículos de carga', 'hourly', 'truck', 15.00, 120.00, 15, NULL),
('Mensalista - Carro', 'Plano mensal para carros', 'monthly', 'car', NULL, NULL, 0, 350.00),
('Mensalista - Moto', 'Plano mensal para motos', 'monthly', 'motorcycle', NULL, NULL, 0, 180.00),
('Evento Especial', 'Tarifa especial para eventos', 'event', 'car', 5.00, 25.00, 0, NULL)
ON CONFLICT DO NOTHING;

-- Sample vehicles
INSERT INTO vehicles (plate, brand, model, color, vehicle_type, owner_name, owner_phone) VALUES
('ABC-1234', 'Toyota', 'Corolla', 'Prata', 'car', 'Carlos Silva', '(11) 99999-1111'),
('XYZ-5678', 'Honda', 'CG 160', 'Preta', 'motorcycle', 'Maria Santos', '(11) 99999-2222'),
('DEF-9012', 'Volkswagen', 'Gol', 'Branca', 'car', 'José Oliveira', '(11) 99999-3333')
ON CONFLICT (plate) DO NOTHING;

-- Sample active sessions
INSERT INTO parking_sessions (plate, spot_id, pricing_plan_id, operator_id, entry_time, status)
SELECT 
    'ABC-1234',
    s.id,
    p.id,
    u.id,
    NOW() - INTERVAL '2 hours',
    'active'
FROM parking_spots s, pricing_plans p, users u
WHERE s.spot_number = 'A01' AND p.name = 'Carro - Padrão' AND u.email = 'joao@parkingsystem.com'
ON CONFLICT DO NOTHING;

INSERT INTO parking_sessions (plate, spot_id, pricing_plan_id, operator_id, entry_time, status)
SELECT 
    'XYZ-5678',
    s.id,
    p.id,
    u.id,
    NOW() - INTERVAL '45 minutes',
    'active'
FROM parking_spots s, pricing_plans p, users u
WHERE s.spot_number = 'A06' AND p.name = 'Moto - Padrão' AND u.email = 'joao@parkingsystem.com'
ON CONFLICT DO NOTHING;

-- Update spots to occupied
UPDATE parking_spots SET status = 'occupied' WHERE spot_number IN ('A01', 'A06');

-- Completed sessions for reports
INSERT INTO parking_sessions (plate, spot_id, pricing_plan_id, operator_id, entry_time, exit_time, duration_minutes, calculated_price, final_price, status)
SELECT 
    'DEF-9012', s.id, p.id, u.id,
    NOW() - INTERVAL '1 day',
    NOW() - INTERVAL '23 hours',
    60, 8.00, 8.00, 'completed'
FROM parking_spots s, pricing_plans p, users u
WHERE s.spot_number = 'A07' AND p.name = 'Carro - Padrão' AND u.email = 'admin@parkingsystem.com'
ON CONFLICT DO NOTHING;

-- Sample payments
INSERT INTO payments (session_id, payment_method, amount, status, payment_time)
SELECT ps.id, 'credit_card', 8.00, 'approved', NOW() - INTERVAL '23 hours'
FROM parking_sessions ps WHERE ps.plate = 'DEF-9012' AND ps.status = 'completed'
LIMIT 1
ON CONFLICT DO NOTHING;

-- Summary view
CREATE OR REPLACE VIEW v_dashboard_summary AS
SELECT
    (SELECT COUNT(*) FROM parking_spots WHERE status = 'available') AS available_spots,
    (SELECT COUNT(*) FROM parking_spots WHERE status = 'occupied') AS occupied_spots,
    (SELECT COUNT(*) FROM parking_spots) AS total_spots,
    (SELECT COUNT(*) FROM parking_sessions WHERE status = 'active') AS active_sessions,
    (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status = 'approved' AND payment_time::DATE = CURRENT_DATE) AS revenue_today,
    (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status = 'approved' AND DATE_TRUNC('month', payment_time) = DATE_TRUNC('month', NOW())) AS revenue_month,
    (SELECT COUNT(*) FROM parking_sessions WHERE entry_time::DATE = CURRENT_DATE) AS entries_today;

-- Hourly revenue view
CREATE OR REPLACE VIEW v_hourly_revenue AS
SELECT 
    DATE_TRUNC('hour', payment_time) AS hour,
    COUNT(*) AS transactions,
    SUM(amount) AS revenue
FROM payments
WHERE status = 'approved' AND payment_time > NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', payment_time)
ORDER BY hour;
