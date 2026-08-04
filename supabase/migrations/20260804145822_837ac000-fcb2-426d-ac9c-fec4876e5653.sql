ALTER TABLE public.dishes
  ADD COLUMN IF NOT EXISTS channel_prices jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS track_stock boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sold_by_weight boolean NOT NULL DEFAULT false;