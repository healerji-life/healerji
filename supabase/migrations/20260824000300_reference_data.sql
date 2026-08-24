-- ================================================= reference data (seed) ====
-- HJ-16. modalities, languages, article_categories and app_settings were all
-- empty in production. They are not optional decoration: the healer editor
-- offers modalities and languages as choices, the public /healers page filters
-- on them, the blog filters on article_categories, and app_settings carries the
-- booking defaults. With the tables empty those controls render with nothing to
-- pick and the filters match nothing.
--
-- The values are lifted verbatim from supabase/seed.sql, which is generated
-- from lib/data by scripts/generate-seed.mjs — this is the product's own
-- taxonomy, not invented content.
--
-- Why a migration rather than running seed.sql against production: seed.sql
-- also inserts six demo healers, six articles, four practices and four
-- testimonials. Those are fixtures for a fresh development database. Running it
-- against production would publish fictional healers on a live site. Only the
-- genuine reference data is carried here.
--
-- Every statement is idempotent, exactly as in seed.sql: re-running updates the
-- label and leaves everything else alone, so an edit made in the admin portal
-- is never silently reverted by a redeploy.

-- ---------------------------------------------------------------------------
-- Modalities — the healing practices offered
-- ---------------------------------------------------------------------------

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

-- ---------------------------------------------------------------------------
-- Languages a healer can work in
-- ---------------------------------------------------------------------------

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

-- ---------------------------------------------------------------------------
-- Blog / library categories
-- ---------------------------------------------------------------------------

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

-- ---------------------------------------------------------------------------
-- Platform defaults (on conflict do nothing: never override an operator change)
-- ---------------------------------------------------------------------------

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

