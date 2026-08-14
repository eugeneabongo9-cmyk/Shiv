/* ============================================================
   THE SHIVWORKS NETWORK — shared content catalog
   One source of truth for everything the Library shows and the
   Admin console manages. Built-in defaults + admin-added items
   persisted to localStorage ('sw-catalog'). Load before the page
   script on library.html and admin.html.
   ============================================================ */
(function () {
	var KEY = 'sw-catalog';

	// section definitions — the four groupings the Library renders
	var SECTIONS = [
		{
			key: 'lessons',
			label: 'Courses & Lessons',
			desc: 'Structured curriculum blocks, released over time.',
			icon: 'i-book',
			unit: 'modules',
			addLabel: 'New course'
		},
		{
			key: 'classes',
			label: 'Live Classes',
			desc: 'Scheduled group sessions taught live.',
			icon: 'i-radio',
			unit: 'seats',
			addLabel: 'New class'
		},
		{
			key: 'groups',
			label: 'Private Groups',
			desc: 'Closed cohorts and invite-only training circles.',
			icon: 'i-users',
			unit: 'members',
			addLabel: 'New group'
		},
		{
			key: 'oneonones',
			label: '1-on-1 Coaching',
			desc: 'Private sessions booked directly with a coach.',
			icon: 'i-target',
			unit: 'min',
			addLabel: 'New 1-on-1'
		}
	];

	// built-in content (ships with the platform; not user-removable)
	var DEFAULTS = [
		// ---- Courses & Lessons ----
		{
			id: 'c01',
			section: 'lessons',
			title: 'Managing Unknown Contacts (MUC)',
			status: 'ready',
			tier: 'member',
			count: 6,
			pct: 45,
			desc: 'Verbal and physical management of pre-assault dynamics before contact goes physical.'
		},
		{
			id: 'c02',
			section: 'lessons',
			title: 'Base & Strategy for Wrestling in a Weapons-Based Environment',
			status: 'roadmap',
			tier: 'member',
			count: 8,
			desc: 'Building a base and a strategy for grappling when weapons are on the table.'
		},
		{
			id: 'c03',
			section: 'lessons',
			title: 'Entangled Shooting — Live Fire Module',
			status: 'ready',
			tier: 'vip',
			count: 5,
			pct: 0,
			desc: 'Live-fire application of shooting from entangled, contact-distance positions.'
		},
		{
			id: 'c04',
			section: 'lessons',
			title: 'Clinch Pick Application',
			status: 'roadmap',
			tier: 'member',
			count: 4,
			desc: 'Access, deployment, and recovery of the Clinch Pick in the entangled clinch.'
		},
		{
			id: 'c05',
			section: 'lessons',
			title: 'Push Dagger Application',
			status: 'roadmap',
			tier: 'member',
			count: 4,
			desc: 'Carry, access, and application principles for the push dagger.'
		},
		{
			id: 'c06',
			section: 'lessons',
			title: 'Foundational Modules — Origin Story + CAP',
			status: 'ready',
			tier: 'free',
			count: 5,
			pct: 100,
			desc: 'Where ShivWorks came from and the Criminal Assault Paradigm that frames it all.'
		},
		{
			id: 'c07',
			section: 'lessons',
			title: 'ShivWorks Core Skills',
			status: 'ready',
			tier: 'member',
			count: 7,
			pct: 100,
			desc: 'The repeatable core skill set that every other block is built on top of.'
		},
		{
			id: 'c08',
			section: 'lessons',
			title: 'Physical Confrontation Confirmed (PCC)',
			status: 'roadmap',
			tier: 'member',
			count: 6,
			desc: 'Decision-making and action once a physical confrontation is confirmed.'
		},
		{
			id: 'c09',
			section: 'lessons',
			title: 'Grounded Strategy for a Weapons-Based Environment',
			status: 'roadmap',
			tier: 'member',
			count: 6,
			desc: 'Fighting from the ground when weapons are present in the fight.'
		},
		{
			id: 'c10',
			section: 'lessons',
			title: 'ShivWorks Edged Weapons Overview',
			status: 'roadmap',
			tier: 'member',
			count: 5,
			desc: 'A structured overview of the edged-weapons material across the curriculum.'
		},
		{
			id: 'c11',
			section: 'lessons',
			title: 'Handgun IFWA, Retention, Recovery & Disarming',
			status: 'roadmap',
			tier: 'vip',
			count: 8,
			desc: 'In-fight weapon access, retention, recovery, and disarming under pressure.'
		},

		// ---- Live Classes ----
		{
			id: 'l01',
			section: 'classes',
			title: 'Office Hours with Craig',
			status: 'scheduled',
			tier: 'member',
			count: 80,
			when: 'Sat Jun 14 · 7:00 PM CT',
			desc: 'Open Q&A — bring your hardest training questions and we work them live.'
		},
		{
			id: 'l02',
			section: 'classes',
			title: 'Edged Weapon Awareness Workshop',
			status: 'scheduled',
			tier: 'member',
			count: 60,
			when: 'Sat Jun 21 · 6:00 PM CT',
			desc: 'Recognizing and managing edged-weapon threats inside conversational range.'
		},
		{
			id: 'l03',
			section: 'classes',
			title: 'Live Fire Q&A — Entangled Shooting',
			status: 'scheduled',
			tier: 'vip',
			count: 40,
			when: 'Sat Jul 5 · 6:30 PM CT',
			desc: 'Follow-up session for the live-fire module. Safety, gear, and reps.'
		},

		// ---- Private Groups ----
		{
			id: 'g01',
			section: 'groups',
			title: 'La Crosse ECQC — June Cohort',
			status: 'ready',
			tier: 'member',
			count: 24,
			desc: 'Pre- and post-weekend coordination for the June La Crosse ECQC class.'
		},
		{
			id: 'g02',
			section: 'groups',
			title: 'Texas Practitioners Circle',
			status: 'ready',
			tier: 'member',
			count: 38,
			desc: 'Regional group for members training across Texas — meetups and partner finding.'
		},
		{
			id: 'g03',
			section: 'groups',
			title: 'VIP Inner Cadre',
			status: 'ready',
			tier: 'vip',
			count: 12,
			desc: 'Quarterly calls and direct access for VIP founding members.'
		},

		// ---- 1-on-1 Coaching ----
		{
			id: 'o01',
			section: 'oneonones',
			title: 'Curriculum Review with Craig',
			status: 'ready',
			tier: 'vip',
			count: 45,
			desc: 'Private video review of your reps and a tailored next-step training plan.'
		},
		{
			id: 'o02',
			section: 'oneonones',
			title: 'AAR Debrief — Staff Coach',
			status: 'ready',
			tier: 'member',
			count: 30,
			desc: 'One-on-one breakdown of a recent after-action report with a staff coach.'
		}
	];

	function loadCustom() {
		try {
			return JSON.parse(localStorage.getItem(KEY)) || [];
		} catch (e) {
			return [];
		}
	}
	function saveCustom(arr) {
		try {
			localStorage.setItem(KEY, JSON.stringify(arr));
		} catch (e) {}
	}

	var custom = loadCustom();
	var listeners = [];
	function emit() {
		listeners.forEach(function (fn) {
			try {
				fn();
			} catch (e) {}
		});
	}

	window.SWCatalog = {
		SECTIONS: SECTIONS,
		section: function (key) {
			return SECTIONS.find(function (s) {
				return s.key === key;
			});
		},
		all: function () {
			return DEFAULTS.concat(custom);
		},
		bySection: function (key) {
			return this.all().filter(function (it) {
				return it.section === key;
			});
		},
		counts: function () {
			var c = {};
			SECTIONS.forEach(function (s) {
				c[s.key] = 0;
			});
			this.all().forEach(function (it) {
				if (it.section in c) c[it.section]++;
			});
			c.total = this.all().length;
			return c;
		},
		add: function (item) {
			var it = Object.assign(
				{
					status: 'ready',
					tier: 'member',
					count: 0,
					desc: '',
					pct: 0
				},
				item
			);
			it.id = 'x' + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36);
			it.custom = true;
			it.createdAt = new Date().toISOString();
			custom.push(it);
			saveCustom(custom);
			emit();
			return it;
		},
		remove: function (id) {
			var n = custom.length;
			custom = custom.filter(function (it) {
				return it.id !== id;
			});
			if (custom.length !== n) {
				saveCustom(custom);
				emit();
				return true;
			}
			return false; // defaults are not removable
		},
		isCustom: function (id) {
			return custom.some(function (it) {
				return it.id === id;
			});
		},
		onChange: function (fn) {
			listeners.push(fn);
		}
	};
})();
