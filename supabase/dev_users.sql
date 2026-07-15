-- ============================================================================
-- DEV / DEMO login users — NOT FOR PRODUCTION
--
-- Creates three demo accounts (password: Demo1234!) so each role can be tried:
--   inga.demo@ob.local     → hr      (Инга — full recruitment editing)
--   admin.demo@ob.local    → admin   (full access)
--   manager.demo@ob.local  → manager (read-only management)
--
-- In a real deployment, users sign up / are invited through Supabase Auth and
-- the handle_new_auth_user trigger provisions a (manager) profile that an admin
-- then promotes. This script only exists to make the demo instantly usable.
-- ============================================================================

do $$
declare
  v_id uuid;
  u_list text[][] := array[
    array['inga.demo@ob.local','hr','Инга (демо HR)'],
    array['admin.demo@ob.local','admin','Администратор (демо)'],
    array['manager.demo@ob.local','manager','Менеджмент (демо)']
  ];
  i int;
begin
  for i in 1 .. array_length(u_list,1) loop
    if not exists (select 1 from auth.users au where au.email = u_list[i][1]) then
      v_id := gen_random_uuid();
      insert into auth.users (
        instance_id, id, aud, role, email, encrypted_password,
        email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
        created_at, updated_at, confirmation_token, email_change,
        email_change_token_new, recovery_token
      ) values (
        '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated',
        u_list[i][1], extensions.crypt('Demo1234!', extensions.gen_salt('bf')),
        now(), '{"provider":"email","providers":["email"]}', json_build_object('full_name', u_list[i][3]),
        now(), now(), '', '', '', ''
      );
      insert into auth.identities (
        id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
      ) values (
        gen_random_uuid(), v_id,
        json_build_object('sub', v_id::text, 'email', u_list[i][1]),
        'email', u_list[i][1], now(), now(), now()
      );
    end if;
  end loop;
end $$;

update public.hr_profiles set role='hr',      full_name='Инга (демо HR)'        where email='inga.demo@ob.local';
update public.hr_profiles set role='admin',   full_name='Администратор (демо)'  where email='admin.demo@ob.local';
update public.hr_profiles set role='manager', full_name='Менеджмент (демо)'     where email='manager.demo@ob.local';
