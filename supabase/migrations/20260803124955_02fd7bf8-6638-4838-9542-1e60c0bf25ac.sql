ALTER TABLE public.dishes
  ADD COLUMN IF NOT EXISTS is_veg boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS short_code text,
  ADD COLUMN IF NOT EXISTS hsn_code text,
  ADD COLUMN IF NOT EXISTS tax_pricing text NOT NULL DEFAULT 'follow_restaurant',
  ADD COLUMN IF NOT EXISTS hide_image boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS images jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS variants jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS modifier_groups jsonb NOT NULL DEFAULT '[]'::jsonb;