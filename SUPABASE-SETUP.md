# Supabase setup

The storefront stays static. Supabase supplies product/story storage, uploaded images, admin authentication, and the contact-message inbox. The browser uses only the project's public anon/publishable key; never put a `service_role` key in this site.

## Connect the project

1. Create a Supabase project and run [`supabase/setup.sql`](./supabase/setup.sql) in its SQL Editor.
2. In Supabase Auth, create the admin user yourself and disable public sign-ups. The admin page does not provide registration.
3. Add that user to the admin allow-list from the SQL Editor, substituting the admin's email:

   ```sql
   insert into public.admin_users (user_id)
   select id from auth.users where email = 'admin@example.com'
   on conflict (user_id) do nothing;
   ```

4. Set the Supabase project URL and anon/publishable key in [`JSallthings/supabase-config.js`](./JSallthings/supabase-config.js). These values are public; database RLS policies enforce access.
5. Open `/HTMLallthings/admin.html` and sign in with the admin account.

The setup SQL creates and seeds the product catalog and Our Story content, enables RLS, restricts message reads and content edits to allow-listed admins, and creates the public-read/admin-write image bucket. Contact form submissions continue to use the existing email and spreadsheet integrations; when Supabase is configured they are also saved to the private admin inbox. The inbox is limited to the newest 100 messages.

Products, messages, and story edits are stored in Supabase. Cart contents remain in the visitor's browser using the existing `abd_cart` local-storage key, shared by the home, contact, story, and cart pages.
