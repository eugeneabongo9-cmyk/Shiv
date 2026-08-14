// data-endpoint: GET /api/updates  → items[] { id, type, badge, title, summary, meta, thumbnailUrl, group }
const ICON = { episode: 'i-play', course: 'i-book', live: 'i-radio' };
const BADGE = {
	episode: '<span class="tag accent">New episode</span>',
	course: '<span class="tag brass">Course live</span>',
	live: '<span class="tag">Livestream</span>'
};
const UPDATES = [
	{
		type: 'live',
		live: true,
		title: 'Live now · Weapon Retention in the Clinch',
		summary:
			'Craig is breaking down retention under entangled pressure. Jump into the stream and bring questions.',
		meta: 'Started 18 min ago · 142 watching',
		cta: 'Join livestream',
		group: 'Today'
	},
	{
		type: 'episode',
		thumb: 'Roadshow Ep. 3 — La Crosse',
		title: 'Roadshow Docu-Series · Episode 3',
		summary:
			'Inside the La Crosse ECQC weekend — pressure testing the clinch under live, resisting opposition.',
		meta: 'Today · 24 min',
		cta: 'Watch episode',
		group: 'Today'
	},
	{
		type: 'course',
		title: 'Entangled Shooting — Live Fire Module',
		summary:
			'The live-fire entangled shooting block just unlocked for all members. Six modules, 1h 48m.',
		meta: '2 days ago',
		cta: 'Open course',
		group: 'This week'
	},
	{
		type: 'episode',
		thumb: 'Roadshow Ep. 2 — Memphis',
		title: 'Roadshow Docu-Series · Episode 2',
		summary: 'Memphis seminar breakdown: in-fight weapon access and the criminal assault paradigm.',
		meta: '3 days ago · 21 min',
		cta: 'Watch episode',
		group: 'This week'
	},
	{
		type: 'live',
		title: 'Scheduled · Office Hours with Craig',
		summary:
			'Bi-monthly live Q&A. Bring your hardest training questions to the session and get them answered live.',
		meta: 'Jun 14, 7:00 PM CT',
		cta: 'Add reminder',
		group: 'This week'
	},
	{
		type: 'course',
		title: 'Managing Unknown Contacts — Refreshed',
		summary:
			'Module 04 (Open-Hand Default & The Fence) re-shot with updated demonstrations and drill footage.',
		meta: '4 days ago',
		cta: 'Open course',
		group: 'This week'
	},
	{
		type: 'episode',
		thumb: 'Drill Library — Vol. 4',
		title: 'Drill Library · Volume 4',
		summary:
			'Eight new solo and partner drills added to the reference library, filmed from three angles.',
		meta: '5 days ago · 16 min',
		cta: 'Watch episode',
		group: 'This week'
	},
	{
		type: 'course',
		title: 'Foundational Modules — Captioned',
		summary:
			'Full closed-captioning rolled out across the Foundational Modules course for all members.',
		meta: 'Last week',
		cta: 'Open course',
		group: 'Earlier'
	},
	{
		type: 'live',
		title: 'Replay · Verbal Agility Workshop',
		summary:
			'Missed the live verbal de-escalation workshop? The full 58-minute replay is now in the library.',
		meta: 'Last week',
		cta: 'Watch replay',
		group: 'Earlier'
	},
	{
		type: 'episode',
		thumb: 'Roadshow Ep. 1 — Dallas',
		title: 'Roadshow Docu-Series · Episode 1',
		summary:
			'The series opener: what ECQC is, who shows up, and why the first rep humbles everyone.',
		meta: 'Last week · 19 min',
		cta: 'Watch episode',
		group: 'Earlier'
	},
	{
		type: 'course',
		title: 'ShivWorks Core Skills — New Capstone',
		summary:
			'A capstone assessment module was added to Core Skills. Pass it to earn the Pressure Tested credit.',
		meta: '2 weeks ago',
		cta: 'Open course',
		group: 'Earlier'
	},
	{
		type: 'episode',
		thumb: 'Gear Talk — Carry Setups',
		title: 'Gear Talk · Carry Setups',
		summary:
			'Staff walk through their everyday carry setups and the reasoning behind each placement choice.',
		meta: '2 weeks ago · 27 min',
		cta: 'Watch episode',
		group: 'Earlier'
	}
];

const GROUPS = ['Today', 'This week', 'Earlier'];
const feed = document.getElementById('upd-feed');

function itemHTML(u) {
	const thumb =
		u.type === 'episode' && u.thumb
			? `<div class="upd-thumb"><div class="media-ph"><div class="media-ph-inner"><div class="play-badge"><svg><use href="#i-play"></use></svg></div><span class="media-ph-label">[ ${u.thumb} ]</span></div></div></div>`
			: '';
	const dot = u.live
		? '<span class="live-dot" style="display:inline-block;width:0.45rem;height:0.45rem;border-radius:999px;background:var(--color-accent);box-shadow:0 0 0 3px rgba(188,19,19,0.2);"></span>'
		: '';
	return `<article class="upd-item" data-type="${u.type}">
      <div class="upd-rail"><div class="upd-icon"><svg><use href="#${ICON[u.type]}"></use></svg></div></div>
      <div class="upd-body">
        <div class="upd-text">
          <div style="display:flex;align-items:center;gap:0.6rem;">${BADGE[u.type]}${dot ? '<span class="upd-time" style="color:var(--color-accent);">Live</span>' + dot : ''}</div>
          <h3>${u.title}</h3>
          <p>${u.summary}</p>
          <div class="upd-meta">
            <span class="upd-time">${u.meta}</span>
            <a class="ghost-link upd-cta" href="#">${u.cta} <svg><use href="#i-arrow"></use></svg></a>
          </div>
        </div>
        ${thumb}
      </div>
    </article>`;
}

function render(filter) {
	let html = '';
	GROUPS.forEach((g) => {
		const items = UPDATES.filter((u) => u.group === g && (filter === 'all' || u.type === filter));
		if (!items.length) return;
		html += `<section class="upd-group"><p class="upd-group-label">${g}</p><div class="upd-list">${items.map(itemHTML).join('')}</div></section>`;
	});
	feed.innerHTML = html || '<div class="upd-empty">— No updates of this type —</div>';
}
render('all');

document.getElementById('upd-tabs').addEventListener('click', (e) => {
	const btn = e.target.closest('.upd-tab');
	if (!btn) return;
	document.querySelectorAll('.upd-tab').forEach((t) => t.classList.remove('active'));
	btn.classList.add('active');
	render(btn.dataset.filter);
});
