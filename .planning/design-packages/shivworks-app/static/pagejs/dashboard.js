(function () {
	var pre = document.getElementById('swl-preloader');
	var bar = document.getElementById('swl-bar');
	var percent = document.getElementById('swl-percent');
	var spot = document.getElementById('swlSpotlight');
	if (!pre || !bar || !percent) return;

	var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

	var MIN_VISIBLE = 1400; // floor so the loader never flickers
	var start = window.performance && performance.now ? performance.now() : Date.now();
	var now = function () {
		return window.performance && performance.now ? performance.now() : Date.now();
	};

	// --- spotlight scan across the word (rAF, bounces 0..600) ---
	if (spot && !reduced) {
		var cx = 0,
			dir = 1;
		(function scan() {
			cx += 6 * dir;
			if (cx >= 600 || cx <= 0) dir *= -1;
			spot.setAttribute('cx', cx);
			if (!pre.classList.contains('swl-hidden')) requestAnimationFrame(scan);
		})();
	}

	// --- progress: creeps toward 90% while loading, snaps to 100 on ready ---
	// Seed from readyState: the script may run after 'load' has already fired
	// (deferred / late-injected), in which case the listener would never fire.
	var loaded = document.readyState === 'complete' || document.readyState === 'interactive';
	var shown = 0;
	if (!loaded)
		window.addEventListener('load', function () {
			loaded = true;
		});
	setTimeout(function () {
		loaded = true;
	}, 250);

	function paint(v) {
		shown = v;
		bar.style.width = v + '%';
		percent.textContent = Math.floor(v) + '%';
	}

	// Timer-driven (setInterval) rather than requestAnimationFrame: rAF is fully
	// paused while the tab is hidden, which would freeze the loader mid-load.
	// setInterval keeps advancing (throttled) so the loader always completes.
	var timer = setInterval(function () {
		var target = loaded ? 100 : 90;
		// ease toward target so the bar feels organic, never stalls hard at 90
		shown += (target - shown) * 0.12 + (loaded ? 0 : Math.random() * 0.6);
		if (shown > 100) shown = 100;
		paint(shown);

		var elapsed = now() - start;
		if (loaded && shown >= 99.5 && elapsed >= MIN_VISIBLE) {
			clearInterval(timer);
			paint(100);
			finish();
		}
	}, 40);

	function finish() {
		pre.classList.add('swl-hidden');
		var done = function () {
			pre.parentNode && pre.parentNode.removeChild(pre);
		};
		if (reduced) {
			done();
			return;
		}
		pre.addEventListener('transitionend', done, { once: true });
		setTimeout(done, 900); // safety net if transitionend never fires
	}
})();

const ROW = [
	{ n: '01', title: 'Managing Unknown Contacts', tag: 'In progress', pct: 45 },
	{ n: '06', title: 'Foundational Modules', tag: 'Completed', pct: 100 },
	{ n: '07', title: 'ShivWorks Core Skills', tag: 'Completed', pct: 100 },
	{ n: '03', title: 'Entangled Shooting — Live Fire', tag: 'New', pct: 0 }
];
document.getElementById('course-row').innerHTML = ROW.map(
	(c) => `
    <a class="panel course-card" href="course.html">
      <div class="media-ph"><div class="media-ph-inner"><svg style="width:1.3rem;height:1.3rem;color:var(--color-accent)"><use href="#i-play"></use></svg><span class="media-ph-label">[ Course ${c.n} ]</span></div></div>
      <div class="course-card-body">
        <div class="course-card-top"><span class="idx">${c.n}</span>
          ${c.tag === 'Completed' ? '<span class="tag accent">Completed</span>' : c.tag === 'New' ? '<span class="tag brass">New</span>' : '<span class="tag">In progress</span>'}
        </div>
        <h3>${c.title}</h3>
        ${c.pct > 0 ? `<div class="progress-track mini-progress"><div class="progress-fill" style="width:${c.pct}%"></div></div>` : '<span class="ghost-link">Start module <svg><use href="#i-arrow"></use></svg></span>'}
      </div>
    </a>`
).join('');
