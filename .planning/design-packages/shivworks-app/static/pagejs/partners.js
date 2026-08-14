// GET /api/partners → items[] { name, city, state, rank, vip, online, bg[], alum[], goal }
const BG_LABEL = {
	law_enforcement: 'Law Enforcement',
	military: 'Military',
	medical: 'Medical',
	civilian: 'Civilian'
};
const PARTNERS = [
	{
		name: 'Ray Delgado',
		city: 'Austin',
		state: 'TX',
		rank: 'Pressure Tested',
		online: true,
		bg: ['law_enforcement'],
		alum: ['ecqc', 'muc'],
		goal: 'Looking for weekly entangled-shooting reps. Have mats and a private range.'
	},
	{
		name: 'Sara Kwon',
		city: 'Round Rock',
		state: 'TX',
		rank: 'Trained Practitioner',
		online: true,
		bg: ['medical', 'civilian'],
		alum: ['muc'],
		goal: 'Want a consistent partner for MUC drills before my first ECQC weekend.'
	},
	{
		name: 'Mike Tran',
		city: 'San Antonio',
		state: 'TX',
		rank: 'Pressure Tested',
		vip: true,
		online: false,
		bg: ['military'],
		alum: ['ecqc', 'muc'],
		goal: 'Running a small study group on in-fight weapon access. Room for two more.'
	},
	{
		name: 'Dana Wills',
		city: 'Austin',
		state: 'TX',
		rank: 'Trained Practitioner',
		online: false,
		bg: ['civilian'],
		alum: ['muc'],
		goal: 'New to pressure testing — looking for patient partners to drill the fence.'
	},
	{
		name: 'Cole Barrett',
		city: 'Georgetown',
		state: 'TX',
		rank: 'Practitioner',
		online: true,
		bg: ['law_enforcement'],
		alum: ['muc'],
		goal: 'On-duty LEO. Want reps on managing unknown contacts at conversational range.'
	},
	{
		name: 'Erin Vance',
		city: 'Waco',
		state: 'TX',
		rank: 'Trained Practitioner',
		online: false,
		bg: ['medical'],
		alum: ['ecqc'],
		goal: 'Can host monthly sessions. Focused on verbal agility and de-escalation.'
	},
	{
		name: 'Tomas Ruiz',
		city: 'San Marcos',
		state: 'TX',
		rank: 'Practitioner',
		online: false,
		bg: ['civilian'],
		alum: [],
		goal: 'Just finished Foundational Modules. Need a partner to start MUC together.'
	},
	{
		name: 'Heather Polk',
		city: 'Killeen',
		state: 'TX',
		rank: 'Collective',
		vip: true,
		online: true,
		bg: ['military', 'medical'],
		alum: ['ecqc', 'muc'],
		goal: 'Happy to mentor newer members. Strong on ground movement and base under load.'
	}
];

function initials(n) {
	return n
		.split(' ')
		.map((w) => w[0])
		.join('')
		.slice(0, 2)
		.toUpperCase();
}
const grid = document.getElementById('fp-grid');
const nEl = document.getElementById('fp-n');

function alumTags(a) {
	const t = [];
	if (a.includes('ecqc')) t.push('<span class="tag accent">ECQC</span>');
	if (a.includes('muc')) t.push('<span class="tag accent">MUC</span>');
	return t.join('');
}
function cardHTML(p) {
	const bgTags = p.bg.map((b) => `<span class="tag">${BG_LABEL[b]}</span>`).join('');
	return `<article class="panel pcard">
      <div class="pcard-top">
        <span class="avatar">${initials(p.name)}<span class="pres ${p.online ? 'on' : ''}"></span></span>
        <div class="p-id">
          <div class="p-name">${p.name}${p.vip ? '<span class="vipdot">VIP</span>' : ''}</div>
          <span class="p-loc"><svg><use href="#i-pin"></use></svg> ${p.city}, ${p.state}</span>
          <div class="p-rank">${p.rank}</div>
        </div>
      </div>
      <p class="p-goal">${p.goal}</p>
      <div class="p-tags">${alumTags(p.alum)}${bgTags}</div>
      <div class="p-actions">
        <a class="btn btn-primary" href="messages.html"><svg><use href="#i-message"></use></svg> Message</a>
        <a class="btn btn-secondary" href="profile.html"><svg><use href="#i-user"></use></svg> Profile</a>
      </div>
    </article>`;
}

function activeFacets(facet) {
	return [...document.querySelectorAll(`input[data-facet="${facet}"]:checked`)].map((i) => i.value);
}
function render() {
	const bg = activeFacets('bg'),
		rank = activeFacets('rank'),
		alum = activeFacets('alum');
	const loc = document.getElementById('loc-input').value.trim().toLowerCase();
	let rows = PARTNERS.filter(
		(p) =>
			(!bg.length || bg.some((b) => p.bg.includes(b))) &&
			(!rank.length || rank.includes(p.rank)) &&
			(!alum.length || alum.every((a) => p.alum.includes(a))) &&
			(!loc || `${p.city} ${p.state}`.toLowerCase().includes(loc))
	);
	const sort = document.getElementById('fp-sort').value;
	if (sort === 'rank') {
		const order = {
			Collective: 0,
			'Pressure Tested': 1,
			'Trained Practitioner': 2,
			Practitioner: 3
		};
		rows.sort((a, b) => order[a.rank] - order[b.rank]);
	} else if (sort === 'recent') {
		rows.sort((a, b) => (b.online ? 1 : 0) - (a.online ? 1 : 0));
	}
	nEl.textContent = rows.length;
	grid.innerHTML = rows.length
		? rows.map(cardHTML).join('')
		: '<div class="upd-empty" style="grid-column:1/-1;padding:3rem 1rem;text-align:center;color:var(--color-fg-faint);font-family:var(--font-mono);font-size:0.78rem;letter-spacing:0.08em;">— No members match these filters —</div>';
}
render();

document.querySelectorAll('input[data-facet]').forEach((i) => i.addEventListener('change', render));
document.getElementById('loc-input').addEventListener('input', render);
document.getElementById('fp-sort').addEventListener('change', render);
document.getElementById('fp-clear').addEventListener('click', () => {
	document.querySelectorAll('input[data-facet]').forEach((i) => (i.checked = false));
	document.getElementById('loc-input').value = '';
	render();
});
document.getElementById('fp-toggle').addEventListener('click', () => {
	document.getElementById('fp-filters').classList.toggle('open');
});
