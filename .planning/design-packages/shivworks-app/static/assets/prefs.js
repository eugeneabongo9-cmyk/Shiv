/* ============================================================
   THE SHIVWORKS NETWORK — preferences engine
   Reads saved display/accessibility prefs from localStorage and
   applies them to <html> BEFORE first paint (load this in <head>).
   Exposes window.SWPrefs for the settings page to drive live.
   ============================================================ */
(function () {
	var KEY = 'sw-prefs';

	var DEFAULTS = {
		theme: 'dark', // dark | light | system
		accent: 'crimson', // crimson | rust | steel | hunter
		contrast: 'normal', // normal | high
		zoom: 100, // 90 | 100 | 110 | 125
		textSize: 'default', // small | default | large | xlarge
		width: 'standard', // cozy | standard | full
		align: 'center', // center | left
		density: 'comfortable', // comfortable | compact
		motion: 'system', // system | reduced
		underlineLinks: false,
		focusRings: false,
		largeTargets: false
	};

	var FS = { small: '87.5%', default: '100%', large: '112.5%', xlarge: '125%' };
	var WIDTH = { cozy: '960px', standard: '1180px', full: '100%' };
	var PRESET_ACCENTS = ['crimson', 'rust', 'steel', 'hunter'];

	// ---- color helpers for custom hex accents ----
	function normHex(v) {
		if (typeof v !== 'string') return null;
		var h = v.trim().replace(/^#/, '');
		if (/^[0-9a-fA-F]{3}$/.test(h))
			h = h
				.split('')
				.map(function (c) {
					return c + c;
				})
				.join('');
		return /^[0-9a-fA-F]{6}$/.test(h) ? '#' + h.toLowerCase() : null;
	}
	function toRgb(hex) {
		var h = hex.replace('#', '');
		return {
			r: parseInt(h.slice(0, 2), 16),
			g: parseInt(h.slice(2, 4), 16),
			b: parseInt(h.slice(4, 6), 16)
		};
	}
	function rgba(hex, a) {
		var c = toRgb(hex);
		return 'rgba(' + c.r + ', ' + c.g + ', ' + c.b + ', ' + a + ')';
	}
	function shade(hex, amt) {
		// amt<0 darken, >0 lighten
		var c = toRgb(hex);
		function ch(x) {
			return Math.max(0, Math.min(255, Math.round(x + amt * 255)));
		}
		function hx(x) {
			return ('0' + x.toString(16)).slice(-2);
		}
		return '#' + hx(ch(c.r)) + hx(ch(c.g)) + hx(ch(c.b));
	}

	function load() {
		var saved = {};
		try {
			saved = JSON.parse(localStorage.getItem(KEY)) || {};
		} catch (e) {}
		var p = {};
		for (var k in DEFAULTS) p[k] = k in saved ? saved[k] : DEFAULTS[k];
		return p;
	}
	function save(p) {
		try {
			localStorage.setItem(KEY, JSON.stringify(p));
		} catch (e) {}
	}

	var mql = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

	function resolveTheme(theme) {
		if (theme === 'system') return mql && mql.matches ? 'dark' : 'light';
		return theme;
	}

	function apply(p) {
		var el = document.documentElement;
		el.setAttribute('data-theme', resolveTheme(p.theme));
		applyAccent(el, p.accent);
		el.setAttribute('data-contrast', p.contrast);
		el.setAttribute('data-density', p.density);
		el.setAttribute('data-targets', p.largeTargets ? 'large' : 'normal');
		el.setAttribute('data-links', p.underlineLinks ? 'underline' : 'default');
		el.setAttribute('data-focus', p.focusRings ? 'always' : 'auto');

		// motion: reduced when explicitly chosen OR when the OS asks for it
		var prefersReduce =
			window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		el.setAttribute('data-motion', p.motion === 'reduced' || prefersReduce ? 'reduced' : 'system');

		el.style.setProperty('--sw-root-fs', FS[p.textSize] || '100%');
		el.style.setProperty('--sw-content-max', WIDTH[p.width] || '1180px');
		// Left keeps a 1.5rem gutter (== the base container gutter), which is always <=
		// the centered gutter, so "Left" can never visually push content rightward.
		el.style.setProperty('--sw-content-ml', p.align === 'left' ? '1.5rem' : 'auto');
		el.style.zoom = p.zoom && p.zoom !== 100 ? p.zoom / 100 : '';
	}

	// Accent: named preset -> data-attr (styled by prefs.css); any hex -> inline token set.
	function applyAccent(el, accent) {
		var custom = [
			'--color-accent',
			'--color-accent-strong',
			'--color-accent-soft',
			'--color-accent-border',
			'--color-on-accent'
		];
		if (PRESET_ACCENTS.indexOf(accent) !== -1) {
			el.setAttribute('data-accent', accent);
			custom.forEach(function (v) {
				el.style.removeProperty(v);
			});
			return;
		}
		var hex = normHex(accent) || '#bc1313';
		el.setAttribute('data-accent', 'custom');
		el.style.setProperty('--color-accent', hex);
		el.style.setProperty('--color-accent-strong', shade(hex, -0.16));
		el.style.setProperty('--color-accent-soft', rgba(hex, 0.13));
		el.style.setProperty('--color-accent-border', rgba(hex, 0.34));
		// keep text on the accent fill legible: dark text on light accents, white on dark
		var c = toRgb(hex);
		var lum = (0.299 * c.r + 0.587 * c.g + 0.114 * c.b) / 255;
		el.style.setProperty('--color-on-accent', lum > 0.62 ? '#15130a' : '#ffffff');
	}

	var current = load();
	apply(current);

	// react to OS theme changes while on 'system'
	if (mql) {
		var onSys = function () {
			if (current.theme === 'system') apply(current);
		};
		mql.addEventListener ? mql.addEventListener('change', onSys) : mql.addListener(onSys);
	}

	var listeners = [];

	window.SWPrefs = {
		DEFAULTS: DEFAULTS,
		PRESET_ACCENTS: PRESET_ACCENTS,
		normHex: normHex,
		get: function () {
			return Object.assign({}, current);
		},
		set: function (patch) {
			Object.assign(current, patch);
			apply(current);
			save(current);
			listeners.forEach(function (fn) {
				try {
					fn(current);
				} catch (e) {}
			});
			return this.get();
		},
		reset: function () {
			current = Object.assign({}, DEFAULTS);
			apply(current);
			save(current);
			listeners.forEach(function (fn) {
				try {
					fn(current);
				} catch (e) {}
			});
			return this.get();
		},
		onChange: function (fn) {
			listeners.push(fn);
		}
	};
})();
