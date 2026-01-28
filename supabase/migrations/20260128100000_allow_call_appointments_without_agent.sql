-- ============================================================================
-- PERMITIR CITAS DE LLAMADA SIN COMERCIAL ASIGNADO
-- ============================================================================
-- Esta migración modifica el constraint de appointments para permitir que las
-- citas de tipo 'call' puedan crearse sin un agent_id asignado.
-- Las citas de tipo 'in_person' siguen requiriendo location_id.
-- ============================================================================

-- Eliminar el constraint existente
ALTER TABLE public.appointments
DROP CONSTRAINT IF EXISTS valid_appointment_assignment;

-- Crear el nuevo constraint que permite agent_id NULL para tipo 'call'
ALTER TABLE public.appointments
ADD CONSTRAINT valid_appointment_assignment CHECK (
    (type = 'call') OR
    (type = 'in_person' AND location_id IS NOT NULL)
);

-- Actualizar comentario de la tabla para documentar el cambio
COMMENT ON CONSTRAINT valid_appointment_assignment ON public.appointments IS
'Validates assignment based on type: call appointments can optionally have an agent_id, in_person appointments require location_id';
