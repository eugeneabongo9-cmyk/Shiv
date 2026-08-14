/* Shared ShivWorks member-app sidebar — matches repo Sidebar.svelte.
   Usage: <script src="assets/sidebar.js" data-active="dashboard"></script>
   Pages must wrap their content in <div class="sidebar-main">…</div>. */
(function () {
	var active =
		(document.currentScript && document.currentScript.dataset.active) || window.__SW_ACTIVE || '';

	var SPRITE =
		'\
<svg xmlns="http://www.w3.org/2000/svg" style="display:none">\
<symbol id="sb-dashboard" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></symbol>\
<symbol id="sb-library" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></symbol>\
<symbol id="sb-updates" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M7 3v18"/><path d="M3 7.5h4"/><path d="M3 12h18"/><path d="M3 16.5h4"/><path d="M17 3v18"/><path d="M17 7.5h4"/><path d="M17 16.5h4"/></symbol>\
<symbol id="sb-live" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"/><path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5"/><circle cx="12" cy="12" r="2"/><path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5"/><path d="M19.1 4.9C23 8.8 23 15.1 19.1 19"/></symbol>\
<symbol id="sb-community" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></symbol>\
<symbol id="sb-messages" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></symbol>\
<symbol id="sb-leaderboard" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></symbol>\
<symbol id="sb-partners" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="10" cy="7" r="4"/><path d="M10.3 15H7a4 4 0 0 0-4 4v2"/><circle cx="17" cy="17" r="3"/><path d="m21 21-1.9-1.9"/></symbol>\
<symbol id="sb-vip" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></symbol>\
<symbol id="sb-profile" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></symbol>\
<symbol id="sb-training" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></symbol>\
<symbol id="sb-settings" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></symbol>\
<symbol id="sb-shield" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/></symbol>\
<symbol id="sb-admin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/></symbol>\
<symbol id="sb-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></symbol>\
<symbol id="sb-logout" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></symbol>\
<symbol id="sb-more" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></symbol>\
<symbol id="sb-close" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></symbol>\
</svg>';

	var PRIMARY = [
		{ id: 'dashboard', label: 'Dashboard', href: 'dashboard.html', icon: 'sb-dashboard', m: true },
		{ id: 'library', label: 'Library', href: 'library.html', icon: 'sb-library', m: true },
		{ id: 'updates', label: 'Updates', href: 'updates.html', icon: 'sb-updates' },
		{ id: 'live', label: 'Live', href: 'live.html', icon: 'sb-live' },
		{ id: 'community', label: 'Community', href: 'community.html', icon: 'sb-community', m: true },
		{
			id: 'messages',
			label: 'Messages',
			href: 'messages.html',
			icon: 'sb-messages',
			badge: '2',
			m: true
		},
		{ id: 'leaderboard', label: 'Leaderboard', href: 'leaderboard.html', icon: 'sb-leaderboard' },
		{ id: 'partners', label: 'Find Partners', href: 'partners.html', icon: 'sb-partners' }
	];
	var SECONDARY = [
		{ id: 'profile', label: 'Profile', href: 'profile.html', icon: 'sb-profile' },
		{
			id: 'training',
			label: 'Training Profile',
			href: 'training-profile.html',
			icon: 'sb-training'
		},
		{ id: 'settings', label: 'Settings', href: 'settings.html', icon: 'sb-settings' }
	];

	// Admin entry — only present when signed in with admin rights
	var IS_ADMIN = !!(window.SWSession && window.SWSession.isAdmin());
	if (IS_ADMIN) {
		SECONDARY.unshift({
			id: 'admin',
			label: 'Admin Console',
			href: 'admin.html',
			icon: 'sb-admin',
			admin: true
		});
	}

	function navItem(it) {
		var on = it.id === active;
		return (
			'<a href="' +
			it.href +
			'" class="sidebar-nav-item' +
			(on ? ' active' : '') +
			(it.admin ? ' sidebar-nav-item--admin' : '') +
			(it.m ? '' : ' sb-mobile-hide') +
			'" title="' +
			it.label +
			'">' +
			'<svg><use href="#' +
			it.icon +
			'"></use></svg>' +
			'<span class="sidebar-nav-text">' +
			it.label +
			'</span>' +
			(it.badge ? '<span class="sidebar-nav-badge">' + it.badge + '</span>' : '') +
			(on ? '<svg class="sidebar-nav-arrow"><use href="#sb-chevron"></use></svg>' : '') +
			'</a>'
		);
	}

	// rows for the mobile "More" sheet — the destinations that don't fit in the bottom bar
	var OVERFLOW = PRIMARY.filter(function (it) {
		return !it.m;
	});
	function sheetRow(it) {
		var on = it.id === active;
		return (
			'<a href="' +
			it.href +
			'" class="sw-sheet-row' +
			(on ? ' active' : '') +
			'">' +
			'<svg><use href="#' +
			it.icon +
			'"></use></svg>' +
			'<span>' +
			it.label +
			'</span>' +
			(it.badge ? '<span class="sidebar-nav-badge">' + it.badge + '</span>' : '') +
			'</a>'
		);
	}
	var moreBtn =
		'<button type="button" class="sidebar-nav-item sb-more-tab" id="sw-more-btn" aria-label="More" aria-expanded="false">' +
		'<svg><use href="#sb-more"></use></svg>' +
		'<span class="sidebar-nav-text">More</span>' +
		'</button>';
	var sheet =
		'<div class="sw-sheet" id="sw-sheet" hidden>' +
		'<div class="sw-sheet-scrim" data-close></div>' +
		'<div class="sw-sheet-panel" role="dialog" aria-label="More navigation">' +
		'<div class="sw-sheet-grab"></div>' +
		'<div class="sw-sheet-head">' +
		'<div class="uc-avatar">MR</div>' +
		'<div class="sw-sheet-id"><strong>Marcus Reyes</strong><span class="uc-rank">Bronze · Trained Practitioner</span></div>' +
		'<button type="button" class="sw-sheet-close" data-close aria-label="Close"><svg><use href="#sb-close"></use></svg></button>' +
		'</div>' +
		'<p class="sw-sheet-label">Navigation</p>' +
		OVERFLOW.map(sheetRow).join('') +
		'<div class="sw-sheet-progress"><div class="sidebar-progress-pill">' +
		'<span class="sidebar-progress-bar"><span class="sidebar-progress-fill" style="width:27%"></span></span>' +
		'<span class="sidebar-progress-label">3 of 11 modules completed</span>' +
		'</div></div>' +
		'<p class="sw-sheet-label">Account</p>' +
		SECONDARY.map(sheetRow).join('') +
		'<a class="sw-sheet-row sw-sheet-signout" href="index.html"><svg><use href="#sb-logout"></use></svg><span>Sign out</span></a>' +
		'</div>' +
		'</div>';

	var html =
		'<aside class="app-sidebar">' +
		'<div class="sidebar-inner">' +
		'<div class="sidebar-brand">' +
		'<a class="sidebar-logo" href="dashboard.html">' +
		'<span class="brand-mark"><img src="assets/cobra-logo.png" alt="ShivWorks Network" /></span>' +
		'<span class="sidebar-logo-name"><span class="ln1">The ShivWorks</span><span class="ln2"><i>N</i><i>E</i><i>T</i><i>W</i><i>O</i><i>R</i><i>K</i></span></span>' +
		'</a>' +
		'</div>' +
		'<div class="sidebar-identity">' +
		'<div class="user-card" id="sw-user-card" data-endpoint="GET /api/me">' +
		'<div class="uc-avatar">MR</div>' +
		'<div class="uc-content">' +
		'<div class="uc-face uc-identity"><strong>Marcus Reyes</strong><span class="uc-rank">Bronze · Trained Practitioner</span></div>' +
		'<div class="uc-face uc-stats">' +
		'<div class="uc-stat"><b data-to="14">0</b><span>Hrs</span></div>' +
		'<div class="uc-stat"><b data-to="12">0</b><span>Streak</span></div>' +
		'<div class="uc-stat"><b data-to="720">0</b><span>TP</span></div>' +
		'</div>' +
		'</div>' +
		'</div>' +
		'</div>' +
		'<nav class="sidebar-nav" aria-label="Main navigation">' +
		'<p class="sidebar-nav-label">Navigation</p>' +
		PRIMARY.map(navItem).join('') +
		moreBtn +
		'</nav>' +
		'<div class="sidebar-progress-wrap" data-endpoint="GET /api/me/progress/summary">' +
		'<div class="sidebar-progress-pill">' +
		'<span class="sidebar-progress-bar"><span class="sidebar-progress-fill" style="width:27%"></span></span>' +
		'<span class="sidebar-progress-label">3 of 11 modules completed</span>' +
		'</div>' +
		'</div>' +
		'<nav class="sidebar-nav sidebar-nav--secondary" aria-label="Secondary navigation">' +
		SECONDARY.map(navItem).join('') +
		'</nav>' +
		'<div class="sidebar-footer">' +
		'<div class="sidebar-signout"><a class="sidebar-nav-item" href="index.html"><svg><use href="#sb-logout"></use></svg><span class="sidebar-nav-text">Sign out</span></a></div>' +
		'</div>' +
		'</div>' +
		'</aside>';

	document.body.insertAdjacentHTML('afterbegin', SPRITE + html);
	document.body.insertAdjacentHTML('beforeend', sheet);

	// Mobile "More" sheet toggle
	(function initMoreSheet() {
		var btn = document.getElementById('sw-more-btn');
		var sheetEl = document.getElementById('sw-sheet');
		if (!btn || !sheetEl) return;
		function open() {
			sheetEl.hidden = false;
			void sheetEl.offsetWidth; // force reflow so the transform transition runs
			sheetEl.classList.add('open');
			btn.setAttribute('aria-expanded', 'true');
			document.body.style.overflow = 'hidden';
		}
		function close() {
			sheetEl.classList.remove('open');
			btn.setAttribute('aria-expanded', 'false');
			document.body.style.overflow = '';
			setTimeout(function () {
				sheetEl.hidden = true;
			}, 280);
		}
		btn.addEventListener('click', function () {
			sheetEl.classList.contains('open') ? close() : open();
		});
		sheetEl.querySelectorAll('[data-close]').forEach(function (el) {
			el.addEventListener('click', close);
		});
		document.addEventListener('keydown', function (e) {
			if (e.key === 'Escape' && sheetEl.classList.contains('open')) close();
		});
	})();

	// GSAP-driven user card: identity → training stats on hover, with count-up.
	(function initUserCard() {
		var card = document.getElementById('sw-user-card');
		var gsap = window.gsap;
		var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		if (!card || !gsap || reduce) return;
		card.classList.add('js-anim');
		var identity = card.querySelectorAll('.uc-identity > *');
		var stats = card.querySelectorAll('.uc-stats .uc-stat');
		var nums = card.querySelectorAll('.uc-stats b');
		gsap.set('.uc-stats', { opacity: 1 });
		gsap.set(stats, { opacity: 0, y: 10 });
		var tl = gsap.timeline({ paused: true });
		tl.to(identity, { y: -10, opacity: 0, stagger: 0.05, duration: 0.2, ease: 'power2.in' }).to(
			stats,
			{ y: 0, opacity: 1, stagger: 0.07, duration: 0.3, ease: 'power3.out' },
			'-=0.04'
		);
		function countUp() {
			nums.forEach(function (el) {
				var to = parseFloat(el.getAttribute('data-to')) || 0;
				var obj = { v: 0 };
				gsap.to(obj, {
					v: to,
					duration: 0.55,
					ease: 'power1.out',
					onUpdate: function () {
						el.textContent = Math.round(obj.v);
					}
				});
			});
		}
		card.addEventListener('mouseenter', function () {
			tl.play();
			countUp();
		});
		card.addEventListener('mouseleave', function () {
			tl.reverse();
		});
	})();
})();
