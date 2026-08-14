const C = window.SWCatalog;
const isAdmin = !!(window.SWSession && window.SWSession.isAdmin());
const sectionsHost = document.getElementById('lib-sections');
const jumpHost = document.getElementById('lib-jump');
let filter = 'all';

if (isAdmin) document.getElementById('lib-admin-cta').hidden = false;

function tierTag(t) {
	if (t === 'free') return '<span class="tag accent">Free preview</span>';
	if (t === 'vip') return '<span class="tag brass">VIP</span>';
	return '<span class="tag muted">Member</span>';
}
function unitLabel(sec, n) {
	const u = C.section(sec).unit;
	return n + ' ' + u;
}
function matches(it) {
	if (filter === 'all') return true;
	if (filter === 'available') return it.status === 'ready' || it.status === 'scheduled';
	return it.status === 'roadmap';
}
function mediaFor(it) {
	if (it.section === 'lessons') {
		return it.status === 'ready'
			? '<div class="play-badge"><svg><use href="#i-play"></use></svg></div>'
			: '<svg style="width:1.5rem;height:1.5rem;color:var(--color-fg-faint)"><use href="#i-lock"></use></svg>';
	}
	const ico =
		{ classes: 'i-radio', groups: 'i-users', oneonones: 'i-target' }[it.section] || 'i-book';
	const col = it.status === 'roadmap' ? 'var(--color-fg-faint)' : 'var(--color-accent)';
	return (
		'<svg style="width:1.5rem;height:1.5rem;color:' +
		col +
		'"><use href="#' +
		ico +
		'"></use></svg>'
	);
}
function statusChip(it) {
	if (it.status === 'ready') return '<span class="cc-status ready">● Ready now</span>';
	if (it.status === 'scheduled') return '<span class="cc-status scheduled">◴ Scheduled</span>';
	return '<span class="cc-status soon">Coming soon</span>';
}
function cardHTML(it, i) {
	const ready = it.status === 'ready';
	const href = it.section === 'lessons' && ready ? 'course.html' : '#';
	return `<a class="panel course-card ${it.status === 'roadmap' ? 'locked' : ''}" href="${href}">
      ${it.custom ? '<span class="cc-new">NEW</span>' : ''}
      <div class="media-ph">
        <div class="media-ph-inner">
          ${mediaFor(it)}
          <span class="media-ph-label">[ ${C.section(it.section).label} ]</span>
        </div>
      </div>
      <div class="cc-body">
        <div class="cc-top">
          <span class="idx">${String(i + 1).padStart(2, '0')}</span>
          ${statusChip(it)}
        </div>
        <h3>${it.title}</h3>
        <p class="cc-desc">${it.desc || ''}</p>
        ${it.when ? `<span class="cc-when"><svg><use href="#i-calendar"></use></svg> ${it.when}</span>` : ''}
        ${it.pct > 0 ? `<div class="progress-track" style="margin-top:0.2rem;"><div class="progress-fill" style="width:${it.pct}%"></div></div>` : ''}
        <div class="cc-foot">
          ${tierTag(it.tier)}
          <span class="cc-modules">${unitLabel(it.section, it.count)}</span>
        </div>
      </div>
    </a>`;
}

function render() {
	const counts = C.counts();
	// jump rail
	jumpHost.innerHTML = C.SECTIONS.map(
		(s) =>
			`<a href="#sec-${s.key}"><svg><use href="#${s.icon}"></use></svg> ${s.label} <span class="n">${counts[s.key]}</span></a>`
	).join('');

	sectionsHost.innerHTML = C.SECTIONS.map((s) => {
		const items = C.bySection(s.key).filter(matches);
		const cards = items.length
			? items.map(cardHTML).join('')
			: `<div class="lib-empty">No ${s.label.toLowerCase()} match this filter.</div>`;
		const addBtn = isAdmin
			? `<a class="btn btn-secondary lgh-add" href="admin.html#add-${s.key}"><svg><use href="#i-plus"></use></svg> ${s.addLabel}</a>`
			: '';
		return `<section class="lib-group" id="sec-${s.key}">
        <div class="lib-group-head">
          <div class="lgh-left">
            <div class="lgh-icon"><svg><use href="#${s.icon}"></use></svg></div>
            <div class="lgh-titles">
              <h2>${s.label} <span class="count">${counts[s.key]}</span></h2>
              <p>${s.desc}</p>
            </div>
          </div>
          ${addBtn}
        </div>
        <div class="lib-grid">${cards}</div>
      </section>`;
	}).join('');
}

document.querySelectorAll('.filter-chip').forEach((chip) => {
	chip.addEventListener('click', () => {
		document.querySelectorAll('.filter-chip').forEach((c) => c.classList.remove('active'));
		chip.classList.add('active');
		filter = chip.dataset.filter;
		render();
	});
});

C.onChange(render);
render();
