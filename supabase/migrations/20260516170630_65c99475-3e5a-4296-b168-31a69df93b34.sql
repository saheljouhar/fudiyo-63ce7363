
-- ============== ENUMS ==============
create type public.app_role as enum ('waiter','kitchen','accountant','manager');
create type public.table_status as enum ('available','occupied','bill_requested');
create type public.order_status as enum ('pending','cooking','ready','billed','cleared','voided');
create type public.order_type as enum ('dine_in','takeaway','delivery');
create type public.business_type as enum ('restaurant','cafe','bar_pub','bakery','qsr');
create type public.booking_status as enum ('confirmed','arrived','no_show','cancelled','pending');
create type public.attendance_status as enum ('present','absent','late','on_leave');
create type public.notification_type as enum ('order_ready','bill_request','announcement');

-- ============== RESTAURANTS ==============
create table public.restaurants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  phone text,
  business_type business_type not null default 'restaurant',
  gst_number text,
  tax_rate numeric(5,2) not null default 5.00,
  share_live_data boolean not null default true,
  bill_header text,
  bill_footer text,
  upi_id text,
  show_upi_qr boolean not null default false,
  accept_cash boolean not null default true,
  accept_upi boolean not null default true,
  accept_card boolean not null default true,
  paper_size text not null default '80mm',
  auto_print_kot boolean not null default false,
  auto_print_bill boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.restaurants enable row level security;

-- ============== PROFILES (users) ==============
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  restaurant_id uuid references public.restaurants(id) on delete set null,
  email text not null,
  name text not null,
  is_active boolean not null default true,
  language_preference text not null default 'en',
  avatar_url text,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

-- ============== USER ROLES ==============
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role app_role not null,
  unique (user_id, role)
);
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.get_user_role(_user_id uuid)
returns app_role language sql stable security definer set search_path = public as $$
  select role from public.user_roles where user_id = _user_id
  order by case role when 'manager' then 1 when 'accountant' then 2 when 'kitchen' then 3 when 'waiter' then 4 end
  limit 1
$$;

create or replace function public.is_manager(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.user_roles where user_id = _user_id and role = 'manager')
$$;

-- ============== TABLES ==============
create table public.tables (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  number text not null,
  floor text not null default 'Ground Floor',
  seats int not null default 4,
  status table_status not null default 'available',
  assigned_waiter_id uuid references auth.users(id) on delete set null,
  occupied_since timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.tables enable row level security;

-- ============== DISHES ==============
create table public.dishes (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  name text not null,
  category text not null,
  description text,
  price numeric(10,2) not null,
  is_available boolean not null default true,
  photo_url text,
  is_featured boolean not null default false,
  is_archived boolean not null default false,
  display_order int not null default 0,
  created_at timestamptz not null default now()
);
alter table public.dishes enable row level security;

-- ============== ORDERS ==============
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  table_id uuid references public.tables(id) on delete set null,
  waiter_id uuid references auth.users(id) on delete set null,
  waiter_name text,
  round int not null default 1,
  items jsonb not null default '[]'::jsonb,
  status order_status not null default 'pending',
  order_type order_type not null default 'dine_in',
  subtotal numeric(10,2) not null default 0,
  tax numeric(10,2) not null default 0,
  discount numeric(10,2) not null default 0,
  total numeric(10,2) not null default 0,
  payment_method text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.orders enable row level security;
create index orders_table_idx on public.orders(table_id);
create index orders_status_idx on public.orders(status);

-- ============== NOTIFICATIONS ==============
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  target_user_id uuid references auth.users(id) on delete cascade,
  message text not null,
  type notification_type not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.notifications enable row level security;

-- ============== ANNOUNCEMENTS ==============
create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid references public.restaurants(id) on delete cascade,
  message text not null,
  sent_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz
);
alter table public.announcements enable row level security;

-- ============== VOID LOG ==============
create table public.void_log (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete set null,
  dish_name text not null,
  reason text not null,
  voided_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.void_log enable row level security;

-- ============== BOOKINGS ==============
create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid references public.restaurants(id) on delete cascade,
  customer_name text not null,
  customer_phone text,
  party_size int not null default 2,
  table_id uuid references public.tables(id) on delete set null,
  booking_time timestamptz not null,
  status booking_status not null default 'confirmed',
  source text not null default 'manual',
  created_at timestamptz not null default now()
);
alter table public.bookings enable row level security;

-- ============== ATTENDANCE ==============
create table public.attendance (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references auth.users(id) on delete cascade,
  date date not null default current_date,
  status attendance_status not null default 'present',
  clock_in timestamptz,
  clock_out timestamptz,
  unique (staff_id, date)
);
alter table public.attendance enable row level security;

-- ============== SHIFTS ==============
create table public.shifts (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  start_time time not null,
  end_time time not null,
  created_by uuid references auth.users(id) on delete set null
);
alter table public.shifts enable row level security;

create table public.shift_log (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid references public.restaurants(id) on delete cascade,
  opened_by uuid references auth.users(id) on delete set null,
  opened_at timestamptz not null default now(),
  closed_by uuid references auth.users(id) on delete set null,
  closed_at timestamptz
);
alter table public.shift_log enable row level security;

-- ============== POLICIES ==============
-- Profiles
create policy "profiles_self_select" on public.profiles for select to authenticated using (id = auth.uid() or public.is_manager(auth.uid()));
create policy "profiles_self_update" on public.profiles for update to authenticated using (id = auth.uid() or public.is_manager(auth.uid()));
create policy "profiles_manager_insert" on public.profiles for insert to authenticated with check (public.is_manager(auth.uid()) or id = auth.uid());

-- Restaurants - all authed users can read; managers can update
create policy "rest_read" on public.restaurants for select to authenticated using (true);
create policy "rest_manager_all" on public.restaurants for all to authenticated using (public.is_manager(auth.uid())) with check (public.is_manager(auth.uid()));

-- User roles - users see their own; managers see all
create policy "roles_self_select" on public.user_roles for select to authenticated using (user_id = auth.uid() or public.is_manager(auth.uid()));
create policy "roles_manager_all" on public.user_roles for all to authenticated using (public.is_manager(auth.uid())) with check (public.is_manager(auth.uid()));

-- Tables - all authed read, all authed update status, manager full
create policy "tables_read" on public.tables for select to authenticated using (true);
create policy "tables_update" on public.tables for update to authenticated using (true);
create policy "tables_manager_all" on public.tables for all to authenticated using (public.is_manager(auth.uid())) with check (public.is_manager(auth.uid()));

-- Dishes - all read; manager full
create policy "dishes_read" on public.dishes for select to authenticated using (true);
create policy "dishes_manager_all" on public.dishes for all to authenticated using (public.is_manager(auth.uid())) with check (public.is_manager(auth.uid()));

-- Orders
create policy "orders_read_all" on public.orders for select to authenticated using (true);
create policy "orders_insert_waiter" on public.orders for insert to authenticated with check (waiter_id = auth.uid() or public.is_manager(auth.uid()));
create policy "orders_update_all" on public.orders for update to authenticated using (true);
create policy "orders_manager_delete" on public.orders for delete to authenticated using (public.is_manager(auth.uid()));

-- Notifications - target user reads, anyone can insert
create policy "notif_read_self" on public.notifications for select to authenticated using (target_user_id = auth.uid() or target_user_id is null);
create policy "notif_insert" on public.notifications for insert to authenticated with check (true);
create policy "notif_update_self" on public.notifications for update to authenticated using (target_user_id = auth.uid());

-- Announcements - all read; manager write
create policy "ann_read" on public.announcements for select to authenticated using (true);
create policy "ann_manager_write" on public.announcements for all to authenticated using (public.is_manager(auth.uid())) with check (public.is_manager(auth.uid()));

-- Void log - all read, all insert
create policy "void_read" on public.void_log for select to authenticated using (true);
create policy "void_insert" on public.void_log for insert to authenticated with check (true);

-- Bookings - all read; manager/accountant write
create policy "book_read" on public.bookings for select to authenticated using (true);
create policy "book_write" on public.bookings for all to authenticated using (true) with check (true);

-- Attendance
create policy "att_read" on public.attendance for select to authenticated using (staff_id = auth.uid() or public.is_manager(auth.uid()));
create policy "att_manager_all" on public.attendance for all to authenticated using (public.is_manager(auth.uid())) with check (public.is_manager(auth.uid()));
create policy "att_self_insert" on public.attendance for insert to authenticated with check (staff_id = auth.uid());

-- Shifts
create policy "shift_read" on public.shifts for select to authenticated using (staff_id = auth.uid() or public.is_manager(auth.uid()));
create policy "shift_manager_all" on public.shifts for all to authenticated using (public.is_manager(auth.uid())) with check (public.is_manager(auth.uid()));

create policy "shift_log_read" on public.shift_log for select to authenticated using (true);
create policy "shift_log_manager_all" on public.shift_log for all to authenticated using (public.is_manager(auth.uid())) with check (public.is_manager(auth.uid()));

-- ============== TRIGGERS ==============
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  default_rest uuid;
begin
  select id into default_rest from public.restaurants order by created_at limit 1;
  insert into public.profiles (id, restaurant_id, email, name)
  values (new.id, default_rest, new.email, coalesce(new.raw_user_meta_data->>'name', split_part(new.email,'@',1)));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;
create trigger tables_touch before update on public.tables for each row execute function public.touch_updated_at();
create trigger orders_touch before update on public.orders for each row execute function public.touch_updated_at();

-- ============== PUBLIC LIVE-STATUS VIEW ==============
create or replace view public.restaurant_status as
select
  r.id as restaurant_id,
  r.name as restaurant_name,
  (select count(*) from public.tables t where t.restaurant_id = r.id and t.status = 'occupied') as occupied_tables,
  (select count(*) from public.tables t where t.restaurant_id = r.id) as total_tables,
  (select count(*) from public.tables t where t.restaurant_id = r.id and t.status = 'available') as available_tables,
  greatest(15, (select count(*)*5 from public.tables t where t.restaurant_id = r.id and t.status = 'occupied')) as estimated_wait_minutes,
  (select coalesce(jsonb_agg(jsonb_build_object('name', d.name, 'is_available', d.is_available)), '[]'::jsonb)
   from public.dishes d where d.restaurant_id = r.id and d.is_archived = false) as dishes,
  now() as last_updated
from public.restaurants r
where r.share_live_data = true;

grant select on public.restaurant_status to anon, authenticated;

-- ============== REALTIME ==============
alter publication supabase_realtime add table public.tables;
alter publication supabase_realtime add table public.orders;
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.announcements;

-- ============== SEED ==============
insert into public.restaurants (id, name, address, phone) values
  ('11111111-1111-1111-1111-111111111111','ORBIS Kitchen','MG Road, Kochi, Kerala','+91 9876543210');

-- 25 tables across 1 floor
insert into public.tables (restaurant_id, number, floor, seats)
select '11111111-1111-1111-1111-111111111111', n::text, 'Ground Floor',
  case when n % 5 = 0 then 8 when n % 3 = 0 then 6 else 4 end
from generate_series(1,25) n;

-- Kerala menu
insert into public.dishes (restaurant_id, name, category, description, price, display_order) values
  ('11111111-1111-1111-1111-111111111111','Chicken Biriyani','Rice Items','Fragrant basmati with spiced chicken',180,1),
  ('11111111-1111-1111-1111-111111111111','Ghee Rice','Rice Items','Aromatic ghee-tossed rice',120,2),
  ('11111111-1111-1111-1111-111111111111','Fried Rice','Rice Items','Wok-tossed mixed vegetables',140,3),
  ('11111111-1111-1111-1111-111111111111','Egg Rice','Rice Items','Rice with scrambled egg',100,4),
  ('11111111-1111-1111-1111-111111111111','Porotta','Breads','Flaky layered Malabar bread',15,5),
  ('11111111-1111-1111-1111-111111111111','Chapati','Breads','Whole wheat flatbread',20,6),
  ('11111111-1111-1111-1111-111111111111','Naan','Breads','Tandoor-baked white bread',40,7),
  ('11111111-1111-1111-1111-111111111111','Pathiri','Breads','Rice flour flatbread',20,8),
  ('11111111-1111-1111-1111-111111111111','Beef Fry','Curries','Kerala-style dry beef',160,9),
  ('11111111-1111-1111-1111-111111111111','Chicken Curry','Curries','Coconut chicken curry',140,10),
  ('11111111-1111-1111-1111-111111111111','Fish Curry','Curries','Tangy red fish curry',160,11),
  ('11111111-1111-1111-1111-111111111111','Egg Roast','Curries','Spicy egg masala',80,12),
  ('11111111-1111-1111-1111-111111111111','Mutton Curry','Curries','Slow-cooked goat curry',200,13),
  ('11111111-1111-1111-1111-111111111111','Dal','Curries','Lentil curry',60,14),
  ('11111111-1111-1111-1111-111111111111','Water','Beverages','Mineral water 1L',20,15),
  ('11111111-1111-1111-1111-111111111111','Tea','Beverages','Hot masala chai',20,16),
  ('11111111-1111-1111-1111-111111111111','Coffee','Beverages','Filter coffee',30,17),
  ('11111111-1111-1111-1111-111111111111','Lime Juice','Beverages','Fresh lime soda',40,18),
  ('11111111-1111-1111-1111-111111111111','Pickle','Extras','House-made pickle',10,19),
  ('11111111-1111-1111-1111-111111111111','Papad','Extras','Crispy lentil wafer',15,20),
  ('11111111-1111-1111-1111-111111111111','Curd','Extras','Fresh yogurt',30,21);

-- Seed manager user (email confirmed)
do $$
declare
  mid uuid := gen_random_uuid();
begin
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change
  ) values (
    '00000000-0000-0000-0000-000000000000', mid, 'authenticated','authenticated',
    'manager@restaurant.com', crypt('manager1234', gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"name":"Manager"}'::jsonb,
    now(), now(), '','','',''
  );
  insert into public.user_roles (user_id, role) values (mid, 'manager');
  update public.profiles set restaurant_id = '11111111-1111-1111-1111-111111111111' where id = mid;
end $$;
