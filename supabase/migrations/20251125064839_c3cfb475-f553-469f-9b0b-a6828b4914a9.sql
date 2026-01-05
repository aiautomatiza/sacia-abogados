-- Crear tabla campaigns para rastrear campañas
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'llamadas')),
  total_contacts INTEGER NOT NULL,
  total_batches INTEGER NOT NULL,
  batches_sent INTEGER DEFAULT 0,
  batches_failed INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_campaigns_tenant ON campaigns(tenant_id, created_at DESC);
CREATE INDEX idx_campaigns_status ON campaigns(status);

-- Crear tabla campaign_queue para cola de batches
CREATE TABLE campaign_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  batch_number INTEGER NOT NULL,
  total_batches INTEGER NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'llamadas')),
  contacts JSONB NOT NULL,
  webhook_url TEXT NOT NULL,
  webhook_payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed')),
  scheduled_for TIMESTAMPTZ NOT NULL,
  processed_at TIMESTAMPTZ,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_campaign_queue_processing ON campaign_queue(status, scheduled_for) WHERE status = 'pending';
CREATE INDEX idx_campaign_queue_campaign ON campaign_queue(campaign_id, batch_number);
CREATE INDEX idx_campaign_queue_tenant ON campaign_queue(tenant_id, created_at DESC);

-- Función para actualizar contadores de campaña
CREATE OR REPLACE FUNCTION increment_campaign_batch(
  p_campaign_id UUID,
  p_status TEXT
)
RETURNS void AS $$
BEGIN
  IF p_status = 'sent' THEN
    UPDATE campaigns
    SET batches_sent = batches_sent + 1,
        updated_at = now(),
        status = CASE 
          WHEN batches_sent + 1 >= total_batches THEN 'completed'
          WHEN batches_sent + 1 > 0 THEN 'in_progress'
          ELSE status
        END,
        completed_at = CASE 
          WHEN batches_sent + 1 >= total_batches THEN now()
          ELSE completed_at
        END
    WHERE id = p_campaign_id;
  ELSIF p_status = 'failed' THEN
    UPDATE campaigns
    SET batches_failed = batches_failed + 1,
        updated_at = now()
    WHERE id = p_campaign_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- RLS Policies para campaigns
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their tenant campaigns"
  ON campaigns FOR SELECT
  USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert their tenant campaigns"
  ON campaigns FOR INSERT
  WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- RLS Policies para campaign_queue (solo service role puede gestionar)
ALTER TABLE campaign_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage queue"
  ON campaign_queue FOR ALL
  USING (true);