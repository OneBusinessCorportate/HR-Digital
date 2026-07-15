-- ============================================================================
-- DEV / DEMO SEED — NOT FOR PRODUCTION
--
-- Repeatable & idempotent: it removes prior seed rows (identified by the
-- @seed.local email marker) before re-inserting. Never run against a project
-- that holds real candidate data.
--
-- Creates candidates across every stage, incl. a rejected candidate and two
-- probation completions (one retained, one not), plus contacts, tests,
-- interviews, evaluations, offers, probation records, notes, stage history and
-- an activity log so all metrics/timeline views are populated.
-- ============================================================================

do $$
declare
  v_hr uuid;
  v_mgr uuid;
  a uuid; b uuid; c uuid; d uuid; e uuid; f uuid; g uuid; h uuid;
begin
  select id into v_hr from public.hr_profiles where role = 'hr' order by created_at limit 1;
  select id into v_mgr from public.hr_profiles where role in ('admin','manager') order by created_at limit 1;
  if v_hr is null then raise notice 'No HR profile found; aborting seed'; return; end if;

  -- Clean previous seed (cascades to all child rows).
  delete from public.candidates where email like '%@seed.local';

  -- 1) Анна — hired & retained (full happy path)
  insert into public.candidates (full_name, phone, email, telegram, position, source, stage, first_contact_date, responsible_user_id, created_by, created_at)
  values ('Анна Мкртчян','+37411000001','anna@seed.local','@anna','Менеджер по продажам','target','hired', (now()-interval '25 day')::date, v_hr, v_hr, now()-interval '25 day') returning id into a;

  -- 2) Борис — probation in progress
  insert into public.candidates (full_name, phone, email, position, source, stage, first_contact_date, responsible_user_id, created_by, created_at)
  values ('Борис Арутюнян','+37411000002','boris@seed.local','Оператор','application','probation', (now()-interval '20 day')::date, v_hr, v_hr, now()-interval '20 day') returning id into b;

  -- 3) Виктор — interview scheduled (upcoming)
  insert into public.candidates (full_name, phone, email, telegram, position, source, stage, first_contact_date, responsible_user_id, created_by, created_at, next_action, next_action_date)
  values ('Виктор Погосян','+37411000003','viktor@seed.local','@viktor','Разработчик','linkedin','interview', (now()-interval '10 day')::date, v_hr, v_hr, now()-interval '10 day', 'Провести собеседование', (now()+interval '2 day')::date) returning id into c;

  -- 4) Галина — test sent, awaiting result
  insert into public.candidates (full_name, phone, email, position, source, stage, first_contact_date, responsible_user_id, created_by, created_at, next_action, next_action_date)
  values ('Галина Саркисян','+37411000004','galina@seed.local','Маркетолог','recommendation','test', (now()-interval '6 day')::date, v_hr, v_hr, now()-interval '6 day', 'Проверить тест', (now()-interval '1 day')::date) returning id into d;

  -- 5) Дмитрий — rejected at test stage
  insert into public.candidates (full_name, phone, email, position, source, stage, first_contact_date, responsible_user_id, created_by, created_at, rejection_stage, rejection_reason, rejection_date, rejection_comment)
  values ('Дмитрий Хачатрян','+37411000005','dmitry@seed.local','Оператор','telegram','rejected', (now()-interval '15 day')::date, v_hr, v_hr, now()-interval '15 day', 'test','Результат теста ниже порога', (now()-interval '12 day')::date, 'Набрал 55%') returning id into e;

  -- 6) Елена — screening (passed test)
  insert into public.candidates (full_name, phone, email, position, source, stage, first_contact_date, responsible_user_id, created_by, created_at)
  values ('Елена Григорян','+37411000006','elena@seed.local','Дизайнер','job_platform','screening', (now()-interval '4 day')::date, v_hr, v_hr, now()-interval '4 day') returning id into f;

  -- 7) Жанна — first contact only
  insert into public.candidates (full_name, phone, email, position, source, stage, first_contact_date, responsible_user_id, created_by, created_at, next_action)
  values ('Жанна Аветисян','+37411000007','zhanna@seed.local','Ассистент','target','first_contact', (now()-interval '1 day')::date, v_hr, v_hr, now()-interval '1 day', NULL) returning id into g;

  -- 8) Игорь — hired but resigned during probation (not retained)
  insert into public.candidates (full_name, phone, email, position, source, stage, first_contact_date, responsible_user_id, created_by, created_at)
  values ('Игорь Симонян','+37411000008','igor@seed.local','Продавец','application','hired', (now()-interval '40 day')::date, v_hr, v_hr, now()-interval '40 day') returning id into h;

  -- ── Stage history (progression) ──────────────────────────────────────────
  insert into public.candidate_stage_history (candidate_id, from_stage, to_stage, changed_by, created_at) values
    (a,null,'first_contact',v_hr, now()-interval '25 day'),
    (a,'first_contact','test',v_hr, now()-interval '24 day'),
    (a,'test','screening',v_hr, now()-interval '22 day'),
    (a,'screening','interview',v_hr, now()-interval '20 day'),
    (a,'interview','experience_eval',v_hr, now()-interval '18 day'),
    (a,'experience_eval','offer',v_hr, now()-interval '16 day'),
    (a,'offer','probation',v_hr, now()-interval '14 day'),
    (a,'probation','hired',v_hr, now()-interval '2 day'),
    (b,null,'first_contact',v_hr, now()-interval '20 day'),
    (b,'first_contact','test',v_hr, now()-interval '19 day'),
    (b,'test','screening',v_hr, now()-interval '17 day'),
    (b,'screening','interview',v_hr, now()-interval '15 day'),
    (b,'interview','offer',v_hr, now()-interval '12 day'),
    (b,'offer','probation',v_hr, now()-interval '8 day'),
    (c,null,'first_contact',v_hr, now()-interval '10 day'),
    (c,'first_contact','test',v_hr, now()-interval '9 day'),
    (c,'test','screening',v_hr, now()-interval '7 day'),
    (c,'screening','interview',v_hr, now()-interval '5 day'),
    (d,null,'first_contact',v_hr, now()-interval '6 day'),
    (d,'first_contact','test',v_hr, now()-interval '5 day'),
    (e,null,'first_contact',v_hr, now()-interval '15 day'),
    (e,'first_contact','test',v_hr, now()-interval '14 day'),
    (e,'test','rejected',v_hr, now()-interval '12 day'),
    (f,null,'first_contact',v_hr, now()-interval '4 day'),
    (f,'first_contact','test',v_hr, now()-interval '3 day'),
    (f,'test','screening',v_hr, now()-interval '2 day'),
    (g,null,'first_contact',v_hr, now()-interval '1 day'),
    (h,null,'first_contact',v_hr, now()-interval '40 day'),
    (h,'first_contact','test',v_hr, now()-interval '39 day'),
    (h,'test','screening',v_hr, now()-interval '37 day'),
    (h,'screening','interview',v_hr, now()-interval '35 day'),
    (h,'interview','offer',v_hr, now()-interval '33 day'),
    (h,'offer','probation',v_hr, now()-interval '31 day'),
    (h,'probation','hired',v_hr, now()-interval '30 day');

  -- ── Contacts ────────────────────────────────────────────────────────────
  insert into public.candidate_contacts (candidate_id, contact_at, channel, result, note, created_by) values
    (a, now()-interval '25 day','phone','moved_to_test','Заинтересован', v_hr),
    (b, now()-interval '20 day','telegram','interested','Хороший контакт', v_hr),
    (c, now()-interval '10 day','phone','interested',null, v_hr),
    (d, now()-interval '6 day','whatsapp','contacted',null, v_hr),
    (e, now()-interval '15 day','phone','contacted',null, v_hr),
    (f, now()-interval '4 day','email','interested',null, v_hr),
    (g, now()-interval '1 day','phone','follow_up','Перезвонить', v_hr),
    (h, now()-interval '40 day','phone','moved_to_test',null, v_hr);

  -- ── Tests ───────────────────────────────────────────────────────────────
  insert into public.candidate_tests (candidate_id, sent_date, completed_date, score, max_score, score_percent, passed, threshold_used, created_by, created_at) values
    (a,(now()-interval '24 day')::date,(now()-interval '23 day')::date,85,100,85,true,70,v_hr, now()-interval '23 day'),
    (b,(now()-interval '19 day')::date,(now()-interval '18 day')::date,78,100,78,true,70,v_hr, now()-interval '18 day'),
    (c,(now()-interval '9 day')::date,(now()-interval '8 day')::date,90,100,90,true,70,v_hr, now()-interval '8 day'),
    (d,(now()-interval '5 day')::date,null,null,null,null,null,70,v_hr, now()-interval '5 day'),
    (e,(now()-interval '14 day')::date,(now()-interval '13 day')::date,55,100,55,false,70,v_hr, now()-interval '13 day'),
    (f,(now()-interval '3 day')::date,(now()-interval '2 day')::date,72,100,72,true,70,v_hr, now()-interval '2 day'),
    (h,(now()-interval '39 day')::date,(now()-interval '38 day')::date,80,100,80,true,70,v_hr, now()-interval '38 day');

  -- ── Interviews ──────────────────────────────────────────────────────────
  insert into public.interviews (candidate_id, scheduled_start, duration_minutes, format, meet_link, status, summary, recommendation, created_by, created_at) values
    (a, now()-interval '20 day', 45,'google_meet','https://meet.google.com/seed-anna','completed','Сильный кандидат','Сильный кандидат', v_hr, now()-interval '21 day'),
    (b, now()-interval '15 day', 45,'google_meet','https://meet.google.com/seed-boris','completed','Хороший кандидат',null, v_hr, now()-interval '16 day'),
    (c, now()+interval '2 day', 60,'google_meet','https://meet.google.com/seed-viktor','scheduled',null,null, v_hr, now()-interval '5 day'),
    (h, now()-interval '35 day', 45,'office',null,'completed','Ок',null, v_hr, now()-interval '36 day');

  insert into public.interview_participants (interview_id, name)
  select i.id, 'Инга' from public.interviews i join public.candidates cc on cc.id=i.candidate_id where cc.email like '%@seed.local';

  -- ── Evaluations ─────────────────────────────────────────────────────────
  insert into public.candidate_evaluations (candidate_id, scale_max, professional_score, communication_score, motivation_score, skills_score, culture_fit_score, overall_score, recommendation, evaluated_by, created_at) values
    (a,5,5,5,4,5,5,5,'strong', v_hr, now()-interval '18 day'),
    (b,5,4,4,4,3,4,4,'proceed', v_hr, now()-interval '13 day'),
    (h,5,4,3,4,4,3,4,'proceed', v_hr, now()-interval '34 day');

  -- ── Offers ──────────────────────────────────────────────────────────────
  insert into public.offers (candidate_id, decision_date, decision, decision_by, position, salary, expected_start_date, status, created_by, created_at) values
    (a,(now()-interval '16 day')::date,'approved',v_mgr,'Менеджер по продажам','350000 AMD',(now()-interval '14 day')::date,'accepted', v_hr, now()-interval '16 day'),
    (b,(now()-interval '12 day')::date,'approved',v_mgr,'Оператор','250000 AMD',(now()-interval '8 day')::date,'accepted', v_hr, now()-interval '12 day'),
    (h,(now()-interval '33 day')::date,'approved',v_mgr,'Продавец','230000 AMD',(now()-interval '30 day')::date,'accepted', v_hr, now()-interval '33 day');

  -- ── Probation ───────────────────────────────────────────────────────────
  insert into public.probation_periods (candidate_id, start_date, planned_end_date, actual_end_date, status, first_month_retained, manager_id, created_by, created_at) values
    (a,(now()-interval '14 day')::date,(now()+interval '16 day')::date,(now()-interval '2 day')::date,'passed',true, v_mgr, v_hr, now()-interval '14 day'),
    (b,(now()-interval '8 day')::date,(now()+interval '22 day')::date,null,'in_progress',null, v_mgr, v_hr, now()-interval '8 day'),
    (h,(now()-interval '31 day')::date,(now()-interval '1 day')::date,(now()-interval '20 day')::date,'resigned',false, v_mgr, v_hr, now()-interval '31 day');

  -- ── Notes ───────────────────────────────────────────────────────────────
  insert into public.candidate_notes (candidate_id, body, created_by, created_at) values
    (a,'Отличное первое впечатление, быстро отвечает.', v_hr, now()-interval '24 day'),
    (c,'Просил перенести собеседование на вечер.', v_hr, now()-interval '4 day');

  -- ── Activity log (drives work-volume + timeline) ──────────────────────────
  insert into public.activity_log (candidate_id, actor_id, action, summary, meta, created_at)
  select candidate_id, changed_by, 'stage.changed', 'Смена этапа', jsonb_build_object('to', to_stage), created_at
  from public.candidate_stage_history h
  where exists (select 1 from public.candidates cc where cc.id=h.candidate_id and cc.email like '%@seed.local');

  insert into public.activity_log (candidate_id, actor_id, action, summary, created_at)
  select id, created_by, 'candidate.created', 'Создан кандидат', created_at from public.candidates where email like '%@seed.local';
  insert into public.activity_log (candidate_id, actor_id, action, summary, meta, created_at)
  select candidate_id, created_by, 'contact.recorded', 'Контакт', jsonb_build_object('result', result), contact_at from public.candidate_contacts where candidate_id in (select id from public.candidates where email like '%@seed.local');
  insert into public.activity_log (candidate_id, actor_id, action, summary, created_at)
  select candidate_id, created_by, 'test.recorded', 'Результат теста', created_at from public.candidate_tests where score is not null and candidate_id in (select id from public.candidates where email like '%@seed.local');
  insert into public.activity_log (candidate_id, actor_id, action, summary, created_at)
  select candidate_id, created_by, 'interview.scheduled', 'Собеседование', created_at from public.interviews where candidate_id in (select id from public.candidates where email like '%@seed.local');
  insert into public.activity_log (candidate_id, actor_id, action, summary, created_at)
  select candidate_id, created_by, 'interview.completed', 'Итог собеседования', scheduled_start from public.interviews where status='completed' and candidate_id in (select id from public.candidates where email like '%@seed.local');
  insert into public.activity_log (candidate_id, actor_id, action, summary, created_at)
  select candidate_id, evaluated_by, 'evaluation.created', 'Оценка', created_at from public.candidate_evaluations where candidate_id in (select id from public.candidates where email like '%@seed.local');
  insert into public.activity_log (candidate_id, actor_id, action, summary, created_at)
  select candidate_id, created_by, 'offer.recorded', 'Оффер', created_at from public.offers where candidate_id in (select id from public.candidates where email like '%@seed.local');
  insert into public.activity_log (candidate_id, actor_id, action, summary, created_at)
  select candidate_id, created_by, 'probation.started', 'Начало исп. срока', created_at from public.probation_periods where candidate_id in (select id from public.candidates where email like '%@seed.local');

  raise notice 'Seed complete: 8 candidates.';
end $$;
