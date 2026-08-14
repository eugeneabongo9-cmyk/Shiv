/* ============================================================
   THE SHIVWORKS NETWORK — pageflow
   Smooth page-load animation + efficient navigation:
   • fades/slides content in on load (no FOUC; visible without JS)
   • prefetches internal pages on hover/touch (warms the browser
     cache so the next navigation is instant — fewer cold loads)
   • plays a quick fade-out + top progress bar when leaving
   Respects reduced-motion (both OS and the in-app preference).
   Load in <head> after prefs.js so it can read the motion setting.
   ============================================================ */
(function () {
	var doc = document.documentElement;

	function reduced() {
		if (doc.getAttribute('data-motion') === 'reduced') return true;
		return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	}

	// ---- entrance ----
	// A single class drives a self-completing CSS animation (see shivworks.css).
	// It can NEVER leave content hidden: the animation has a finite duration and
	// ends at opacity:1, with no reveal step to depend on. The class name is
	// intentionally distinct so any stale cached rule can't accidentally match.
	doc.classList.add('pflow');

	// ---- top progress bar ----
	var bar;
	function startBar() {
		if (reduced()) return;
		bar = document.createElement('div');
		bar.className = 'pf-bar';
		document.body.appendChild(bar);
		requestAnimationFrame(function () {
			bar.style.transform = 'scaleX(0.75)';
		});
	}

	// ---- prefetch cache ----
	var seen = {};
	function isInternal(a) {
		if (!a || !a.getAttribute) return false;
		var href = a.getAttribute('href');
		if (!href || href.charAt(0) === '#') return false;
		if (a.target === '_blank' || a.hasAttribute('download')) return false;
		if (a.origin !== location.origin) return false;
		return /\.html(\?|#|$)/.test(href) || /\/$/.test(a.pathname);
	}
	function prefetch(href) {
		if (seen[href]) return;
		seen[href] = 1;
		var l = document.createElement('link');
		l.rel = 'prefetch';
		l.href = href;
		l.as = 'document';
		document.head.appendChild(l);
	}
	function onHover(e) {
		var a = e.target.closest && e.target.closest('a');
		if (isInternal(a)) prefetch(a.href);
	}
	document.addEventListener('mouseover', onHover);
	document.addEventListener('touchstart', onHover, { passive: true });
	// warm the current page's nav targets when the browser goes idle
	if ('requestIdleCallback' in window) {
		requestIdleCallback(function () {
			var links = document.querySelectorAll('.app-sidebar a[href]');
			for (var i = 0; i < links.length && i < 8; i++)
				if (isInternal(links[i])) prefetch(links[i].href);
		});
	}

	// ---- exit transition ----
	document.addEventListener('click', function (e) {
		if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)
			return;
		var a = e.target.closest && e.target.closest('a');
		if (!isInternal(a)) return;
		if (a.getAttribute('href').charAt(0) === '#') return;
		if (reduced()) return; // normal navigation, no animation
		if (!document.querySelector('.sidebar-main')) return; // pages without the app shell navigate normally
		e.preventDefault();
		var url = a.href;
		doc.classList.remove('pflow'); // stop the entrance animation so the exit fade can apply
		doc.classList.add('pflow-leaving');
		startBar();
		setTimeout(function () {
			window.location.href = url;
		}, 230);
	});

	// ---- restore on back/forward (bfcache) ----
	window.addEventListener('pageshow', function (ev) {
		doc.classList.remove('pflow-leaving');
		if (bar && bar.parentNode) bar.parentNode.removeChild(bar);
	});
})();
