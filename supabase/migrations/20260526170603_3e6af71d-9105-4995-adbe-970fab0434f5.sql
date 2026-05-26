
-- Inventory items
CREATE TABLE public.inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Other',
  quantity NUMERIC NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'pcs',
  low_stock_threshold NUMERIC NOT NULL DEFAULT 0,
  supplier TEXT,
  unit_cost NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_items TO authenticated;
GRANT ALL ON public.inventory_items TO service_role;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY inv_read ON public.inventory_items FOR SELECT TO authenticated USING (true);
CREATE POLICY inv_manager_all ON public.inventory_items FOR ALL TO authenticated USING (is_manager(auth.uid())) WITH CHECK (is_manager(auth.uid()));

-- Waste log
CREATE TABLE public.waste_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID,
  item_name TEXT NOT NULL,
  quantity NUMERIC NOT NULL,
  reason TEXT NOT NULL,
  logged_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.waste_log TO authenticated;
GRANT ALL ON public.waste_log TO service_role;
ALTER TABLE public.waste_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY waste_read ON public.waste_log FOR SELECT TO authenticated USING (true);
CREATE POLICY waste_insert ON public.waste_log FOR INSERT TO authenticated WITH CHECK (true);

-- Dish availability log
CREATE TABLE public.dish_availability_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dish_id UUID NOT NULL,
  dish_name TEXT NOT NULL,
  toggled_off_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  toggled_on_at TIMESTAMPTZ
);
GRANT SELECT, INSERT, UPDATE ON public.dish_availability_log TO authenticated;
GRANT ALL ON public.dish_availability_log TO service_role;
ALTER TABLE public.dish_availability_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY dal_read ON public.dish_availability_log FOR SELECT TO authenticated USING (true);
CREATE POLICY dal_write ON public.dish_availability_log FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY dal_update ON public.dish_availability_log FOR UPDATE TO authenticated USING (true);

-- Storage bucket for dish photos (public read)
INSERT INTO storage.buckets (id, name, public) VALUES ('dish-photos', 'dish-photos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "dish_photos_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'dish-photos');
CREATE POLICY "dish_photos_auth_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'dish-photos');
CREATE POLICY "dish_photos_auth_update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'dish-photos');
CREATE POLICY "dish_photos_auth_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'dish-photos');
