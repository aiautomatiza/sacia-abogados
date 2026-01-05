-- Corregir REPLICA IDENTITY para habilitar realtime completo en UPDATE/DELETE
ALTER TABLE crm_calls REPLICA IDENTITY FULL;