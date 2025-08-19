-- Fix search path for helper functions
CREATE OR REPLACE FUNCTION public.iso_week_key_monday(week_key text)
RETURNS date
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT to_date(split_part($1,'-',1) || '-' || split_part($1,'-',2) || '-1', 'IYYY-IW-ID')::date;
$$;

CREATE OR REPLACE FUNCTION public.prev_iso_week_key(week_key text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT to_char((public.iso_week_key_monday($1) - interval '7 days')::date, 'IYYY') || '-' ||
         to_char((public.iso_week_key_monday($1) - interval '7 days')::date, 'IW');
$$;