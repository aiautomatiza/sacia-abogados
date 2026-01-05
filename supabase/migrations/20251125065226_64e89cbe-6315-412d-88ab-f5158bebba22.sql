-- Drop and recreate increment_campaign_batch function with race condition fix
DROP FUNCTION IF EXISTS increment_campaign_batch(UUID, TEXT);

CREATE OR REPLACE FUNCTION increment_campaign_batch(
  p_campaign_id UUID,
  p_status TEXT
)
RETURNS void AS $$
DECLARE
  v_current_sent INTEGER;
  v_current_failed INTEGER;
  v_total_batches INTEGER;
BEGIN
  -- Lock the row to prevent concurrent updates
  SELECT batches_sent, batches_failed, total_batches
  INTO v_current_sent, v_current_failed, v_total_batches
  FROM campaigns
  WHERE id = p_campaign_id
  FOR UPDATE;
  
  -- Update based on status
  IF p_status = 'sent' THEN
    v_current_sent := v_current_sent + 1;
    
    UPDATE campaigns
    SET batches_sent = v_current_sent,
        updated_at = now(),
        status = CASE 
          WHEN v_current_sent >= v_total_batches THEN 'completed'
          WHEN v_current_sent > 0 THEN 'in_progress'
          ELSE status
        END,
        completed_at = CASE 
          WHEN v_current_sent >= v_total_batches THEN now()
          ELSE completed_at
        END
    WHERE id = p_campaign_id;
    
  ELSIF p_status = 'failed' THEN
    v_current_failed := v_current_failed + 1;
    
    UPDATE campaigns
    SET batches_failed = v_current_failed,
        updated_at = now()
    WHERE id = p_campaign_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;