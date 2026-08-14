CREATE TABLE IF NOT EXISTS members (
  clerk_user_id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  tier TEXT,
  access_status TEXT NOT NULL DEFAULT 'none',
  role TEXT NOT NULL DEFAULT 'member',
  email_verified INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_members_tier ON members(tier);
CREATE INDEX IF NOT EXISTS idx_members_access_status ON members(access_status);

CREATE TABLE IF NOT EXISTS member_entitlements (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL,
  tier TEXT NOT NULL,
  source_type TEXT NOT NULL,
  source_ref TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY(member_id) REFERENCES members(clerk_user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_member_entitlements_member ON member_entitlements(member_id);

CREATE TABLE IF NOT EXISTS member_sessions (
  session_id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL,
  device_label TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  created_at INTEGER NOT NULL,
  last_active_at INTEGER NOT NULL,
  revoked_at INTEGER,
  revoke_reason TEXT,
  FOREIGN KEY(member_id) REFERENCES members(clerk_user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_member_sessions_member ON member_sessions(member_id);

CREATE TABLE IF NOT EXISTS activity_updates (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  body_markdown TEXT NOT NULL,
  audience TEXT NOT NULL DEFAULT 'all',
  author_name TEXT,
  published_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS courses (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'coming_soon',
  sort_order INTEGER NOT NULL DEFAULT 0,
  badge_text TEXT,
  artwork_url TEXT,
  course_kind TEXT NOT NULL DEFAULT 'course',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS course_modules (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'coming_soon',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY(course_id) REFERENCES courses(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS series (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'coming_soon',
  artwork_url TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  event_kind TEXT NOT NULL,
  access_tier TEXT NOT NULL DEFAULT 'all',
  status TEXT NOT NULL DEFAULT 'scheduled',
  starts_at INTEGER,
  ends_at INTEGER,
  location_type TEXT NOT NULL DEFAULT 'youtube',
  embed_url TEXT,
  booking_url TEXT,
  reminder_enabled INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS event_rsvps (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  member_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'going',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE(event_id, member_id),
  FOREIGN KEY(event_id) REFERENCES events(id) ON DELETE CASCADE,
  FOREIGN KEY(member_id) REFERENCES members(clerk_user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS vip_call_requests (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL,
  goals TEXT NOT NULL,
  preferred_month TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'requested',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY(member_id) REFERENCES members(clerk_user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS vip_call_bookings (
  id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL,
  member_id TEXT NOT NULL,
  starts_at INTEGER NOT NULL,
  ends_at INTEGER NOT NULL,
  zoom_join_url TEXT,
  confirmation_sent_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY(request_id) REFERENCES vip_call_requests(id) ON DELETE CASCADE,
  FOREIGN KEY(member_id) REFERENCES members(clerk_user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS external_links (
  id TEXT PRIMARY KEY,
  link_key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  url TEXT NOT NULL,
  audience TEXT NOT NULL DEFAULT 'all',
  sort_order INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  cta_text TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

INSERT OR IGNORE INTO activity_updates (id, title, body_markdown, audience, author_name, published_at, created_at, updated_at) VALUES
  ('upd_launch_window', 'Members can sign in now', 'The ShivWorks Network is now open as a real member destination. The full curriculum is still in production, but the roadmap, updates, live schedule, and member environment are in place.', 'all', 'ShivWorks Team', 1743379200000, 1743379200000, 1743379200000),
  ('upd_curriculum_map', 'The 11-course curriculum is mapped inside the library', 'Every core ShivWorks course is visible from day one so members can see the structure of what is coming, not just a blank dashboard.', 'all', 'ShivWorks Team', 1743465600000, 1743465600000, 1743465600000),
  ('upd_vip_track', 'VIP call requests are now available in-product', 'VIP members can submit quarterly call requests inside the platform and receive scheduling follow-up from the ShivWorks team.', 'vip', 'ShivWorks Team', 1743552000000, 1743552000000, 1743552000000);

INSERT OR IGNORE INTO courses (id, slug, title, description, status, sort_order, badge_text, artwork_url, course_kind, created_at, updated_at) VALUES
  ('course_foundations', 'shivworks-foundational-modules', 'ShivWorks Foundational Modules', 'Origin story, context, and the Criminal Assault Paradigm that anchors the entire network.', 'coming_soon', 1, 'Coming Soon', NULL, 'course', 1743379200000, 1743379200000),
  ('course_core_skills', 'shivworks-core-skills', 'ShivWorks Core Skills', 'The baseline skills that support every higher-order application inside the method.', 'coming_soon', 2, 'Coming Soon', NULL, 'course', 1743379200000, 1743379200000),
  ('course_muc', 'managing-unknown-contacts', 'Managing Unknown Contacts (MUC)', 'A practical framework for understanding and handling unknown-contact encounters before they become fights.', 'coming_soon', 3, 'Coming Soon', NULL, 'course', 1743379200000, 1743379200000),
  ('course_pcc', 'physical-confrontation-confirmed', 'Physical Confrontation Confirmed (PCC)', 'What to do when ambiguity is over and the fight is already in motion.', 'coming_soon', 4, 'Coming Soon', NULL, 'course', 1743379200000, 1743379200000),
  ('course_wrestling', 'wrestling-in-a-weapons-based-environment', 'The Base of and Strategy For Wrestling in a Weapons Based Environment', 'The positional and strategic layer that underpins real entangled encounters.', 'coming_soon', 5, 'Coming Soon', NULL, 'course', 1743379200000, 1743379200000),
  ('course_grounded', 'grounded-strategy-for-a-weapons-based-environment', 'Grounded Strategy for a Weapons Based Environment', 'Grounded fighting priorities and decisions when weapons are in the equation.', 'coming_soon', 6, 'Coming Soon', NULL, 'course', 1743379200000, 1743379200000),
  ('course_entangled_live_fire', 'entangled-shooting-live-fire-module', 'ShivWorks Entangled Shooting Live Fire Module', 'How the live-fire training layer supports the entangled environment.', 'coming_soon', 7, 'Coming Soon', NULL, 'course', 1743379200000, 1743379200000),
  ('course_edged', 'edged-weapons-overview', 'ShivWorks Edged Weapons Overview', 'An overview of edged weapons concepts, use cases, and training priorities.', 'coming_soon', 8, 'Coming Soon', NULL, 'course', 1743379200000, 1743379200000),
  ('course_ifwa', 'handgun-in-fight-weapons-access', 'ShivWorks Handgun In-Fight Weapons Access (IFWA)', 'Standing and grounded access work when distance has collapsed and timing matters.', 'coming_soon', 9, 'Coming Soon', NULL, 'course', 1743379200000, 1743379200000),
  ('course_retention', 'handgun-retention-recovery-disarming', 'ShivWorks Handgun Retention, Recovery, and Disarming', 'Retention and recovery concepts for close-range handgun problems.', 'coming_soon', 10, 'Coming Soon', NULL, 'course', 1743379200000, 1743379200000),
  ('course_products', 'product-specific-training', 'ShivWorks Product-Specific Training', 'Application-focused instruction for Clinch Pick and Push Dagger use cases.', 'coming_soon', 11, 'Coming Soon', NULL, 'course', 1743379200000, 1743379200000);

INSERT OR IGNORE INTO course_modules (id, course_id, title, description, sort_order, status, created_at, updated_at) VALUES
  ('module_origin', 'course_foundations', 'ShivWorks Origin Story', 'How Craig Douglas built the method from real experience and decades of work.', 1, 'coming_soon', 1743379200000, 1743379200000),
  ('module_cap', 'course_foundations', 'Criminal Assault Paradigm (CAP)', 'The conceptual foundation for understanding criminal assault behavior.', 2, 'coming_soon', 1743379200000, 1743379200000),
  ('module_clinch_pick', 'course_products', 'Introduction to Clinch Pick Application', 'Product-specific overview for Clinch Pick application.', 1, 'coming_soon', 1743379200000, 1743379200000),
  ('module_push_dagger', 'course_products', 'Introduction to Push Dagger Application', 'Product-specific overview for Push Dagger application.', 2, 'coming_soon', 1743379200000, 1743379200000);

INSERT OR IGNORE INTO series (id, slug, title, description, status, artwork_url, created_at, updated_at) VALUES
  ('series_roadshow', 'roadshow-docu-series', 'Roadshow Docu-Series', 'A documentary view into Craig and ShivWorks on the road, the people they meet, and how the work carries into real training environments.', 'coming_soon', NULL, 1743379200000, 1743379200000);

INSERT OR IGNORE INTO events (id, slug, title, description, event_kind, access_tier, status, starts_at, ends_at, location_type, embed_url, booking_url, reminder_enabled, created_at, updated_at) VALUES
  ('event_launch_live', 'founding-members-livestream', 'Founding Members Livestream', 'A members-only update on the platform rollout, current production schedule, and upcoming content drops.', 'livestream', 'all', 'scheduled', 1746057600000, NULL, 'youtube', NULL, NULL, 1, 1743379200000, 1743379200000),
  ('event_vip_calls', 'vip-quarterly-calls', 'Quarterly VIP Calls', 'VIP call scheduling opens inside the platform. Submit your request and the ShivWorks team will confirm a slot.', 'vip_call', 'vip', 'scheduled', NULL, NULL, 'zoom', NULL, NULL, 1, 1743379200000, 1743379200000);

INSERT OR IGNORE INTO external_links (id, link_key, label, url, audience, sort_order, description, cta_text, created_at, updated_at) VALUES
  ('link_book_course', 'book-course', 'Book an In-Person Course', 'https://shivworks.com', 'all', 1, 'Return to the main ShivWorks site to review course dates and register for live training.', 'Book live training', 1743379200000, 1743379200000),
  ('link_shop_products', 'shop-products', 'Shop Products', 'https://shivworkspg.com', 'all', 2, 'Go to ShivWorks Products Group for knives, trainers, and supporting gear.', 'Open product store', 1743379200000, 1743379200000),
  ('link_vip_priority', 'vip-priority', 'VIP Priority Booking', 'https://shivworks.com', 'vip', 3, 'VIP members receive a clear in-product callout for priority booking follow-up.', 'Use VIP priority path', 1743379200000, 1743379200000);
