// ---- live preference controls, bound to window.SWPrefs (assets/prefs.js) ----
const P = window.SWPrefs;

function syncUI() {
	const p = P.get();
	// segmented controls
	document.querySelectorAll('.seg[data-pref]').forEach((seg) => {
		const key = seg.dataset.pref;
		const val = String(p[key]);
		seg.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.val === val));
	});
	// swatches
	document.querySelectorAll('.swatches[data-pref]').forEach((sw) => {
		const key = sw.dataset.pref;
		sw.querySelectorAll('.swatch:not(.swatch-custom)').forEach((b) =>
			b.classList.toggle('on', b.dataset.val === p[key])
		);
	});
	syncAccent(p);
	// checkboxes
	document.querySelectorAll('input[data-pref]').forEach((cb) => {
		const key = cb.dataset.pref;
		if (cb.dataset.on) cb.checked = p[key] === cb.dataset.on;
		else cb.checked = !!p[key];
	});
}

// ---- accent: presets + custom hex / color wheel ----
const PRESETS = P.PRESET_ACCENTS || ['crimson', 'rust', 'steel', 'hunter'];
const customSwatch = document.getElementById('accent-custom');
const wheel = document.getElementById('accent-wheel');
const hexInput = document.getElementById('accent-hex');
const hexWrap = document.getElementById('accent-hex-wrap');

function currentAccentHex() {
	const c = getComputedStyle(document.documentElement).getPropertyValue('--color-accent').trim();
	if (c.charAt(0) === '#') return P.normHex(c) || '#bc1313';
	const m = c.match(/\d+/g);
	if (m && m.length >= 3)
		return (
			'#' +
			m
				.slice(0, 3)
				.map((n) => ('0' + parseInt(n, 10).toString(16)).slice(-2))
				.join('')
		);
	return '#bc1313';
}
function syncAccent(p) {
	const isCustom = PRESETS.indexOf(p.accent) === -1;
	customSwatch.classList.toggle('on', isCustom);
	const hex = isCustom ? P.normHex(p.accent) || '#bc1313' : currentAccentHex();
	customSwatch.style.setProperty('--cs-color', hex);
	wheel.value = hex;
	if (document.activeElement !== hexInput) hexInput.value = hex.replace('#', '').toUpperCase();
	hexWrap.classList.remove('bad');
}
wheel.addEventListener('input', () => {
	P.set({ accent: wheel.value });
	syncUI();
});
hexInput.addEventListener('input', () => {
	const norm = P.normHex(hexInput.value);
	if (norm) {
		hexWrap.classList.remove('bad');
		customSwatch.style.setProperty('--cs-color', norm);
		customSwatch.classList.add('on');
		wheel.value = norm;
		P.set({ accent: norm });
	} else {
		hexWrap.classList.add('bad');
	}
});
hexInput.addEventListener('blur', () => syncUI());

// segmented + swatch clicks
document.querySelectorAll('.seg[data-pref], .swatches[data-pref]').forEach((group) => {
	group.addEventListener('click', (e) => {
		const btn = e.target.closest('button');
		if (!btn) return;
		const key = group.dataset.pref;
		let val = btn.dataset.val;
		if (group.dataset.numeric) val = parseInt(val, 10);
		P.set({ [key]: val });
		syncUI();
	});
});

// checkbox toggles
document.querySelectorAll('input[data-pref]').forEach((cb) => {
	cb.addEventListener('change', () => {
		const key = cb.dataset.pref;
		const val = cb.dataset.on ? (cb.checked ? cb.dataset.on : cb.dataset.off) : cb.checked;
		P.set({ [key]: val });
	});
});

// reset
document.getElementById('reset-prefs').addEventListener('click', () => {
	P.reset();
	syncUI();
});

// keep UI honest if another tab/page changes prefs
P.onChange(syncUI);
syncUI();

// section-nav active state on click
const links = document.querySelectorAll('.set-nav a');
links.forEach((a) =>
	a.addEventListener('click', () => {
		links.forEach((l) => l.classList.remove('active'));
		a.classList.add('active');
	})
);

// admin access row reflects current session role
(function () {
	const S = window.SWSession;
	if (!S) return;
	const desc = document.getElementById('admin-access-desc');
	const btn = document.getElementById('admin-access-btn');
	function sync() {
		if (S.isAdmin()) {
			const me = S.get();
			desc.innerHTML =
				'Signed in as <strong style="color:var(--color-accent)">' +
				(me.adminName || 'Administrator') +
				'</strong> · full access';
			btn.textContent = 'Open console';
			btn.setAttribute('href', 'admin.html');
			if (!document.getElementById('admin-signout')) {
				const out = document.createElement('button');
				out.id = 'admin-signout';
				out.className = 'btn btn-secondary';
				out.type = 'button';
				out.style.marginLeft = '0.5rem';
				out.textContent = 'Sign out of admin';
				out.addEventListener('click', () => {
					S.signOutAdmin();
					sync();
				});
				btn.after(out);
			}
		} else {
			desc.textContent =
				'Staff-only. Sign in with admin credentials to manage content and members.';
			btn.textContent = 'Admin sign-in';
			btn.setAttribute('href', 'admin-login.html');
			const out = document.getElementById('admin-signout');
			if (out) out.remove();
		}
	}
	sync();
})();
