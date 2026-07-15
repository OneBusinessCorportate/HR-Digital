-- ============================================================================
-- Migration 0003: default recruitment settings + profiles for existing users
-- ============================================================================

insert into public.recruitment_settings (key, value, description) values
  ('test_pass_threshold', '70', 'Минимальный процент для прохождения теста (>=)'),
  ('evaluation_scale_max', '5', 'Максимальный балл шкалы оценки (1..N)'),
  ('probation_days', '30', 'Плановая длительность испытательного срока (дней)'),
  ('retention_days', '30', 'Порог удержания «первого месяца» (дней)')
on conflict (key) do nothing;

-- Provision profiles for the auth users that already exist in this project.
-- admin@ob.local -> admin, talpha@ob.local -> hr (Inga), tbeta@ob.local -> manager.
insert into public.hr_profiles (id, email, full_name, role)
select u.id, u.email,
       case u.email
         when 'admin@ob.local'  then 'Администратор'
         when 'talpha@ob.local' then 'Инга (HR)'
         when 'tbeta@ob.local'  then 'Менеджмент'
         else u.email
       end,
       case u.email
         when 'admin@ob.local'  then 'admin'::hr_role
         when 'talpha@ob.local' then 'hr'::hr_role
         when 'tbeta@ob.local'  then 'manager'::hr_role
         else 'manager'::hr_role
       end
from auth.users u
on conflict (id) do nothing;
