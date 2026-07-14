
-- =========================================================
-- 1. Helper: current_restaurant_id
-- =========================================================
CREATE OR REPLACE FUNCTION public.current_restaurant_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT restaurant_id FROM public.profiles WHERE id = auth.uid()
$$;

REVOKE EXECUTE ON FUNCTION public.current_restaurant_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_restaurant_id() TO authenticated, service_role;

-- =========================================================
-- 2. Fix touch_updated_at search_path
-- =========================================================
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- =========================================================
-- 3. Revoke public EXECUTE on internal SECURITY DEFINER funcs
--    (RLS policies still call them; policy evaluation ignores EXECUTE grants)
-- =========================================================
REVOKE EXECUTE ON FUNCTION public.is_manager(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_user_role(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;

-- =========================================================
-- 4. restaurant_status view -> security_invoker
-- =========================================================
ALTER VIEW public.restaurant_status SET (security_invoker = on);

-- =========================================================
-- 5. Tenant-scoped RLS: replace USING (true) with restaurant scoping
-- =========================================================

-- dishes
DROP POLICY IF EXISTS dishes_read ON public.dishes;
CREATE POLICY dishes_read ON public.dishes FOR SELECT TO authenticated
USING (restaurant_id = public.current_restaurant_id());

-- tables
DROP POLICY IF EXISTS tables_read ON public.tables;
CREATE POLICY tables_read ON public.tables FOR SELECT TO authenticated
USING (restaurant_id = public.current_restaurant_id());

DROP POLICY IF EXISTS tables_update ON public.tables;
CREATE POLICY tables_update ON public.tables FOR UPDATE TO authenticated
USING (restaurant_id = public.current_restaurant_id())
WITH CHECK (restaurant_id = public.current_restaurant_id());

-- orders
DROP POLICY IF EXISTS orders_read_all ON public.orders;
CREATE POLICY orders_read_all ON public.orders FOR SELECT TO authenticated
USING (restaurant_id = public.current_restaurant_id());

DROP POLICY IF EXISTS orders_update_all ON public.orders;
CREATE POLICY orders_update_all ON public.orders FOR UPDATE TO authenticated
USING (restaurant_id = public.current_restaurant_id())
WITH CHECK (restaurant_id = public.current_restaurant_id());

-- restaurants
DROP POLICY IF EXISTS rest_read ON public.restaurants;
CREATE POLICY rest_read ON public.restaurants FOR SELECT TO authenticated
USING (id = public.current_restaurant_id());

-- announcements
DROP POLICY IF EXISTS ann_read ON public.announcements;
CREATE POLICY ann_read ON public.announcements FOR SELECT TO authenticated
USING (restaurant_id = public.current_restaurant_id());

-- inventory_items
DROP POLICY IF EXISTS inv_read ON public.inventory_items;
CREATE POLICY inv_read ON public.inventory_items FOR SELECT TO authenticated
USING (restaurant_id = public.current_restaurant_id());

-- shift_log
DROP POLICY IF EXISTS shift_log_read ON public.shift_log;
CREATE POLICY shift_log_read ON public.shift_log FOR SELECT TO authenticated
USING (restaurant_id = public.current_restaurant_id());

-- bookings
DROP POLICY IF EXISTS book_read ON public.bookings;
CREATE POLICY book_read ON public.bookings FOR SELECT TO authenticated
USING (restaurant_id = public.current_restaurant_id());

DROP POLICY IF EXISTS book_write ON public.bookings;
CREATE POLICY book_insert ON public.bookings FOR INSERT TO authenticated
WITH CHECK (restaurant_id = public.current_restaurant_id());
CREATE POLICY book_update ON public.bookings FOR UPDATE TO authenticated
USING (restaurant_id = public.current_restaurant_id())
WITH CHECK (restaurant_id = public.current_restaurant_id());
CREATE POLICY book_delete ON public.bookings FOR DELETE TO authenticated
USING (restaurant_id = public.current_restaurant_id());

-- void_log (scope via parent order)
DROP POLICY IF EXISTS void_read ON public.void_log;
CREATE POLICY void_read ON public.void_log FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.orders o
               WHERE o.id = void_log.order_id
                 AND o.restaurant_id = public.current_restaurant_id()));

DROP POLICY IF EXISTS void_insert ON public.void_log;
CREATE POLICY void_insert ON public.void_log FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.orders o
                    WHERE o.id = void_log.order_id
                      AND o.restaurant_id = public.current_restaurant_id()));

-- waste_log (scope via inventory_items)
DROP POLICY IF EXISTS waste_read ON public.waste_log;
CREATE POLICY waste_read ON public.waste_log FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.inventory_items i
               WHERE i.id = waste_log.item_id
                 AND i.restaurant_id = public.current_restaurant_id()));

DROP POLICY IF EXISTS waste_insert ON public.waste_log;
CREATE POLICY waste_insert ON public.waste_log FOR INSERT TO authenticated
WITH CHECK (
  item_id IS NULL
  OR EXISTS (SELECT 1 FROM public.inventory_items i
             WHERE i.id = waste_log.item_id
               AND i.restaurant_id = public.current_restaurant_id())
);

-- dish_availability_log (scope via dishes)
DROP POLICY IF EXISTS dal_read ON public.dish_availability_log;
CREATE POLICY dal_read ON public.dish_availability_log FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.dishes d
               WHERE d.id = dish_availability_log.dish_id
                 AND d.restaurant_id = public.current_restaurant_id()));

DROP POLICY IF EXISTS dal_write ON public.dish_availability_log;
CREATE POLICY dal_write ON public.dish_availability_log FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.dishes d
                    WHERE d.id = dish_availability_log.dish_id
                      AND d.restaurant_id = public.current_restaurant_id()));

DROP POLICY IF EXISTS dal_update ON public.dish_availability_log;
CREATE POLICY dal_update ON public.dish_availability_log FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.dishes d
               WHERE d.id = dish_availability_log.dish_id
                 AND d.restaurant_id = public.current_restaurant_id()))
WITH CHECK (EXISTS (SELECT 1 FROM public.dishes d
                    WHERE d.id = dish_availability_log.dish_id
                      AND d.restaurant_id = public.current_restaurant_id()));

-- =========================================================
-- 6. Notifications: add restaurant_id + scope broadcasts
-- =========================================================
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE CASCADE;

DROP POLICY IF EXISTS notif_read_self ON public.notifications;
CREATE POLICY notif_read_self ON public.notifications FOR SELECT TO authenticated
USING (
  target_user_id = auth.uid()
  OR (target_user_id IS NULL AND restaurant_id = public.current_restaurant_id())
);

DROP POLICY IF EXISTS notif_insert ON public.notifications;
CREATE POLICY notif_insert ON public.notifications FOR INSERT TO authenticated
WITH CHECK (
  restaurant_id IS NULL
  OR restaurant_id = public.current_restaurant_id()
);

-- =========================================================
-- 7. Storage: dish-photos — remove broad listing, add ownership checks
-- =========================================================
DROP POLICY IF EXISTS dish_photos_public_read ON storage.objects;
DROP POLICY IF EXISTS dish_photos_auth_insert ON storage.objects;
DROP POLICY IF EXISTS dish_photos_auth_update ON storage.objects;
DROP POLICY IF EXISTS dish_photos_auth_delete ON storage.objects;

-- Authenticated users can only write photos under their own restaurant folder
-- Convention: object path = "<restaurant_id>/<filename>"
CREATE POLICY dish_photos_auth_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'dish-photos'
    AND (storage.foldername(name))[1] = public.current_restaurant_id()::text
  );

CREATE POLICY dish_photos_auth_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'dish-photos'
    AND (storage.foldername(name))[1] = public.current_restaurant_id()::text
  )
  WITH CHECK (
    bucket_id = 'dish-photos'
    AND (storage.foldername(name))[1] = public.current_restaurant_id()::text
  );

CREATE POLICY dish_photos_auth_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'dish-photos'
    AND (storage.foldername(name))[1] = public.current_restaurant_id()::text
  );
-- Note: bucket remains public, so direct object URLs still work without a SELECT policy.
