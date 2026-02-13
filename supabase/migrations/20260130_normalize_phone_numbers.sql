-- Migration: Normalize phone numbers to remove '+' prefix
-- Convention: Store phone numbers as digits only (e.g., '34666123456' not '+34666123456')
-- Exception: whatsapp_numbers.phone_number keeps E.164 format with '+' (Meta API requirement)
--
-- IMPORTANT: Run the diagnostic query below BEFORE executing this migration
-- to check for potential duplicates that would need manual resolution:
--
-- SELECT
--   tenant_id,
--   LTRIM(numero, '+') as normalized,
--   COUNT(*) as cnt,
--   ARRAY_AGG(numero) as original_values
-- FROM crm_contacts
-- GROUP BY tenant_id, LTRIM(numero, '+')
-- HAVING COUNT(*) > 1;

BEGIN;

-- 1. crm_contacts.numero: strip leading '+'
UPDATE crm_contacts
SET numero = LTRIM(numero, '+')
WHERE numero LIKE '+%';

-- 2. appointments.call_phone_number: strip leading '+'
UPDATE appointments
SET call_phone_number = LTRIM(call_phone_number, '+')
WHERE call_phone_number LIKE '+%';

-- 3. tenant_settings.calls_phone_number: strip leading '+'
UPDATE tenant_settings
SET calls_phone_number = LTRIM(calls_phone_number, '+')
WHERE calls_phone_number LIKE '+%';

-- 4. tenant_locations.phone: strip leading '+'
UPDATE tenant_locations
SET phone = LTRIM(phone, '+')
WHERE phone LIKE '+%';

-- NOTE: whatsapp_numbers.phone_number is NOT modified (keeps E.164 with '+')

COMMIT;
