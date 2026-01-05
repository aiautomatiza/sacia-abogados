-- Fix handle_new_user() trigger to use gen_random_uuid() instead of uuid_generate_v4()
-- This resolves the "function uuid_generate_v4() does not exist" error

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, tenant_id)
  VALUES (
    NEW.id,
    NEW.email,
    gen_random_uuid()  -- Use native PostgreSQL function instead of uuid_generate_v4()
  );
  RETURN NEW;
EXCEPTION
  WHEN others THEN
    -- Log error for debugging
    RAISE LOG 'Error creating profile for user %: %', NEW.id, SQLERRM;
    -- Re-raise to fail the transaction
    RAISE;
END;
$$;