CREATE TABLE public.saved_carts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  label text NOT NULL,
  cart jsonb NOT NULL DEFAULT '[]'::jsonb,
  order_type order_type NOT NULL DEFAULT 'dine_in',
  code text,
  table_id uuid REFERENCES public.tables(id) ON DELETE SET NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_carts TO authenticated;
GRANT ALL ON public.saved_carts TO service_role;

ALTER TABLE public.saved_carts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "saved_carts_select_own_restaurant" ON public.saved_carts
  FOR SELECT TO authenticated USING (restaurant_id = public.current_restaurant_id());
CREATE POLICY "saved_carts_insert_own_restaurant" ON public.saved_carts
  FOR INSERT TO authenticated WITH CHECK (restaurant_id = public.current_restaurant_id());
CREATE POLICY "saved_carts_update_own_restaurant" ON public.saved_carts
  FOR UPDATE TO authenticated USING (restaurant_id = public.current_restaurant_id())
  WITH CHECK (restaurant_id = public.current_restaurant_id());
CREATE POLICY "saved_carts_delete_own_restaurant" ON public.saved_carts
  FOR DELETE TO authenticated USING (restaurant_id = public.current_restaurant_id());

CREATE TRIGGER saved_carts_touch BEFORE UPDATE ON public.saved_carts
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.tables ADD COLUMN IF NOT EXISTS layout jsonb NOT NULL DEFAULT '{}'::jsonb;