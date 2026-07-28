
-- 1. announcements
DROP POLICY IF EXISTS ann_manager_write ON public.announcements;
CREATE POLICY ann_manager_write ON public.announcements
  FOR ALL TO authenticated
  USING (is_manager(auth.uid()) AND restaurant_id = current_restaurant_id())
  WITH CHECK (is_manager(auth.uid()) AND restaurant_id = current_restaurant_id());

-- 2. attendance (scope via staff profile)
DROP POLICY IF EXISTS att_manager_all ON public.attendance;
CREATE POLICY att_manager_all ON public.attendance
  FOR ALL TO authenticated
  USING (
    is_manager(auth.uid()) AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = attendance.staff_id AND p.restaurant_id = current_restaurant_id()
    )
  )
  WITH CHECK (
    is_manager(auth.uid()) AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = attendance.staff_id AND p.restaurant_id = current_restaurant_id()
    )
  );

-- 3. dishes
DROP POLICY IF EXISTS dishes_manager_all ON public.dishes;
CREATE POLICY dishes_manager_all ON public.dishes
  FOR ALL TO authenticated
  USING (is_manager(auth.uid()) AND restaurant_id = current_restaurant_id())
  WITH CHECK (is_manager(auth.uid()) AND restaurant_id = current_restaurant_id());

-- 4. inventory_items
DROP POLICY IF EXISTS inv_manager_all ON public.inventory_items;
CREATE POLICY inv_manager_all ON public.inventory_items
  FOR ALL TO authenticated
  USING (is_manager(auth.uid()) AND restaurant_id = current_restaurant_id())
  WITH CHECK (is_manager(auth.uid()) AND restaurant_id = current_restaurant_id());

-- 5. profiles (manager insert/update scoped to own restaurant; self can always self-manage)
DROP POLICY IF EXISTS profiles_manager_insert ON public.profiles;
CREATE POLICY profiles_manager_insert ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (
    id = auth.uid()
    OR (is_manager(auth.uid()) AND restaurant_id = current_restaurant_id())
  );

DROP POLICY IF EXISTS profiles_self_update ON public.profiles;
CREATE POLICY profiles_self_update ON public.profiles
  FOR UPDATE TO authenticated
  USING (
    id = auth.uid()
    OR (is_manager(auth.uid()) AND restaurant_id = current_restaurant_id())
  )
  WITH CHECK (
    id = auth.uid()
    OR (is_manager(auth.uid()) AND restaurant_id = current_restaurant_id())
  );

-- 6. restaurants
DROP POLICY IF EXISTS rest_manager_all ON public.restaurants;
CREATE POLICY rest_manager_all ON public.restaurants
  FOR ALL TO authenticated
  USING (is_manager(auth.uid()) AND id = current_restaurant_id())
  WITH CHECK (is_manager(auth.uid()) AND id = current_restaurant_id());

-- 7. shift_log
DROP POLICY IF EXISTS shift_log_manager_all ON public.shift_log;
CREATE POLICY shift_log_manager_all ON public.shift_log
  FOR ALL TO authenticated
  USING (is_manager(auth.uid()) AND restaurant_id = current_restaurant_id())
  WITH CHECK (is_manager(auth.uid()) AND restaurant_id = current_restaurant_id());

-- 8. shifts (scope via staff profile)
DROP POLICY IF EXISTS shift_manager_all ON public.shifts;
CREATE POLICY shift_manager_all ON public.shifts
  FOR ALL TO authenticated
  USING (
    is_manager(auth.uid()) AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = shifts.staff_id AND p.restaurant_id = current_restaurant_id()
    )
  )
  WITH CHECK (
    is_manager(auth.uid()) AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = shifts.staff_id AND p.restaurant_id = current_restaurant_id()
    )
  );

-- 9. tables
DROP POLICY IF EXISTS tables_manager_all ON public.tables;
CREATE POLICY tables_manager_all ON public.tables
  FOR ALL TO authenticated
  USING (is_manager(auth.uid()) AND restaurant_id = current_restaurant_id())
  WITH CHECK (is_manager(auth.uid()) AND restaurant_id = current_restaurant_id());

-- 10. user_roles (scope via target user's profile)
DROP POLICY IF EXISTS roles_manager_all ON public.user_roles;
CREATE POLICY roles_manager_all ON public.user_roles
  FOR ALL TO authenticated
  USING (
    is_manager(auth.uid()) AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = user_roles.user_id AND p.restaurant_id = current_restaurant_id()
    )
  )
  WITH CHECK (
    is_manager(auth.uid()) AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = user_roles.user_id AND p.restaurant_id = current_restaurant_id()
    )
  );

-- 11. Revoke public/anon EXECUTE on SECURITY DEFINER helpers; keep authenticated
REVOKE EXECUTE ON FUNCTION public.current_restaurant_id() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_user_role(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_manager(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_restaurant_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_manager(uuid) TO authenticated;
