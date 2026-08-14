/* ============================================================
   THE SHIVWORKS NETWORK — session / role model
   Tracks the signed-in identity and whether they hold admin
   rights. Persisted to localStorage ('sw-session'). Loaded in
   <head> on every page (before sidebar.js) so the sidebar can
   reveal the Admin entry when appropriate.
   ============================================================ */
(function () {
	var KEY = 'sw-session';

	var DEFAULT = {
		role: 'member', // 'member' | 'admin'
		name: 'Marcus Reyes',
		email: 'marcus.reyes@email.com',
		adminName: '', // display name while in admin console
		adminTitle: 'Platform Administrator'
	};

	function load() {
		var s = {};
		try {
			s = JSON.parse(localStorage.getItem(KEY)) || {};
		} catch (e) {}
		var out = {};
		for (var k in DEFAULT) out[k] = k in s ? s[k] : DEFAULT[k];
		return out;
	}
	function save(s) {
		try {
			localStorage.setItem(KEY, JSON.stringify(s));
		} catch (e) {}
	}

	var current = load();
	var listeners = [];
	function emit() {
		listeners.forEach(function (fn) {
			try {
				fn(current);
			} catch (e) {}
		});
	}

	window.SWSession = {
		get: function () {
			return Object.assign({}, current);
		},
		isAdmin: function () {
			return current.role === 'admin';
		},
		signInAdmin: function (info) {
			current.role = 'admin';
			if (info && info.name) current.adminName = info.name;
			if (info && info.email) current.email = info.email;
			save(current);
			emit();
			return this.get();
		},
		signOutAdmin: function () {
			current.role = 'member';
			save(current);
			emit();
			return this.get();
		},
		onChange: function (fn) {
			listeners.push(fn);
		}
	};
})();
