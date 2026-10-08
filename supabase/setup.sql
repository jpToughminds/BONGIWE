create extension if not exists pgcrypto;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_store_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admin_users
    where user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_store_admin() from public;
grant execute on function public.is_store_admin() to anon, authenticated;

create table if not exists public.products (
  id text primary key check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  category text not null check (category in ('Shoes', 'Clothes', 'Wigs', 'Jewelry', 'Bags', 'House Accessories')),
  name text not null check (length(trim(name)) between 1 and 120),
  price numeric(12, 2) not null check (price >= 0),
  image_url text not null,
  badge text check (badge is null or length(badge) <= 40),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 120),
  email text not null check (length(email) <= 254 and email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  message text not null check (length(trim(message)) between 1 and 5000),
  created_at timestamptz not null default now()
);

create table if not exists public.story_content (
  id text primary key check (id = 'main'),
  eyebrow text not null check (length(eyebrow) <= 120),
  title text not null check (length(title) <= 180),
  intro text not null check (length(intro) <= 1000),
  heading text not null check (length(heading) <= 180),
  body_one text not null check (length(body_one) <= 3000),
  body_two text not null check (length(body_two) <= 3000),
  quote text not null check (length(quote) <= 300),
  body_three text not null check (length(body_three) <= 3000),
  photo_url text,
  updated_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;
alter table public.products enable row level security;
alter table public.contact_messages enable row level security;
alter table public.story_content enable row level security;

drop policy if exists "admins can verify own admin account" on public.admin_users;
create policy "admins can verify own admin account"
  on public.admin_users for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "public can read active products" on public.products;
create policy "public can read active products"
  on public.products for select to anon, authenticated
  using (active or (select public.is_store_admin()));

drop policy if exists "admins can manage products" on public.products;
create policy "admins can manage products"
  on public.products for all to authenticated
  using ((select public.is_store_admin()))
  with check ((select public.is_store_admin()));

drop policy if exists "public can send contact messages" on public.contact_messages;
create policy "public can send contact messages"
  on public.contact_messages for insert to anon, authenticated
  with check (
    length(trim(name)) between 1 and 120
    and length(email) <= 254
    and email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    and length(trim(message)) between 1 and 5000
  );

drop policy if exists "admins can read contact messages" on public.contact_messages;
create policy "admins can read contact messages"
  on public.contact_messages for select to authenticated
  using ((select public.is_store_admin()));

drop policy if exists "public can read story content" on public.story_content;
create policy "public can read story content"
  on public.story_content for select to anon, authenticated
  using (true);

drop policy if exists "admins can manage story content" on public.story_content;
create policy "admins can manage story content"
  on public.story_content for all to authenticated
  using ((select public.is_store_admin()))
  with check ((select public.is_store_admin()));

grant select on public.products, public.story_content to anon, authenticated;
grant insert on public.contact_messages to anon, authenticated;
grant select on public.contact_messages to authenticated;
grant select on public.admin_users to authenticated;
grant insert, update, delete on public.products, public.story_content to authenticated;

insert into public.story_content (
  id, eyebrow, title, intro, heading, body_one, body_two, quote, body_three
) values (
  'main',
  'Our story',
  E'Style,\nyour way.',
  'Getting dressed should feel like joy, not a chore. That is where AllthingscutebyAD began.',
  'Fresh finds you''ll want to wear on repeat',
  'It started with friends asking the same question: where did you get that? We kept finding the heels, the dresses and the little finishing touches that made an outfit feel complete, and we wanted to share them.',
  'Today the shop carries shoes, clothing, wigs, jewelry and bags, plus a few pieces for the home. Everything is chosen by hand. If we wouldn''t wear it again and again, it doesn''t make the shelf.',
  'For every version of you.',
  'Some days you are soft and quiet. Other days you are all heels and gold. We think your wardrobe should have room for both, and that shopping for it should be easy, friendly and a little bit fun.'
) on conflict (id) do nothing;

insert into public.products (id, category, name, price, image_url, badge) values
  ('sunday-best-heels', 'Shoes', 'Sunday Best Heels', 48, '/images/bongiwe/whiteHeels.JPG', 'Bestseller'),
  ('best-heels', 'Shoes', 'Best heels', 44, '/images/bongiwe/whiteHeels2.jpg', 'Just lovely'),
  ('soft-life', 'Clothes', 'Soft Life', 62, '/images/bongiwe/WhiteDress.JPG', 'New in'),
  ('softest-life', 'Clothes', 'Softest Life', 62, '/images/bongiwe/GoldenDress.jpg', 'New in'),
  ('black-shirt', 'Clothes', 'Black shirt for a serious occasion', 62, '/images/bongiwe/shirt.jpg', 'New in'),
  ('wig-one', 'Wigs', 'Perfect hair for a perfect day', 500, '/images/bongiwe/wigs.jpg', 'New in'),
  ('wig-two', 'Wigs', 'Perfect hair for a perfect day', 500, '/images/bongiwe/wigs2.jpg', 'New in'),
  ('golden-hoops', 'Jewelry', 'Golden Hoops', 26, '/images/bongiwe/jewerlyNecklace.JPG', null),
  ('golden-hour', 'Jewelry', 'Golden Hour', 26, '/images/bongiwe/jewerlyWatch.jpg', null),
  ('everywhere-mini-tote', 'Bags', 'Everywhere Mini Tote', 54, '/images/bongiwe/whiteBack.JPG', 'Just lovely'),
  ('everywhere-mini-tote-two', 'Bags', 'Everywhere Mini Tote ya mamizo', 54, '/images/bongiwe/whiteBack.JPG', 'Just lovely'),
  ('more-than-a-chair', 'House Accessories', 'It''s more than a chair', 554, '/images/bongiwe/chair.jpg', 'Just lovely'),
  ('armchair', 'House Accessories', 'It''s more than a chair', 554, '/images/bongiwe/armchair.jpg', 'Just lovely')
on conflict (id) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'site-images',
  'site-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "public can view site images" on storage.objects;
create policy "public can view site images"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'site-images');

drop policy if exists "admins can upload site images" on storage.objects;
create policy "admins can upload site images"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'site-images' and (select public.is_store_admin()));

drop policy if exists "admins can update site images" on storage.objects;
create policy "admins can update site images"
  on storage.objects for update to authenticated
  using (bucket_id = 'site-images' and (select public.is_store_admin()))
  with check (bucket_id = 'site-images' and (select public.is_store_admin()));

drop policy if exists "admins can delete site images" on storage.objects;
create policy "admins can delete site images"
  on storage.objects for delete to authenticated
  using (bucket_id = 'site-images' and (select public.is_store_admin()));
