-- ============================================================================
-- HealerJi · seed
-- GENERATED FILE — produced by scripts/generate-seed.mjs from lib/data/*.ts.
-- Do not edit by hand; edit the source data or, after cutover, the database.
--
-- Idempotent: every statement is ON CONFLICT DO UPDATE, so re-running this
-- refreshes content without duplicating rows or disturbing bookings.
--
-- NOTE ON AVAILABILITY: this seed deliberately creates NO availability rules
-- and sets accepting_bookings = false for every healer. Inventing a schedule
-- would let a customer book a time no healer has agreed to. Availability must
-- be entered by each healer in the healer portal (or load supabase/seed.dev.sql
-- for local testing only).
-- ============================================================================

begin;

-- ------------------------------------------------------------- modalities --
insert into public.modalities (slug, name, essence, what, session_note, is_not, path_slugs, display_order, status)
values ('reiki-pranic-healing', 'Reiki & Pranic Healing', 'Gentle energy work for a settled nervous system.', 'A practitioner channels attention and intention through the body''s energy, either hands-on or at a distance, in stillness and silence.', 'You lie or sit comfortably. Your healer guides you into slow breath, then works quietly for 30–45 minutes. Many people describe warmth, heaviness, or simply the deepest rest they''ve had in months.', 'Not a medical treatment. Reiki complements — and never replaces — care from a doctor or therapist.', array['emotional-wellbeing', 'health-vitality']::text[], 0, 'active')
on conflict (slug) do update set name = excluded.name, essence = excluded.essence,
  what = excluded.what, session_note = excluded.session_note, is_not = excluded.is_not,
  path_slugs = excluded.path_slugs, display_order = excluded.display_order;

insert into public.modalities (slug, name, essence, what, session_note, is_not, path_slugs, display_order, status)
values ('spiritual-healing', 'Spiritual Healing', 'Reconnecting with yourself, held in stillness.', 'The broadest of our practices: guided sessions of prayer, presence, and energy work aimed at releasing heavy patterns and reconnecting you with a sense of meaning.', 'Your healer begins by simply listening to what you''re carrying, then guides you through breath, silence, and intention. Sessions end with a practice to take into your week.', 'Not tied to any one religion, and never a replacement for medical or mental-health care. It is time held for the part of you that daily life rarely makes room for.', array['emotional-wellbeing', 'health-vitality']::text[], 1, 'active')
on conflict (slug) do update set name = excluded.name, essence = excluded.essence,
  what = excluded.what, session_note = excluded.session_note, is_not = excluded.is_not,
  path_slugs = excluded.path_slugs, display_order = excluded.display_order;

insert into public.modalities (slug, name, essence, what, session_note, is_not, path_slugs, display_order, status)
values ('chakra-healing', 'Chakra Healing', 'Balance for the body''s seven energy centres.', 'Rooted in yogic tradition, chakra work uses breath, sound, and guided attention to notice where energy feels stuck and invite it to move. Explore all seven energy centres on our interactive chakra map at /chakras.', 'A guided journey through each centre — root to crown — with your healer reading where you hold tension and offering practices to carry home.', 'Not a diagnosis of anything physical. A map for self-reflection, held within a living tradition.', array['emotional-wellbeing', 'health-vitality']::text[], 2, 'active')
on conflict (slug) do update set name = excluded.name, essence = excluded.essence,
  what = excluded.what, session_note = excluded.session_note, is_not = excluded.is_not,
  path_slugs = excluded.path_slugs, display_order = excluded.display_order;

insert into public.modalities (slug, name, essence, what, session_note, is_not, path_slugs, display_order, status)
values ('inner-child-healing', 'Inner Child Healing', 'Meeting the younger you with kindness.', 'Guided visualisation and dialogue with the parts of you formed in childhood — the ones that still flinch, still hope, still wait to be heard.', 'Your healer creates a slow, safe container. You may revisit a memory, write a letter, or simply sit with what arises. Tears are welcome here.', 'Not trauma therapy. For clinical trauma, we will always encourage you to also work with a qualified mental-health professional.', array['emotional-wellbeing', 'relationships']::text[], 3, 'active')
on conflict (slug) do update set name = excluded.name, essence = excluded.essence,
  what = excluded.what, session_note = excluded.session_note, is_not = excluded.is_not,
  path_slugs = excluded.path_slugs, display_order = excluded.display_order;

insert into public.modalities (slug, name, essence, what, session_note, is_not, path_slugs, display_order, status)
values ('hooponopono-healing', 'Ho''oponopono', 'The Hawaiian practice of radical forgiveness.', 'Four phrases — I''m sorry. Please forgive me. Thank you. I love you. — repeated as a practice of release, toward others and toward yourself.', 'Your healer teaches the rhythm of the phrases, then holds space while you direct them where they''re needed most. Simple. Surprisingly deep.', 'Not about excusing harm done to you. Forgiveness here is something you do for your own peace.', array['relationships', 'emotional-wellbeing']::text[], 4, 'active')
on conflict (slug) do update set name = excluded.name, essence = excluded.essence,
  what = excluded.what, session_note = excluded.session_note, is_not = excluded.is_not,
  path_slugs = excluded.path_slugs, display_order = excluded.display_order;

insert into public.modalities (slug, name, essence, what, session_note, is_not, path_slugs, display_order, status)
values ('crystal-healing', 'Crystal Healing', 'Stones as anchors for intention.', 'Practitioners place and work with crystals as focal points for attention, intention, and calm — a tactile, grounding ritual practice.', 'You''ll be guided to choose stones that draw you, learn their traditional associations, and rest while your healer arranges them in a layout.', 'Crystals hold meaning, not medicine. We say this plainly because trust matters more to us than mystique.', array['emotional-wellbeing', 'money-abundance']::text[], 5, 'active')
on conflict (slug) do update set name = excluded.name, essence = excluded.essence,
  what = excluded.what, session_note = excluded.session_note, is_not = excluded.is_not,
  path_slugs = excluded.path_slugs, display_order = excluded.display_order;

insert into public.modalities (slug, name, essence, what, session_note, is_not, path_slugs, display_order, status)
values ('aura-cleansing', 'Aura Cleansing', 'Clearing what you''ve been carrying.', 'A ritual of sweeping, smoke, sound, or guided breath to mark a clean boundary between what happened and what comes next.', 'Twenty minutes of unhurried ritual. People often book this after endings — a job, a relationship, a hard season.', 'A ritual of transition, not a shield against life. What it changes is how you meet what comes.', array['emotional-wellbeing', 'career-purpose']::text[], 6, 'active')
on conflict (slug) do update set name = excluded.name, essence = excluded.essence,
  what = excluded.what, session_note = excluded.session_note, is_not = excluded.is_not,
  path_slugs = excluded.path_slugs, display_order = excluded.display_order;

insert into public.modalities (slug, name, essence, what, session_note, is_not, path_slugs, display_order, status)
values ('law-of-attraction', 'Law of Attraction', 'Attention as a practice, not a magic trick.', 'Coaching in clarity: naming what you actually want, noticing the self-talk that argues against it, and building daily practices of focus.', 'Part conversation, part exercise. You''ll leave with a written intention and one small practice for the week.', 'Not a guarantee of outcomes, and never a reason to blame yourself for hardship. It is a discipline of attention.', array['money-abundance', 'career-purpose']::text[], 7, 'active')
on conflict (slug) do update set name = excluded.name, essence = excluded.essence,
  what = excluded.what, session_note = excluded.session_note, is_not = excluded.is_not,
  path_slugs = excluded.path_slugs, display_order = excluded.display_order;

insert into public.modalities (slug, name, essence, what, session_note, is_not, path_slugs, display_order, status)
values ('akashic-records-reader', 'Akashic Records Reading', 'A contemplative reading of your soul''s story.', 'In this tradition, a reader enters a meditative state and offers reflections on your life''s patterns, framed as insight from the akasha.', 'You bring questions. Your reader opens the session with a prayer, then speaks to what they perceive. Most people describe it as being deeply, unusually seen.', 'Offered as contemplative tradition and personal insight — not as verifiable fact or fortune-telling.', array['career-purpose', 'relationships']::text[], 8, 'active')
on conflict (slug) do update set name = excluded.name, essence = excluded.essence,
  what = excluded.what, session_note = excluded.session_note, is_not = excluded.is_not,
  path_slugs = excluded.path_slugs, display_order = excluded.display_order;

insert into public.modalities (slug, name, essence, what, session_note, is_not, path_slugs, display_order, status)
values ('subliminal-healing', 'Subliminal Healing', 'Quiet affirmations beneath calming sound.', 'Audio sessions layering gentle affirmations under music or nature sound, designed for repeated listening as a self-soothing practice.', 'Mostly practised at home through our Library. Your healer curates a track sequence for your intention and checks in weekly.', 'A relaxation and self-talk practice. Evidence for subliminal effects is limited, and we won''t pretend otherwise — many people simply find the ritual calming.', array['emotional-wellbeing', 'health-vitality']::text[], 9, 'active')
on conflict (slug) do update set name = excluded.name, essence = excluded.essence,
  what = excluded.what, session_note = excluded.session_note, is_not = excluded.is_not,
  path_slugs = excluded.path_slugs, display_order = excluded.display_order;

insert into public.modalities (slug, name, essence, what, session_note, is_not, path_slugs, display_order, status)
values ('swar-vigyan', 'Swar Vigyan', 'The ancient Indian science of breath.', 'An old and subtle practice observing the rhythm of breath through each nostril, using breath awareness to steady the mind and body.', 'Your healer teaches you to read your own breath and gives you a daily practice of a few quiet minutes. Deceptively simple; quietly profound.', 'A contemplative breath practice from Indian tradition — always practised gently, never as breath-holding endurance.', array['health-vitality', 'emotional-wellbeing']::text[], 10, 'active')
on conflict (slug) do update set name = excluded.name, essence = excluded.essence,
  what = excluded.what, session_note = excluded.session_note, is_not = excluded.is_not,
  path_slugs = excluded.path_slugs, display_order = excluded.display_order;

insert into public.modalities (slug, name, essence, what, session_note, is_not, path_slugs, display_order, status)
values ('nlp', 'NLP Coaching', 'Rewriting the scripts you run on autopilot.', 'Neuro-Linguistic Programming works with language and mental patterns — reframing the stories you tell yourself about what''s possible.', 'Structured and practical. You''ll name a stuck pattern, trace its language, and practise a reframe until it holds.', 'Coaching, not psychotherapy. Useful for habits and confidence; not a substitute for clinical care.', array['career-purpose', 'relationships']::text[], 11, 'active')
on conflict (slug) do update set name = excluded.name, essence = excluded.essence,
  what = excluded.what, session_note = excluded.session_note, is_not = excluded.is_not,
  path_slugs = excluded.path_slugs, display_order = excluded.display_order;

insert into public.modalities (slug, name, essence, what, session_note, is_not, path_slugs, display_order, status)
values ('life-coach', 'Life Coaching', 'A steady hand for the next chapter.', 'Goal-centred conversations that turn ''I don''t know what I''m doing'' into a plan you actually believe in — with someone who holds you to it.', 'Fifty minutes of focused conversation ending in one commitment. Your coach follows up before your next session. That''s the point.', 'Your coach won''t decide for you. The answers are yours; the structure is theirs.', array['career-purpose', 'money-abundance']::text[], 12, 'active')
on conflict (slug) do update set name = excluded.name, essence = excluded.essence,
  what = excluded.what, session_note = excluded.session_note, is_not = excluded.is_not,
  path_slugs = excluded.path_slugs, display_order = excluded.display_order;

-- -------------------------------------------------------------- languages --
insert into public.languages (code, name, display_order) values ('bn', 'Bengali', 0)
on conflict (code) do update set name = excluded.name;
insert into public.languages (code, name, display_order) values ('en', 'English', 1)
on conflict (code) do update set name = excluded.name;
insert into public.languages (code, name, display_order) values ('hi', 'Hindi', 2)
on conflict (code) do update set name = excluded.name;
insert into public.languages (code, name, display_order) values ('kn', 'Kannada', 3)
on conflict (code) do update set name = excluded.name;
insert into public.languages (code, name, display_order) values ('mr', 'Marathi', 4)
on conflict (code) do update set name = excluded.name;
insert into public.languages (code, name, display_order) values ('ta', 'Tamil', 5)
on conflict (code) do update set name = excluded.name;
insert into public.languages (code, name, display_order) values ('ur', 'Urdu', 6)
on conflict (code) do update set name = excluded.name;

-- ------------------------------------------------------ article categories --
insert into public.article_categories (slug, name, display_order, status) values ('breath', 'Breath', 0, 'active')
on conflict (slug) do update set name = excluded.name;
insert into public.article_categories (slug, name, display_order, status) values ('chakra-wisdom', 'Chakra wisdom', 1, 'active')
on conflict (slug) do update set name = excluded.name;
insert into public.article_categories (slug, name, display_order, status) values ('energy-healing', 'Energy healing', 2, 'active')
on conflict (slug) do update set name = excluded.name;
insert into public.article_categories (slug, name, display_order, status) values ('forgiveness', 'Forgiveness', 3, 'active')
on conflict (slug) do update set name = excluded.name;
insert into public.article_categories (slug, name, display_order, status) values ('getting-started', 'Getting started', 4, 'active')
on conflict (slug) do update set name = excluded.name;
insert into public.article_categories (slug, name, display_order, status) values ('mindset', 'Mindset', 5, 'active')
on conflict (slug) do update set name = excluded.name;

-- ---------------------------------------------------------------- healers --
-- Meera Krishnan
insert into public.healers (
  slug, name, headline, bio, gender, years, rating, reviews_count,
  price_paise, currency, verified_identity, verified_credentials, verified_interviewed,
  timezone, featured, display_order, status
) values (
  'meera-krishnan', 'Meera Krishnan', 'Reiki Master · 14 years of quiet, careful energy work', 'I came to Reiki after a decade in nursing, looking for what medicine couldn''t name. Sessions with me are slow, warm, and unhurried — we begin with your breath and end with your questions.', 'female', 14,
  4.9, 312, 49900, 'INR',
  true, true, true,
  'Asia/Kolkata', true, 0, 'active'
)
on conflict (slug) do update set
  name = excluded.name, headline = excluded.headline, bio = excluded.bio,
  gender = excluded.gender, years = excluded.years, rating = excluded.rating,
  reviews_count = excluded.reviews_count, price_paise = excluded.price_paise,
  verified_identity = excluded.verified_identity,
  verified_credentials = excluded.verified_credentials,
  verified_interviewed = excluded.verified_interviewed,
  display_order = excluded.display_order;

delete from public.healer_modalities where healer_id = (select id from public.healers where slug = 'meera-krishnan');
insert into public.healer_modalities (healer_id, modality_slug, display_order)
values ((select id from public.healers where slug = 'meera-krishnan'), 'reiki-pranic-healing', 0)
on conflict do nothing;
insert into public.healer_modalities (healer_id, modality_slug, display_order)
values ((select id from public.healers where slug = 'meera-krishnan'), 'spiritual-healing', 1)
on conflict do nothing;
delete from public.healer_languages where healer_id = (select id from public.healers where slug = 'meera-krishnan');
insert into public.healer_languages (healer_id, language_code, display_order)
values ((select id from public.healers where slug = 'meera-krishnan'), 'en', 0)
on conflict do nothing;
insert into public.healer_languages (healer_id, language_code, display_order)
values ((select id from public.healers where slug = 'meera-krishnan'), 'hi', 1)
on conflict do nothing;
insert into public.healer_languages (healer_id, language_code, display_order)
values ((select id from public.healers where slug = 'meera-krishnan'), 'ta', 2)
on conflict do nothing;
insert into public.session_offerings (healer_id, kind, duration_minutes, price_paise, active)
values ((select id from public.healers where slug = 'meera-krishnan'), 'audio', 30, 33267, true)
on conflict (healer_id, kind, duration_minutes) do update set price_paise = excluded.price_paise, active = true;
insert into public.session_offerings (healer_id, kind, duration_minutes, price_paise, active)
values ((select id from public.healers where slug = 'meera-krishnan'), 'audio', 45, 49900, true)
on conflict (healer_id, kind, duration_minutes) do update set price_paise = excluded.price_paise, active = true;
insert into public.session_offerings (healer_id, kind, duration_minutes, price_paise, active)
values ((select id from public.healers where slug = 'meera-krishnan'), 'audio', 60, 66533, true)
on conflict (healer_id, kind, duration_minutes) do update set price_paise = excluded.price_paise, active = true;
insert into public.session_offerings (healer_id, kind, duration_minutes, price_paise, active)
values ((select id from public.healers where slug = 'meera-krishnan'), 'video', 30, 33267, true)
on conflict (healer_id, kind, duration_minutes) do update set price_paise = excluded.price_paise, active = true;
insert into public.session_offerings (healer_id, kind, duration_minutes, price_paise, active)
values ((select id from public.healers where slug = 'meera-krishnan'), 'video', 45, 49900, true)
on conflict (healer_id, kind, duration_minutes) do update set price_paise = excluded.price_paise, active = true;
insert into public.session_offerings (healer_id, kind, duration_minutes, price_paise, active)
values ((select id from public.healers where slug = 'meera-krishnan'), 'video', 60, 66533, true)
on conflict (healer_id, kind, duration_minutes) do update set price_paise = excluded.price_paise, active = true;
insert into public.healer_booking_settings (healer_id, timezone, accepting_bookings)
values ((select id from public.healers where slug = 'meera-krishnan'), 'Asia/Kolkata', false)
on conflict (healer_id) do nothing;   -- never re-close a healer who has opened their calendar

-- Arjun Mehta
insert into public.healers (
  slug, name, headline, bio, gender, years, rating, reviews_count,
  price_paise, currency, verified_identity, verified_credentials, verified_interviewed,
  timezone, featured, display_order, status
) values (
  'arjun-mehta', 'Arjun Mehta', 'Life & career coach for people at a crossroads', 'Ex-consultant. I left the ladder to help others decide whether to climb it. I coach with structure, honesty, and one commitment per session — no vague pep talks.', 'male', 9,
  4.8, 204, 59900, 'INR',
  true, true, true,
  'Asia/Kolkata', true, 1, 'active'
)
on conflict (slug) do update set
  name = excluded.name, headline = excluded.headline, bio = excluded.bio,
  gender = excluded.gender, years = excluded.years, rating = excluded.rating,
  reviews_count = excluded.reviews_count, price_paise = excluded.price_paise,
  verified_identity = excluded.verified_identity,
  verified_credentials = excluded.verified_credentials,
  verified_interviewed = excluded.verified_interviewed,
  display_order = excluded.display_order;

delete from public.healer_modalities where healer_id = (select id from public.healers where slug = 'arjun-mehta');
insert into public.healer_modalities (healer_id, modality_slug, display_order)
values ((select id from public.healers where slug = 'arjun-mehta'), 'life-coach', 0)
on conflict do nothing;
insert into public.healer_modalities (healer_id, modality_slug, display_order)
values ((select id from public.healers where slug = 'arjun-mehta'), 'nlp', 1)
on conflict do nothing;
delete from public.healer_languages where healer_id = (select id from public.healers where slug = 'arjun-mehta');
insert into public.healer_languages (healer_id, language_code, display_order)
values ((select id from public.healers where slug = 'arjun-mehta'), 'en', 0)
on conflict do nothing;
insert into public.healer_languages (healer_id, language_code, display_order)
values ((select id from public.healers where slug = 'arjun-mehta'), 'hi', 1)
on conflict do nothing;
insert into public.session_offerings (healer_id, kind, duration_minutes, price_paise, active)
values ((select id from public.healers where slug = 'arjun-mehta'), 'chat', 30, 39933, true)
on conflict (healer_id, kind, duration_minutes) do update set price_paise = excluded.price_paise, active = true;
insert into public.session_offerings (healer_id, kind, duration_minutes, price_paise, active)
values ((select id from public.healers where slug = 'arjun-mehta'), 'chat', 45, 59900, true)
on conflict (healer_id, kind, duration_minutes) do update set price_paise = excluded.price_paise, active = true;
insert into public.session_offerings (healer_id, kind, duration_minutes, price_paise, active)
values ((select id from public.healers where slug = 'arjun-mehta'), 'chat', 60, 79867, true)
on conflict (healer_id, kind, duration_minutes) do update set price_paise = excluded.price_paise, active = true;
insert into public.session_offerings (healer_id, kind, duration_minutes, price_paise, active)
values ((select id from public.healers where slug = 'arjun-mehta'), 'audio', 30, 39933, true)
on conflict (healer_id, kind, duration_minutes) do update set price_paise = excluded.price_paise, active = true;
insert into public.session_offerings (healer_id, kind, duration_minutes, price_paise, active)
values ((select id from public.healers where slug = 'arjun-mehta'), 'audio', 45, 59900, true)
on conflict (healer_id, kind, duration_minutes) do update set price_paise = excluded.price_paise, active = true;
insert into public.session_offerings (healer_id, kind, duration_minutes, price_paise, active)
values ((select id from public.healers where slug = 'arjun-mehta'), 'audio', 60, 79867, true)
on conflict (healer_id, kind, duration_minutes) do update set price_paise = excluded.price_paise, active = true;
insert into public.session_offerings (healer_id, kind, duration_minutes, price_paise, active)
values ((select id from public.healers where slug = 'arjun-mehta'), 'video', 30, 39933, true)
on conflict (healer_id, kind, duration_minutes) do update set price_paise = excluded.price_paise, active = true;
insert into public.session_offerings (healer_id, kind, duration_minutes, price_paise, active)
values ((select id from public.healers where slug = 'arjun-mehta'), 'video', 45, 59900, true)
on conflict (healer_id, kind, duration_minutes) do update set price_paise = excluded.price_paise, active = true;
insert into public.session_offerings (healer_id, kind, duration_minutes, price_paise, active)
values ((select id from public.healers where slug = 'arjun-mehta'), 'video', 60, 79867, true)
on conflict (healer_id, kind, duration_minutes) do update set price_paise = excluded.price_paise, active = true;
insert into public.healer_booking_settings (healer_id, timezone, accepting_bookings)
values ((select id from public.healers where slug = 'arjun-mehta'), 'Asia/Kolkata', false)
on conflict (healer_id) do nothing;   -- never re-close a healer who has opened their calendar

-- Sana Qureshi
insert into public.healers (
  slug, name, headline, bio, gender, years, rating, reviews_count,
  price_paise, currency, verified_identity, verified_credentials, verified_interviewed,
  timezone, featured, display_order, status
) values (
  'sana-qureshi', 'Sana Qureshi', 'Inner-child work, held gently in Hindi and Urdu', 'बचपन की आवाज़ें कभी पुरानी नहीं होतीं. I hold slow, safe sessions where the younger you finally gets to speak — and be answered with kindness.', 'female', 7,
  5, 158, 44900, 'INR',
  true, false, true,
  'Asia/Kolkata', true, 2, 'active'
)
on conflict (slug) do update set
  name = excluded.name, headline = excluded.headline, bio = excluded.bio,
  gender = excluded.gender, years = excluded.years, rating = excluded.rating,
  reviews_count = excluded.reviews_count, price_paise = excluded.price_paise,
  verified_identity = excluded.verified_identity,
  verified_credentials = excluded.verified_credentials,
  verified_interviewed = excluded.verified_interviewed,
  display_order = excluded.display_order;

delete from public.healer_modalities where healer_id = (select id from public.healers where slug = 'sana-qureshi');
insert into public.healer_modalities (healer_id, modality_slug, display_order)
values ((select id from public.healers where slug = 'sana-qureshi'), 'inner-child-healing', 0)
on conflict do nothing;
insert into public.healer_modalities (healer_id, modality_slug, display_order)
values ((select id from public.healers where slug = 'sana-qureshi'), 'hooponopono-healing', 1)
on conflict do nothing;
delete from public.healer_languages where healer_id = (select id from public.healers where slug = 'sana-qureshi');
insert into public.healer_languages (healer_id, language_code, display_order)
values ((select id from public.healers where slug = 'sana-qureshi'), 'hi', 0)
on conflict do nothing;
insert into public.healer_languages (healer_id, language_code, display_order)
values ((select id from public.healers where slug = 'sana-qureshi'), 'ur', 1)
on conflict do nothing;
insert into public.healer_languages (healer_id, language_code, display_order)
values ((select id from public.healers where slug = 'sana-qureshi'), 'en', 2)
on conflict do nothing;
insert into public.session_offerings (healer_id, kind, duration_minutes, price_paise, active)
values ((select id from public.healers where slug = 'sana-qureshi'), 'audio', 30, 29933, true)
on conflict (healer_id, kind, duration_minutes) do update set price_paise = excluded.price_paise, active = true;
insert into public.session_offerings (healer_id, kind, duration_minutes, price_paise, active)
values ((select id from public.healers where slug = 'sana-qureshi'), 'audio', 45, 44900, true)
on conflict (healer_id, kind, duration_minutes) do update set price_paise = excluded.price_paise, active = true;
insert into public.session_offerings (healer_id, kind, duration_minutes, price_paise, active)
values ((select id from public.healers where slug = 'sana-qureshi'), 'audio', 60, 59867, true)
on conflict (healer_id, kind, duration_minutes) do update set price_paise = excluded.price_paise, active = true;
insert into public.session_offerings (healer_id, kind, duration_minutes, price_paise, active)
values ((select id from public.healers where slug = 'sana-qureshi'), 'video', 30, 29933, true)
on conflict (healer_id, kind, duration_minutes) do update set price_paise = excluded.price_paise, active = true;
insert into public.session_offerings (healer_id, kind, duration_minutes, price_paise, active)
values ((select id from public.healers where slug = 'sana-qureshi'), 'video', 45, 44900, true)
on conflict (healer_id, kind, duration_minutes) do update set price_paise = excluded.price_paise, active = true;
insert into public.session_offerings (healer_id, kind, duration_minutes, price_paise, active)
values ((select id from public.healers where slug = 'sana-qureshi'), 'video', 60, 59867, true)
on conflict (healer_id, kind, duration_minutes) do update set price_paise = excluded.price_paise, active = true;
insert into public.healer_booking_settings (healer_id, timezone, accepting_bookings)
values ((select id from public.healers where slug = 'sana-qureshi'), 'Asia/Kolkata', false)
on conflict (healer_id) do nothing;   -- never re-close a healer who has opened their calendar

-- Devika Rao
insert into public.healers (
  slug, name, headline, bio, gender, years, rating, reviews_count,
  price_paise, currency, verified_identity, verified_credentials, verified_interviewed,
  timezone, featured, display_order, status
) values (
  'devika-rao', 'Devika Rao', 'Akashic reader & contemplative guide', 'I read the records the way my teacher taught me: with reverence, and without pretending to know more than I''m shown. Bring questions you actually care about.', 'female', 11,
  4.7, 189, 69900, 'INR',
  true, true, true,
  'Asia/Kolkata', false, 3, 'active'
)
on conflict (slug) do update set
  name = excluded.name, headline = excluded.headline, bio = excluded.bio,
  gender = excluded.gender, years = excluded.years, rating = excluded.rating,
  reviews_count = excluded.reviews_count, price_paise = excluded.price_paise,
  verified_identity = excluded.verified_identity,
  verified_credentials = excluded.verified_credentials,
  verified_interviewed = excluded.verified_interviewed,
  display_order = excluded.display_order;

delete from public.healer_modalities where healer_id = (select id from public.healers where slug = 'devika-rao');
insert into public.healer_modalities (healer_id, modality_slug, display_order)
values ((select id from public.healers where slug = 'devika-rao'), 'akashic-records-reader', 0)
on conflict do nothing;
insert into public.healer_modalities (healer_id, modality_slug, display_order)
values ((select id from public.healers where slug = 'devika-rao'), 'law-of-attraction', 1)
on conflict do nothing;
delete from public.healer_languages where healer_id = (select id from public.healers where slug = 'devika-rao');
insert into public.healer_languages (healer_id, language_code, display_order)
values ((select id from public.healers where slug = 'devika-rao'), 'en', 0)
on conflict do nothing;
insert into public.healer_languages (healer_id, language_code, display_order)
values ((select id from public.healers where slug = 'devika-rao'), 'kn', 1)
on conflict do nothing;
insert into public.healer_languages (healer_id, language_code, display_order)
values ((select id from public.healers where slug = 'devika-rao'), 'hi', 2)
on conflict do nothing;
insert into public.session_offerings (healer_id, kind, duration_minutes, price_paise, active)
values ((select id from public.healers where slug = 'devika-rao'), 'video', 30, 46600, true)
on conflict (healer_id, kind, duration_minutes) do update set price_paise = excluded.price_paise, active = true;
insert into public.session_offerings (healer_id, kind, duration_minutes, price_paise, active)
values ((select id from public.healers where slug = 'devika-rao'), 'video', 45, 69900, true)
on conflict (healer_id, kind, duration_minutes) do update set price_paise = excluded.price_paise, active = true;
insert into public.session_offerings (healer_id, kind, duration_minutes, price_paise, active)
values ((select id from public.healers where slug = 'devika-rao'), 'video', 60, 93200, true)
on conflict (healer_id, kind, duration_minutes) do update set price_paise = excluded.price_paise, active = true;
insert into public.healer_booking_settings (healer_id, timezone, accepting_bookings)
values ((select id from public.healers where slug = 'devika-rao'), 'Asia/Kolkata', false)
on conflict (healer_id) do nothing;   -- never re-close a healer who has opened their calendar

-- Kabir Anand
insert into public.healers (
  slug, name, headline, bio, gender, years, rating, reviews_count,
  price_paise, currency, verified_identity, verified_credentials, verified_interviewed,
  timezone, featured, display_order, status
) values (
  'kabir-anand', 'Kabir Anand', 'Swar Vigyan & breath — the oldest medicine we have', 'Eighteen years of teaching people to read their own breath. My sessions are 20% talking and 80% breathing. Students say the quiet is the lesson.', 'male', 18,
  4.9, 267, 39900, 'INR',
  true, true, true,
  'Asia/Kolkata', false, 4, 'active'
)
on conflict (slug) do update set
  name = excluded.name, headline = excluded.headline, bio = excluded.bio,
  gender = excluded.gender, years = excluded.years, rating = excluded.rating,
  reviews_count = excluded.reviews_count, price_paise = excluded.price_paise,
  verified_identity = excluded.verified_identity,
  verified_credentials = excluded.verified_credentials,
  verified_interviewed = excluded.verified_interviewed,
  display_order = excluded.display_order;

delete from public.healer_modalities where healer_id = (select id from public.healers where slug = 'kabir-anand');
insert into public.healer_modalities (healer_id, modality_slug, display_order)
values ((select id from public.healers where slug = 'kabir-anand'), 'swar-vigyan', 0)
on conflict do nothing;
insert into public.healer_modalities (healer_id, modality_slug, display_order)
values ((select id from public.healers where slug = 'kabir-anand'), 'subliminal-healing', 1)
on conflict do nothing;
delete from public.healer_languages where healer_id = (select id from public.healers where slug = 'kabir-anand');
insert into public.healer_languages (healer_id, language_code, display_order)
values ((select id from public.healers where slug = 'kabir-anand'), 'hi', 0)
on conflict do nothing;
insert into public.healer_languages (healer_id, language_code, display_order)
values ((select id from public.healers where slug = 'kabir-anand'), 'en', 1)
on conflict do nothing;
insert into public.healer_languages (healer_id, language_code, display_order)
values ((select id from public.healers where slug = 'kabir-anand'), 'mr', 2)
on conflict do nothing;
insert into public.session_offerings (healer_id, kind, duration_minutes, price_paise, active)
values ((select id from public.healers where slug = 'kabir-anand'), 'audio', 30, 26600, true)
on conflict (healer_id, kind, duration_minutes) do update set price_paise = excluded.price_paise, active = true;
insert into public.session_offerings (healer_id, kind, duration_minutes, price_paise, active)
values ((select id from public.healers where slug = 'kabir-anand'), 'audio', 45, 39900, true)
on conflict (healer_id, kind, duration_minutes) do update set price_paise = excluded.price_paise, active = true;
insert into public.session_offerings (healer_id, kind, duration_minutes, price_paise, active)
values ((select id from public.healers where slug = 'kabir-anand'), 'audio', 60, 53200, true)
on conflict (healer_id, kind, duration_minutes) do update set price_paise = excluded.price_paise, active = true;
insert into public.session_offerings (healer_id, kind, duration_minutes, price_paise, active)
values ((select id from public.healers where slug = 'kabir-anand'), 'video', 30, 26600, true)
on conflict (healer_id, kind, duration_minutes) do update set price_paise = excluded.price_paise, active = true;
insert into public.session_offerings (healer_id, kind, duration_minutes, price_paise, active)
values ((select id from public.healers where slug = 'kabir-anand'), 'video', 45, 39900, true)
on conflict (healer_id, kind, duration_minutes) do update set price_paise = excluded.price_paise, active = true;
insert into public.session_offerings (healer_id, kind, duration_minutes, price_paise, active)
values ((select id from public.healers where slug = 'kabir-anand'), 'video', 60, 53200, true)
on conflict (healer_id, kind, duration_minutes) do update set price_paise = excluded.price_paise, active = true;
insert into public.healer_booking_settings (healer_id, timezone, accepting_bookings)
values ((select id from public.healers where slug = 'kabir-anand'), 'Asia/Kolkata', false)
on conflict (healer_id) do nothing;   -- never re-close a healer who has opened their calendar

-- Ananya Bose
insert into public.healers (
  slug, name, headline, bio, gender, years, rating, reviews_count,
  price_paise, currency, verified_identity, verified_credentials, verified_interviewed,
  timezone, featured, display_order, status
) values (
  'ananya-bose', 'Ananya Bose', 'Crystal & aura ritual work for life''s transitions', 'People come to me at endings — jobs, cities, marriages. Ritual gives the ending a shape, so the beginning can have one too.', 'female', 6,
  4.8, 121, 42900, 'INR',
  true, false, true,
  'Asia/Kolkata', false, 5, 'active'
)
on conflict (slug) do update set
  name = excluded.name, headline = excluded.headline, bio = excluded.bio,
  gender = excluded.gender, years = excluded.years, rating = excluded.rating,
  reviews_count = excluded.reviews_count, price_paise = excluded.price_paise,
  verified_identity = excluded.verified_identity,
  verified_credentials = excluded.verified_credentials,
  verified_interviewed = excluded.verified_interviewed,
  display_order = excluded.display_order;

delete from public.healer_modalities where healer_id = (select id from public.healers where slug = 'ananya-bose');
insert into public.healer_modalities (healer_id, modality_slug, display_order)
values ((select id from public.healers where slug = 'ananya-bose'), 'crystal-healing', 0)
on conflict do nothing;
insert into public.healer_modalities (healer_id, modality_slug, display_order)
values ((select id from public.healers where slug = 'ananya-bose'), 'aura-cleansing', 1)
on conflict do nothing;
delete from public.healer_languages where healer_id = (select id from public.healers where slug = 'ananya-bose');
insert into public.healer_languages (healer_id, language_code, display_order)
values ((select id from public.healers where slug = 'ananya-bose'), 'bn', 0)
on conflict do nothing;
insert into public.healer_languages (healer_id, language_code, display_order)
values ((select id from public.healers where slug = 'ananya-bose'), 'en', 1)
on conflict do nothing;
insert into public.healer_languages (healer_id, language_code, display_order)
values ((select id from public.healers where slug = 'ananya-bose'), 'hi', 2)
on conflict do nothing;
insert into public.session_offerings (healer_id, kind, duration_minutes, price_paise, active)
values ((select id from public.healers where slug = 'ananya-bose'), 'chat', 30, 28600, true)
on conflict (healer_id, kind, duration_minutes) do update set price_paise = excluded.price_paise, active = true;
insert into public.session_offerings (healer_id, kind, duration_minutes, price_paise, active)
values ((select id from public.healers where slug = 'ananya-bose'), 'chat', 45, 42900, true)
on conflict (healer_id, kind, duration_minutes) do update set price_paise = excluded.price_paise, active = true;
insert into public.session_offerings (healer_id, kind, duration_minutes, price_paise, active)
values ((select id from public.healers where slug = 'ananya-bose'), 'chat', 60, 57200, true)
on conflict (healer_id, kind, duration_minutes) do update set price_paise = excluded.price_paise, active = true;
insert into public.session_offerings (healer_id, kind, duration_minutes, price_paise, active)
values ((select id from public.healers where slug = 'ananya-bose'), 'video', 30, 28600, true)
on conflict (healer_id, kind, duration_minutes) do update set price_paise = excluded.price_paise, active = true;
insert into public.session_offerings (healer_id, kind, duration_minutes, price_paise, active)
values ((select id from public.healers where slug = 'ananya-bose'), 'video', 45, 42900, true)
on conflict (healer_id, kind, duration_minutes) do update set price_paise = excluded.price_paise, active = true;
insert into public.session_offerings (healer_id, kind, duration_minutes, price_paise, active)
values ((select id from public.healers where slug = 'ananya-bose'), 'video', 60, 57200, true)
on conflict (healer_id, kind, duration_minutes) do update set price_paise = excluded.price_paise, active = true;
insert into public.healer_booking_settings (healer_id, timezone, accepting_bookings)
values ((select id from public.healers where slug = 'ananya-bose'), 'Asia/Kolkata', false)
on conflict (healer_id) do nothing;   -- never re-close a healer who has opened their calendar

-- --------------------------------------------------------------- articles --
insert into public.articles (
  slug, title, kind, category_slug, pathway, read_minutes, excerpt,
  body_blocks, body_markdown, author_name, status, published_at, featured
) values (
  'first-reiki-session-what-to-expect', 'Your first Reiki session: what actually happens', 'guide', 'energy-healing', 'energy-healing',
  5, 'The honest, minute-by-minute walkthrough we wish every first-timer had.',
  '["The most common feeling before a first Reiki session isn''t scepticism — it''s the fear of doing it wrong. So let''s remove that first: there is nothing to do. Reiki asks only that you show up and be comfortable.","Your session begins with a short conversation. Your healer will ask what brings you, how you''ve been sleeping, where you hold tension. Say as much or as little as you like; this isn''t an interview, it''s orientation.","Then, stillness. On a video or audio session you''ll be guided to sit or lie down, close your eyes, and follow a few slow breaths. Your healer then works quietly — often in near-silence — for twenty to thirty minutes. People describe warmth, heaviness in the limbs, images drifting past, or simply the deepest rest they''ve had in months. All of these are normal. So is feeling nothing dramatic at all.","Sessions end gently: a few minutes to return, a short reflection, and usually one small practice to take with you. Drink water afterwards, and give yourself an unhurried evening if you can.","One honest note, always: Reiki complements medical and mental-health care — it never replaces it. Come for rest, for support, for stillness. Keep your doctor for your doctoring."]'::jsonb,
  'The most common feeling before a first Reiki session isn''t scepticism — it''s the fear of doing it wrong. So let''s remove that first: there is nothing to do. Reiki asks only that you show up and be comfortable.

Your session begins with a short conversation. Your healer will ask what brings you, how you''ve been sleeping, where you hold tension. Say as much or as little as you like; this isn''t an interview, it''s orientation.

Then, stillness. On a video or audio session you''ll be guided to sit or lie down, close your eyes, and follow a few slow breaths. Your healer then works quietly — often in near-silence — for twenty to thirty minutes. People describe warmth, heaviness in the limbs, images drifting past, or simply the deepest rest they''ve had in months. All of these are normal. So is feeling nothing dramatic at all.

Sessions end gently: a few minutes to return, a short reflection, and usually one small practice to take with you. Drink water afterwards, and give yourself an unhurried evening if you can.

One honest note, always: Reiki complements medical and mental-health care — it never replaces it. Come for rest, for support, for stillness. Keep your doctor for your doctoring.',
  'The HealerJi Journal', 'published', '2026-02-11'::timestamptz, false
)
on conflict (slug) do update set
  title = excluded.title, kind = excluded.kind, category_slug = excluded.category_slug,
  pathway = excluded.pathway, read_minutes = excluded.read_minutes,
  excerpt = excluded.excerpt, body_blocks = excluded.body_blocks,
  body_markdown = excluded.body_markdown, author_name = excluded.author_name,
  published_at = excluded.published_at;

insert into public.articles (
  slug, title, kind, category_slug, pathway, read_minutes, excerpt,
  body_blocks, body_markdown, author_name, status, published_at, featured
) values (
  'nine-minute-swar-vigyan-practice', 'A nine-minute Swar Vigyan practice for racing nights', 'guide', 'breath', 'stress-anxiety',
  4, 'The breath-awareness ritual our healers teach most often — written down.',
  '["Swar Vigyan, the old Indian science of breath, begins with observation rather than control. Tonight, that''s all you''ll do.","Sit or lie comfortably. Close your right nostril gently with your thumb and breathe through the left for a moment; then switch. Notice which side flows more freely. Don''t fix it — just notice. In the tradition, this simple noticing is itself the first medicine.","Now rest both hands and breathe normally. Count each exhale, one to ten, then begin again. When the mind wanders — it will, that''s its job — return to one without commentary. Nine minutes of this is enough; a timer with a soft chime helps.","The practice works not by emptying the mind but by giving it one warm, boring task. Racing thoughts rarely stop on command; they quiet when attention has somewhere kinder to live.","If sleeplessness is constant, or worry is interfering with your days, please also speak to a doctor or counsellor. This practice is a companion for hard nights — not a treatment for a condition."]'::jsonb,
  'Swar Vigyan, the old Indian science of breath, begins with observation rather than control. Tonight, that''s all you''ll do.

Sit or lie comfortably. Close your right nostril gently with your thumb and breathe through the left for a moment; then switch. Notice which side flows more freely. Don''t fix it — just notice. In the tradition, this simple noticing is itself the first medicine.

Now rest both hands and breathe normally. Count each exhale, one to ten, then begin again. When the mind wanders — it will, that''s its job — return to one without commentary. Nine minutes of this is enough; a timer with a soft chime helps.

The practice works not by emptying the mind but by giving it one warm, boring task. Racing thoughts rarely stop on command; they quiet when attention has somewhere kinder to live.

If sleeplessness is constant, or worry is interfering with your days, please also speak to a doctor or counsellor. This practice is a companion for hard nights — not a treatment for a condition.',
  'The HealerJi Journal', 'published', '2026-03-04'::timestamptz, false
)
on conflict (slug) do update set
  title = excluded.title, kind = excluded.kind, category_slug = excluded.category_slug,
  pathway = excluded.pathway, read_minutes = excluded.read_minutes,
  excerpt = excluded.excerpt, body_blocks = excluded.body_blocks,
  body_markdown = excluded.body_markdown, author_name = excluded.author_name,
  published_at = excluded.published_at;

insert into public.articles (
  slug, title, kind, category_slug, pathway, read_minutes, excerpt,
  body_blocks, body_markdown, author_name, status, published_at, featured
) values (
  'hooponopono-four-phrases', 'Four phrases that carry a whole tradition', 'article', 'forgiveness', 'relationships',
  6, 'I''m sorry. Please forgive me. Thank you. I love you. Why Ho''oponopono endures.',
  '["Ho''oponopono — ''to make right'' — is a Hawaiian practice of reconciliation that travelled the world on the strength of four short phrases: I''m sorry. Please forgive me. Thank you. I love you.","The practice is deceptively simple: you bring to mind a person, a memory, or a version of yourself, and repeat the phrases slowly — not as performance, but as release. The tradition holds that what we carry unforgiven, we carry everywhere.","A crucial clarification our healers make in every session: this is not about excusing harm done to you. You can release the weight of a wound without declaring it acceptable. Forgiveness here is something you do for your own peace, on your own schedule — including the choice not to, yet.","Many people begin with the hardest recipient of all: themselves. The younger self who chose wrong, the parent-self who lost patience, the version of you from last Tuesday. The phrases don''t argue with your inner critic; they simply keep speaking until something softens.","On HealerJi, Ho''oponopono is practised in guided one-to-one sessions, often alongside inner-child work. It pairs well with heartbreak, family knots, and the quiet art of ending a year without carrying it into the next."]'::jsonb,
  'Ho''oponopono — ''to make right'' — is a Hawaiian practice of reconciliation that travelled the world on the strength of four short phrases: I''m sorry. Please forgive me. Thank you. I love you.

The practice is deceptively simple: you bring to mind a person, a memory, or a version of yourself, and repeat the phrases slowly — not as performance, but as release. The tradition holds that what we carry unforgiven, we carry everywhere.

A crucial clarification our healers make in every session: this is not about excusing harm done to you. You can release the weight of a wound without declaring it acceptable. Forgiveness here is something you do for your own peace, on your own schedule — including the choice not to, yet.

Many people begin with the hardest recipient of all: themselves. The younger self who chose wrong, the parent-self who lost patience, the version of you from last Tuesday. The phrases don''t argue with your inner critic; they simply keep speaking until something softens.

On HealerJi, Ho''oponopono is practised in guided one-to-one sessions, often alongside inner-child work. It pairs well with heartbreak, family knots, and the quiet art of ending a year without carrying it into the next.',
  'The HealerJi Journal', 'published', '2026-03-26'::timestamptz, false
)
on conflict (slug) do update set
  title = excluded.title, kind = excluded.kind, category_slug = excluded.category_slug,
  pathway = excluded.pathway, read_minutes = excluded.read_minutes,
  excerpt = excluded.excerpt, body_blocks = excluded.body_blocks,
  body_markdown = excluded.body_markdown, author_name = excluded.author_name,
  published_at = excluded.published_at;

insert into public.articles (
  slug, title, kind, category_slug, pathway, read_minutes, excerpt,
  body_blocks, body_markdown, author_name, status, published_at, featured
) values (
  'chakras-a-map-not-a-diagnosis', 'The chakras: a map, not a diagnosis', 'article', 'chakra-wisdom', 'spiritual-growth',
  7, 'How to hold a 2,000-year-old map of inner life honestly in a modern hand.',
  '["The chakra system — seven energy centres drawn along the spine, from the root at the pelvic floor to the crown above the head — is one of the oldest maps of inner life we have. Like all good maps, its power depends on knowing what it is for.","It is not anatomy. No scan will find a spinning wheel at your solar plexus, and honest healers say so plainly. What the tradition offers instead is a language: a way of noticing that fear lives low in the body, that grief sits in the chest, that unsaid words gather in the throat. Millennia of practitioners found the map useful precisely because experience keeps agreeing with it.","Read this way, chakra work becomes self-reflection with structure. When a healer works with your heart centre, the real material is love, grief and forgiveness; the green light and lotus petals are the tradition''s poetry for it. You can take the poetry literally, symbolically, or simply gratefully — the practice works the same.","Begin anywhere, but the tradition suggests beginning low: ground before you climb. Our interactive chakra map walks all seven energy centres — location, meaning, and the practices that work with each.","And the standing rule of this platform applies here as everywhere: the chakra map complements medical care and never replaces it. It is a mirror for the inner life — keep the stethoscope for the outer one."]'::jsonb,
  'The chakra system — seven energy centres drawn along the spine, from the root at the pelvic floor to the crown above the head — is one of the oldest maps of inner life we have. Like all good maps, its power depends on knowing what it is for.

It is not anatomy. No scan will find a spinning wheel at your solar plexus, and honest healers say so plainly. What the tradition offers instead is a language: a way of noticing that fear lives low in the body, that grief sits in the chest, that unsaid words gather in the throat. Millennia of practitioners found the map useful precisely because experience keeps agreeing with it.

Read this way, chakra work becomes self-reflection with structure. When a healer works with your heart centre, the real material is love, grief and forgiveness; the green light and lotus petals are the tradition''s poetry for it. You can take the poetry literally, symbolically, or simply gratefully — the practice works the same.

Begin anywhere, but the tradition suggests beginning low: ground before you climb. Our interactive chakra map walks all seven energy centres — location, meaning, and the practices that work with each.

And the standing rule of this platform applies here as everywhere: the chakra map complements medical care and never replaces it. It is a mirror for the inner life — keep the stethoscope for the outer one.',
  'The HealerJi Journal', 'published', '2026-04-15'::timestamptz, false
)
on conflict (slug) do update set
  title = excluded.title, kind = excluded.kind, category_slug = excluded.category_slug,
  pathway = excluded.pathway, read_minutes = excluded.read_minutes,
  excerpt = excluded.excerpt, body_blocks = excluded.body_blocks,
  body_markdown = excluded.body_markdown, author_name = excluded.author_name,
  published_at = excluded.published_at;

insert into public.articles (
  slug, title, kind, category_slug, pathway, read_minutes, excerpt,
  body_blocks, body_markdown, author_name, status, published_at, featured
) values (
  'choosing-your-first-healer', 'How to choose your first healer', 'guide', 'getting-started', 'emotional-wellbeing',
  5, 'Language first, modality second, and three more rules from inside the panel.',
  '["Choosing a first healer feels weighty, so here is the quiet truth from inside the platform: the match matters more than the modality, and language matters most of all.","Rule one: heal in your mother tongue if you can. Grief and hope live deeper than second languages. Every HealerJi profile lists languages first for exactly this reason — filter by yours before anything else.","Rule two: let your concern choose the practice. You don''t need to know what Ho''oponopono is; you need to know that your chest has been tight since the breakup. Start from the pathway — health, relationships, career, money, emotions — and let it introduce the practices.","Rule three: read the healer''s own words. Certifications tell you what someone studied; a bio tells you who they are at minute five of a hard conversation. Trust your read.","Rule four: the first session is a meeting, not a marriage. Book one session, notice how you feel — heard, hurried, held? — and decide from there. Joining HealerJi is free and you pay per session precisely so that trying is cheap and staying is a choice."]'::jsonb,
  'Choosing a first healer feels weighty, so here is the quiet truth from inside the platform: the match matters more than the modality, and language matters most of all.

Rule one: heal in your mother tongue if you can. Grief and hope live deeper than second languages. Every HealerJi profile lists languages first for exactly this reason — filter by yours before anything else.

Rule two: let your concern choose the practice. You don''t need to know what Ho''oponopono is; you need to know that your chest has been tight since the breakup. Start from the pathway — health, relationships, career, money, emotions — and let it introduce the practices.

Rule three: read the healer''s own words. Certifications tell you what someone studied; a bio tells you who they are at minute five of a hard conversation. Trust your read.

Rule four: the first session is a meeting, not a marriage. Book one session, notice how you feel — heard, hurried, held? — and decide from there. Joining HealerJi is free and you pay per session precisely so that trying is cheap and staying is a choice.',
  'The HealerJi Journal', 'published', '2026-05-02'::timestamptz, false
)
on conflict (slug) do update set
  title = excluded.title, kind = excluded.kind, category_slug = excluded.category_slug,
  pathway = excluded.pathway, read_minutes = excluded.read_minutes,
  excerpt = excluded.excerpt, body_blocks = excluded.body_blocks,
  body_markdown = excluded.body_markdown, author_name = excluded.author_name,
  published_at = excluded.published_at;

insert into public.articles (
  slug, title, kind, category_slug, pathway, read_minutes, excerpt,
  body_blocks, body_markdown, author_name, status, published_at, featured
) values (
  'law-of-attraction-without-magical-thinking', 'Law of Attraction, without the magical thinking', 'article', 'mindset', 'money-abundance',
  6, 'What the practice looks like when it''s coaching, not wishing.',
  '["The Law of Attraction has a branding problem: its loudest versions promise parking spots and lottery wins, and its quietest version — the one our coaches actually teach — gets drowned out.","The quiet version goes like this: attention is a resource, and most of us spend it rehearsing failure. The practice is a discipline of redirecting attention — naming precisely what you want, noticing the inner argument against it, and building small daily acts that agree with the goal rather than the fear.","In a coaching session this looks unglamorous and effective: writing an intention in one clear sentence; catching the reflexive ''people like me can''t''; choosing one action this week that a person with your goal would take. Manifestation, at ground level, is mostly congruence.","Two honesty rules govern how this is taught on HealerJi. First: no outcome is guaranteed, ever, and no coach here will promise one. Second: hardship is not your fault for ''thinking wrong'' — that inversion of the practice is cruelty dressed as wisdom, and we reject it plainly.","What remains, stripped of magic, is still remarkable: people who spend a season aligning attention, self-talk and action tend to move. Not because the universe rearranged itself — because they did."]'::jsonb,
  'The Law of Attraction has a branding problem: its loudest versions promise parking spots and lottery wins, and its quietest version — the one our coaches actually teach — gets drowned out.

The quiet version goes like this: attention is a resource, and most of us spend it rehearsing failure. The practice is a discipline of redirecting attention — naming precisely what you want, noticing the inner argument against it, and building small daily acts that agree with the goal rather than the fear.

In a coaching session this looks unglamorous and effective: writing an intention in one clear sentence; catching the reflexive ''people like me can''t''; choosing one action this week that a person with your goal would take. Manifestation, at ground level, is mostly congruence.

Two honesty rules govern how this is taught on HealerJi. First: no outcome is guaranteed, ever, and no coach here will promise one. Second: hardship is not your fault for ''thinking wrong'' — that inversion of the practice is cruelty dressed as wisdom, and we reject it plainly.

What remains, stripped of magic, is still remarkable: people who spend a season aligning attention, self-talk and action tend to move. Not because the universe rearranged itself — because they did.',
  'The HealerJi Journal', 'published', '2026-05-21'::timestamptz, false
)
on conflict (slug) do update set
  title = excluded.title, kind = excluded.kind, category_slug = excluded.category_slug,
  pathway = excluded.pathway, read_minutes = excluded.read_minutes,
  excerpt = excluded.excerpt, body_blocks = excluded.body_blocks,
  body_markdown = excluded.body_markdown, author_name = excluded.author_name,
  published_at = excluded.published_at;

-- ----------------------------------------------------------- testimonials --
insert into public.testimonials (display_name, anonymous, path_slug, quote, status, display_order)
values ('Ritu M.', false, 'emotional-wellbeing', 'Mujhe hamesha lagta tha ke stress aur past trauma kabhi khatam nahi hoga. Phir Healerji se mila, aur unhone itne easy aur effective tarike diye ki ab sab kuch manageable lagta hai.', 'published', 0)
on conflict do nothing;
insert into public.testimonials (display_name, anonymous, path_slug, quote, status, display_order)
values ('Rahul G.', false, 'career-purpose', 'Career mein ek point ke baad growth nahi ho rahi thi, sab hopeless lag raha tha. Healerji ki guidance se apna mindset shift kiya, aur ab kaam aur personal life dono balance mein hain.', 'published', 1)
on conflict do nothing;
insert into public.testimonials (display_name, anonymous, path_slug, quote, status, display_order)
values ('Kavita C.', false, 'health-vitality', 'Health issues ke saath mind ko positive rakhna kaafi mushkil tha, but Healerji ke mindfulness tools aur meditation techniques ne mujhe ek naya perspective diya.', 'published', 2)
on conflict do nothing;
insert into public.testimonials (display_name, anonymous, path_slug, quote, status, display_order)
values ('Name withheld', true, 'relationships', 'Relationship breakdown ke waqt sab kuch ek saath handle karna impossible lag raha tha. Healerji ke support se maine khud ko sambhalna seekha — ab cheezein wapas track par hain.', 'published', 3)
on conflict do nothing;

-- --------------------------------------------------------------- practices --
insert into public.practices (slug, title, summary, category, after_note, pathway, minutes, steps, status, display_order, published_at)
values ('nine-minute-breath', 'Nine minutes of breath', 'The Swar Vigyan practice our healers teach most often — observation before control, counted exhales, nothing to get right.', 'Breath', 'If sleeplessness or worry is constant, please also speak with a doctor or counsellor. This is a companion for hard nights, not a treatment for a condition.', NULL, 9, '[{"say":"Sit or lie however you''re comfortable. Let your hands rest. Nothing to fix yet — just arrive.","seconds":40},{"say":"Close your right nostril gently with your thumb. Breathe through the left. Notice how freely it flows.","seconds":45},{"say":"Switch. Close the left, breathe through the right. Notice the difference — don''t correct it.","seconds":45},{"say":"Let both hands rest. Breathe normally. This noticing is itself the first medicine.","seconds":40},{"say":"Now count each exhale, one to ten. When you reach ten, begin again at one.","seconds":120},{"say":"The mind will wander. That is its job. Return to one, without commentary.","seconds":120},{"say":"Keep counting. Slower now if it suits you. Nowhere else to be for these two minutes.","seconds":120},{"say":"Let the counting go. Sit with whatever is here — quieter, or not. Both are fine.","seconds":60},{"say":"When you''re ready, open your eyes. Move slowly for a moment before you stand.","seconds":30}]'::jsonb, 'published', 0, now())
on conflict (slug) do update set title = excluded.title, summary = excluded.summary,
  category = excluded.category, after_note = excluded.after_note,
  minutes = excluded.minutes, steps = excluded.steps;

insert into public.practices (slug, title, summary, category, after_note, pathway, minutes, steps, status, display_order, published_at)
values ('four-phrases', 'The four phrases', 'Ho''oponopono, practised slowly: I''m sorry. Please forgive me. Thank you. I love you — offered wherever it''s hardest.', 'Forgiveness', 'Releasing the weight of a wound is not the same as declaring it acceptable. You can do this at your own pace, including not yet.', NULL, 7, '[{"say":"Settle. Three slow breaths, longer out than in.","seconds":40},{"say":"Bring one person to mind. Not the hardest one yet — someone the heart can hold today.","seconds":45},{"say":"Say, silently or aloud: I''m sorry. Let it be simple. Repeat it until it stops being a performance.","seconds":75},{"say":"Please forgive me. Notice what argues back. Let it argue; keep saying the words.","seconds":75},{"say":"Thank you. For what they gave, or taught, or survived alongside you.","seconds":75},{"say":"I love you. Whatever that means today — respect, release, or simply the wish that they be well.","seconds":75},{"say":"Now, if you''re willing, turn all four phrases toward yourself. Most people find this the hardest part.","seconds":90},{"say":"Rest. Nothing needs resolving today. Something has already moved.","seconds":45}]'::jsonb, 'published', 1, now())
on conflict (slug) do update set title = excluded.title, summary = excluded.summary,
  category = excluded.category, after_note = excluded.after_note,
  minutes = excluded.minutes, steps = excluded.steps;

insert into public.practices (slug, title, summary, category, after_note, pathway, minutes, steps, status, display_order, published_at)
values ('grounding-five', 'Grounding, in five minutes', 'For the moments when the day gets ahead of you — attention brought back to the body, one sense at a time.', 'Grounding', 'Panic and constant anxiety deserve professional support alongside practices like this. Tele-MANAS: 14416.', NULL, 5, '[{"say":"Plant both feet. Feel the floor take your weight. It has been doing so all along.","seconds":45},{"say":"Name five things you can see. Slowly, in your head, one by one.","seconds":60},{"say":"Four things you can feel. Fabric, air, the chair, your own hands.","seconds":60},{"say":"Three things you can hear. Include the sounds you''d normally filter out.","seconds":50},{"say":"Two things you can smell, or the memory of two. One thing you can taste.","seconds":45},{"say":"One long breath out. You are here, and here is manageable.","seconds":40}]'::jsonb, 'published', 2, now())
on conflict (slug) do update set title = excluded.title, summary = excluded.summary,
  category = excluded.category, after_note = excluded.after_note,
  minutes = excluded.minutes, steps = excluded.steps;

insert into public.practices (slug, title, summary, category, after_note, pathway, minutes, steps, status, display_order, published_at)
values ('heart-centre-rest', 'Rest at the heart centre', 'A gentle energy practice on the anahata centre, for grief, guardedness, and the chest that''s felt tight for weeks.', 'Energy', 'Energy practices sit alongside medical care, never instead of it. Chest pain of any kind belongs to a doctor first.', NULL, 8, '[{"say":"Lie down if you can. Place one hand at the centre of your chest — not the left side, the middle.","seconds":50},{"say":"Breathe so that your hand rises. Let the breath be low and unhurried.","seconds":70},{"say":"Imagine warmth under your palm. Not a colour, not a light show — just warmth, the way a hand warms a cup.","seconds":80},{"say":"If grief arrives, let it. You don''t have to do anything with it. It is allowed to be here.","seconds":90},{"say":"Breathe into the warmth. Widen it gently, at whatever pace it agrees to.","seconds":80},{"say":"Now let the imagery go. Keep the hand. Keep the breath.","seconds":70},{"say":"Come back slowly. Wiggle your fingers before you sit up.","seconds":40}]'::jsonb, 'published', 3, now())
on conflict (slug) do update set title = excluded.title, summary = excluded.summary,
  category = excluded.category, after_note = excluded.after_note,
  minutes = excluded.minutes, steps = excluded.steps;

-- ---------------------------------------------------------- app settings --
insert into public.app_settings (key, value, label, description, category)
values ('booking.default_hold_minutes', '15'::jsonb, 'Slot hold duration', 'How long a slot is reserved while payment completes.', 'booking')
on conflict (key) do nothing;
insert into public.app_settings (key, value, label, description, category)
values ('booking.default_buffer_minutes', '15'::jsonb, 'Default buffer', 'Gap after a session before the next may start.', 'booking')
on conflict (key) do nothing;
insert into public.app_settings (key, value, label, description, category)
values ('booking.default_max_advance_days', '60'::jsonb, 'Booking window', 'How far ahead the public calendar allows booking.', 'booking')
on conflict (key) do nothing;
insert into public.app_settings (key, value, label, description, category)
values ('analytics.retention_days', '400'::jsonb, 'Analytics retention', 'Raw page views and events older than this are purged.', 'analytics')
on conflict (key) do nothing;
insert into public.app_settings (key, value, label, description, category)
values ('analytics.exclude_bots', 'true'::jsonb, 'Exclude bots', 'Filter known crawlers out of reporting.', 'analytics')
on conflict (key) do nothing;

commit;
