ALTER TYPE public.table_status ADD VALUE IF NOT EXISTS 'reserved';
ALTER TYPE public.table_status ADD VALUE IF NOT EXISTS 'cleaning';
ALTER TYPE public.table_status ADD VALUE IF NOT EXISTS 'out_of_service';