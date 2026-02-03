# Functions & Triggers

Funciones SQL y triggers del sistema.

## Funciones RPC

### calculate_calls_stats

Calcula estadisticas de llamadas con filtros.

```sql
CREATE FUNCTION calculate_calls_stats(
  p_date_from TIMESTAMP DEFAULT NULL,
  p_date_to TIMESTAMP DEFAULT NULL,
  p_search_term TEXT DEFAULT NULL,
  p_states call_state[] DEFAULT NULL,
  p_tenant_id UUID DEFAULT NULL,
  p_types call_type[] DEFAULT NULL
)
RETURNS TABLE (
  avg_duration NUMERIC,
  completed BIGINT,
  completion_rate NUMERIC,
  failed BIGINT,
  missed BIGINT,
  pending BIGINT,
  scheduled BIGINT,
  total BIGINT,
  total_duration BIGINT,
  user_hangup BIGINT,
  voicemail BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(AVG(c.duration_seconds), 0) as avg_duration,
    COUNT(*) FILTER (WHERE c.state = 'completed') as completed,
    CASE
      WHEN COUNT(*) > 0
      THEN (COUNT(*) FILTER (WHERE c.state = 'completed')::NUMERIC / COUNT(*) * 100)
      ELSE 0
    END as completion_rate,
    COUNT(*) FILTER (WHERE c.state = 'failed') as failed,
    COUNT(*) FILTER (WHERE c.state = 'missed') as missed,
    COUNT(*) FILTER (WHERE c.state = 'pending') as pending,
    COUNT(*) FILTER (WHERE c.state = 'scheduled') as scheduled,
    COUNT(*) as total,
    COALESCE(SUM(c.duration_seconds), 0) as total_duration,
    COUNT(*) FILTER (WHERE c.state = 'user_hangup') as user_hangup,
    COUNT(*) FILTER (WHERE c.state = 'voicemail') as voicemail
  FROM crm_calls c
  LEFT JOIN crm_contacts ct ON c.contact_id = ct.id
  WHERE
    (p_tenant_id IS NULL OR c.tenant_id = p_tenant_id)
    AND (p_date_from IS NULL OR c.call_datetime >= p_date_from)
    AND (p_date_to IS NULL OR c.call_datetime <= p_date_to)
    AND (p_states IS NULL OR c.state = ANY(p_states))
    AND (p_types IS NULL OR c.type = ANY(p_types))
    AND (p_search_term IS NULL OR
         ct.nombre ILIKE '%' || p_search_term || '%' OR
         ct.numero ILIKE '%' || p_search_term || '%');
END;
$$ LANGUAGE plpgsql STABLE;
```

**Uso:**
```typescript
const { data } = await supabase.rpc('calculate_calls_stats', {
  p_tenant_id: tenantId,
  p_date_from: '2024-01-01',
  p_date_to: '2024-12-31',
});
```

### calculate_appointments_stats

Calcula estadisticas de citas.

```sql
CREATE FUNCTION calculate_appointments_stats(
  p_tenant_id UUID DEFAULT NULL,
  p_date_from TIMESTAMP DEFAULT NULL,
  p_date_to TIMESTAMP DEFAULT NULL,
  p_type appointment_type DEFAULT NULL,
  p_location_id UUID DEFAULT NULL,
  p_agent_id UUID DEFAULT NULL
)
RETURNS TABLE (
  total BIGINT,
  scheduled BIGINT,
  confirmed BIGINT,
  completed BIGINT,
  cancelled BIGINT,
  no_show BIGINT,
  in_progress BIGINT,
  completion_rate NUMERIC,
  cancellation_rate NUMERIC,
  no_show_rate NUMERIC,
  calls_count BIGINT,
  in_person_count BIGINT,
  avg_duration_minutes NUMERIC
) AS $$
-- ... implementacion
$$ LANGUAGE plpgsql STABLE;
```

### check_appointment_availability

Verifica disponibilidad para una cita.

```sql
CREATE FUNCTION check_appointment_availability(
  p_tenant_id UUID,
  p_type appointment_type,
  p_scheduled_at TIMESTAMP,
  p_duration_minutes INT,
  p_agent_id UUID DEFAULT NULL,
  p_location_id UUID DEFAULT NULL,
  p_exclude_appointment_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_end_time TIMESTAMP;
  v_conflict_count INT;
BEGIN
  v_end_time := p_scheduled_at + (p_duration_minutes || ' minutes')::INTERVAL;

  SELECT COUNT(*)
  INTO v_conflict_count
  FROM appointments a
  WHERE a.tenant_id = p_tenant_id
    AND a.status NOT IN ('cancelled', 'no_show')
    AND (p_exclude_appointment_id IS NULL OR a.id != p_exclude_appointment_id)
    AND (
      (p_agent_id IS NOT NULL AND a.agent_id = p_agent_id)
      OR (p_location_id IS NOT NULL AND a.location_id = p_location_id)
    )
    AND (
      (a.scheduled_at, a.scheduled_at + (a.duration_minutes || ' minutes')::INTERVAL)
      OVERLAPS
      (p_scheduled_at, v_end_time)
    );

  RETURN v_conflict_count = 0;
END;
$$ LANGUAGE plpgsql STABLE;
```

### get_contact_upcoming_appointments

Obtiene proximas citas de un contacto.

```sql
CREATE FUNCTION get_contact_upcoming_appointments(
  p_contact_id UUID,
  p_limit INT DEFAULT 5
)
RETURNS TABLE (
  -- ... campos del appointment detallado
) AS $$
  SELECT *
  FROM v_appointments_detailed
  WHERE contact_id = p_contact_id
    AND status IN ('scheduled', 'confirmed')
    AND scheduled_at > NOW()
  ORDER BY scheduled_at ASC
  LIMIT p_limit;
$$ LANGUAGE sql STABLE;
```

### increment_campaign_batch

Incrementa contadores de batch de campana.

```sql
CREATE FUNCTION increment_campaign_batch(
  p_campaign_id UUID,
  p_status TEXT
)
RETURNS VOID AS $$
BEGIN
  IF p_status = 'sent' THEN
    UPDATE campaigns
    SET batches_sent = COALESCE(batches_sent, 0) + 1,
        updated_at = NOW()
    WHERE id = p_campaign_id;
  ELSIF p_status = 'failed' THEN
    UPDATE campaigns
    SET batches_failed = COALESCE(batches_failed, 0) + 1,
        updated_at = NOW()
    WHERE id = p_campaign_id;
  END IF;

  -- Verificar si campana esta completa
  UPDATE campaigns
  SET status = 'completed',
      completed_at = NOW()
  WHERE id = p_campaign_id
    AND (batches_sent + batches_failed) >= total_batches;
END;
$$ LANGUAGE plpgsql;
```

### clean_expired_invitations

Limpia invitaciones expiradas.

```sql
CREATE FUNCTION clean_expired_invitations()
RETURNS VOID AS $$
BEGIN
  UPDATE user_invitations
  SET status = 'expired'
  WHERE status = 'pending'
    AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;
```

## Triggers

### update_updated_at

Trigger para actualizar `updated_at` automaticamente.

```sql
CREATE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar a tablas
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON crm_contacts
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at
BEFORE UPDATE ON conversations
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Repetir para otras tablas...
```

### update_conversation_last_message

Actualiza last_message de conversacion cuando llega mensaje.

```sql
CREATE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET
    last_message_at = NEW.created_at,
    last_message_preview = LEFT(NEW.content, 100),
    unread_count = CASE
      WHEN NEW.sender_type = 'contact' THEN unread_count + 1
      ELSE unread_count
    END,
    updated_at = NOW()
  WHERE id = NEW.conversation_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_message_insert
AFTER INSERT ON conversation_messages
FOR EACH ROW
EXECUTE FUNCTION update_conversation_last_message();
```

### update_whatsapp_24h_window

Actualiza ventana 24h cuando el contacto envia mensaje.

```sql
CREATE FUNCTION update_whatsapp_24h_window()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.sender_type = 'contact' THEN
    UPDATE conversations
    SET whatsapp_24h_window_expires_at = NEW.created_at + INTERVAL '24 hours'
    WHERE id = NEW.conversation_id
      AND channel = 'whatsapp';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_message_update_window
AFTER INSERT ON conversation_messages
FOR EACH ROW
EXECUTE FUNCTION update_whatsapp_24h_window();
```

## Vistas

### v_crm_calls_detailed

Vista con informacion detallada de llamadas.

```sql
CREATE VIEW v_crm_calls_detailed AS
SELECT
  c.*,
  ct.nombre AS contact_name,
  ct.numero AS contact_phone,
  ct.attributes AS contact_attributes,
  p.email AS agent_email,
  t.name AS tenant_name
FROM crm_calls c
LEFT JOIN crm_contacts ct ON c.contact_id = ct.id
LEFT JOIN profiles p ON c.agent_id = p.id
LEFT JOIN tenants t ON c.tenant_id = t.id;
```

### v_appointments_detailed

Vista con informacion detallada de citas.

```sql
CREATE VIEW v_appointments_detailed AS
SELECT
  a.*,
  ct.nombre AS contact_name,
  ct.numero AS contact_phone,
  ct.attributes AS contact_attributes,
  p.email AS agent_email,
  l.name AS location_name,
  l.address_line1 AS location_address,
  l.city AS location_city,
  l.phone AS location_phone,
  c.state AS call_state,
  c.duration_seconds AS call_duration,
  CASE
    WHEN a.scheduled_at > NOW() THEN 'upcoming'
    WHEN a.scheduled_at + (a.duration_minutes || ' minutes')::INTERVAL > NOW() THEN 'ongoing'
    ELSE 'past'
  END AS time_status,
  a.scheduled_at + (a.duration_minutes || ' minutes')::INTERVAL AS scheduled_end_at
FROM appointments a
LEFT JOIN crm_contacts ct ON a.contact_id = ct.id
LEFT JOIN profiles p ON a.agent_id = p.id
LEFT JOIN tenant_locations l ON a.location_id = l.id
LEFT JOIN crm_calls c ON a.call_id = c.id;
```

## Indices

### Indices para Performance

```sql
-- Contactos por tenant y busqueda
CREATE INDEX idx_contacts_tenant_id ON crm_contacts(tenant_id);
CREATE INDEX idx_contacts_numero ON crm_contacts(numero);
CREATE INDEX idx_contacts_nombre ON crm_contacts(nombre);

-- Conversaciones
CREATE INDEX idx_conversations_tenant_id ON conversations(tenant_id);
CREATE INDEX idx_conversations_contact_id ON conversations(contact_id);
CREATE INDEX idx_conversations_last_message ON conversations(last_message_at DESC);
CREATE INDEX idx_conversations_status ON conversations(status);

-- Mensajes
CREATE INDEX idx_messages_conversation ON conversation_messages(conversation_id);
CREATE INDEX idx_messages_created_at ON conversation_messages(created_at DESC);

-- Llamadas
CREATE INDEX idx_calls_tenant_id ON crm_calls(tenant_id);
CREATE INDEX idx_calls_contact_id ON crm_calls(contact_id);
CREATE INDEX idx_calls_datetime ON crm_calls(call_datetime DESC);

-- Citas
CREATE INDEX idx_appointments_tenant_id ON appointments(tenant_id);
CREATE INDEX idx_appointments_contact_id ON appointments(contact_id);
CREATE INDEX idx_appointments_scheduled ON appointments(scheduled_at);
CREATE INDEX idx_appointments_status ON appointments(status);
```

## Siguiente Paso

Continua con [Migrations Guide](./migrations-guide.md) para aprender a crear migraciones.
