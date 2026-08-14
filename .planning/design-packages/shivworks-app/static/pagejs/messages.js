// GET /api/messages/threads → items[] { id, name, rank, online, unread, time, preview, messages[] }
const THREADS = [
	{
		id: 'support',
		name: 'ShivWorks Support',
		rank: 'Platform Team',
		staff: true,
		online: true,
		unread: 0,
		time: 'Mon',
		preview: 'Reach us here anytime — gear, billing, or training.',
		msgs: [
			['day', 'This week'],
			[
				'them',
				'Welcome to the Network. The support team is reachable right here — gear, billing, access, or training questions.',
				'Mon 9:00 AM'
			]
		]
	},
	{
		id: 'craig',
		name: 'Craig Douglas',
		rank: 'Staff',
		online: true,
		unread: 2,
		time: '9:48 AM',
		preview: 'Keep the loop simple and repeatable — the posture is the point.',
		msgs: [
			['day', 'Today'],
			['them', 'Marcus — good rep in #ecqc this morning. Saw your AAR.', '9:31 AM'],
			['me', 'Appreciate it. The fence finally held once I stopped reaching.', '9:34 AM'],
			[
				'them',
				"That's the whole game. Elbows in, weight forward, line in the sand behind the verbal.",
				'9:36 AM'
			],
			[
				'me',
				'Question on the verbal — same loop phrase the whole time, or switch it up?',
				'9:45 AM'
			],
			[
				'them',
				"Keep the loop simple and repeatable. The phrase isn't the point — the posture is.",
				'9:48 AM'
			]
		]
	},
	{
		id: 'derek',
		name: 'Derek K.',
		rank: 'Pressure Tested',
		online: true,
		unread: 0,
		time: 'Yesterday',
		preview: 'You: See you at the La Crosse weekend then.',
		msgs: [
			['day', 'Yesterday'],
			['them', 'You signed up for La Crosse yet? Spots are going fast.', '4:12 PM'],
			['me', 'Locked in this morning. First ECQC weekend.', '4:20 PM'],
			['them', "You'll get humbled rep one. Everybody does. It's the point.", '4:22 PM'],
			['me', 'See you at the La Crosse weekend then.', '4:25 PM']
		]
	},
	{
		id: 'jenn',
		name: 'Jenn L.',
		rank: 'Trained Practitioner',
		online: false,
		unread: 0,
		time: 'Tue',
		preview: 'Posting my AAR in the reports channel now.',
		msgs: [
			['day', 'Tuesday'],
			['them', 'Did you catch the base-under-load drill from Module 04?', '11:02 AM'],
			['me', 'Running it tonight. That one looks brutal.', '11:30 AM'],
			['them', 'Posting my AAR in the reports channel now.', '12:14 PM']
		]
	},
	{
		id: 'nik',
		name: 'Nikolaus T.',
		rank: 'Collective',
		vip: true,
		online: false,
		unread: 0,
		time: 'Mon',
		preview: 'Do the MUC fundamentals before the entangled block.',
		msgs: [
			['day', 'Monday'],
			['them', "Friendly advice — don't skip the order on the curriculum.", '8:40 AM'],
			[
				'them',
				'Do the MUC fundamentals before the entangled block. It clicks way faster.',
				'8:41 AM'
			],
			['me', 'Noted. Already halfway through MUC, so good timing.', '9:05 AM']
		]
	},
	{
		id: 'alice',
		name: 'Alice M.',
		rank: 'Practitioner',
		online: false,
		unread: 0,
		time: 'Sun',
		preview: 'Thanks for the drill breakdown!',
		msgs: [
			['day', 'Sunday'],
			['them', 'Thanks for the drill breakdown! Made the open-hand default make sense.', '2:18 PM'],
			['me', 'Anytime. Reps over everything.', '2:40 PM']
		]
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
const listEl = document.getElementById('thread-list');
const feedEl = document.getElementById('convo-feed');
const threadsPane = document.getElementById('threads-pane');
const convoPane = document.getElementById('convo-pane');

function renderList(activeId) {
	listEl.innerHTML = THREADS.map(
		(t) => `
      <div class="thread ${t.id === activeId ? 'active' : ''} ${t.unread ? 'unread' : ''}" data-id="${t.id}">
        <span class="avatar">${initials(t.name)}<span class="pres ${t.online ? 'on' : ''}"></span></span>
        <div class="thread-mid">
          <div class="t-top"><span class="t-name">${t.name}</span><span class="t-time">${t.time}</span></div>
          <div class="t-prev">${t.preview}</div>
        </div>
        ${t.unread ? `<span class="t-badge">${t.unread}</span>` : ''}
      </div>`
	).join('');
}

function renderConvo(t) {
	document.getElementById('c-avatar').textContent = initials(t.name);
	document.getElementById('c-name').textContent = t.name;
	document.getElementById('c-status').innerHTML =
		(t.online
			? '<span class="dot"></span> Online · '
			: '<span class="dot" style="background:var(--color-fg-faint);box-shadow:none;"></span> Offline · ') +
		t.rank;
	document.getElementById('convo-input').placeholder = 'Message ' + t.name.split(' ')[0];
	feedEl.innerHTML = t.msgs
		.map((m) => {
			if (m[0] === 'day') return `<div class="day-sep">${m[1]}</div>`;
			const time = `<div class="bubble-time" style="text-align:${m[0] === 'me' ? 'right' : 'left'}">${m[2]}</div>`;
			if (m[3]) {
				const d = window.SWDocs && window.SWDocs.get(m[3]);
				return `<div class="bubble-row ${m[0]}">${docChip(d)}</div>${time}`;
			}
			return `<div class="bubble-row ${m[0]}"><div class="bubble">${m[1]}</div></div>${time}`;
		})
		.join('');
	feedEl.scrollTop = feedEl.scrollHeight;
}

let current = THREADS[0];
renderList(current.id);
renderConvo(current);

listEl.addEventListener('click', (e) => {
	const row = e.target.closest('.thread');
	if (!row) return;
	current = THREADS.find((t) => t.id === row.dataset.id);
	current.unread = 0;
	renderList(current.id);
	renderConvo(current);
	threadsPane.classList.add('hidden-mobile');
	convoPane.classList.add('show-mobile');
});

document.getElementById('back-btn').addEventListener('click', () => {
	threadsPane.classList.remove('hidden-mobile');
	convoPane.classList.remove('show-mobile');
});

// composer (local echo)
function send() {
	const input = document.getElementById('convo-input');
	const v = input.value.trim();
	if (!v) return;
	const now = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
	current.msgs.push(['me', v, now]);
	renderConvo(current);
	input.value = '';
}
document.getElementById('convo-send').addEventListener('click', send);
document.getElementById('convo-input').addEventListener('keydown', (e) => {
	if (e.key === 'Enter') send();
});

// ---- document sharing (composer kebab + deep link) ----
const D = window.SWDocs;
function docChip(d) {
	if (!d) return '<div class="bubble">Document unavailable</div>';
	const ext = D.extOf(d.name),
		size = D.fmtSize(d.size);
	const open = d.dataUrl
		? `href="${d.dataUrl}" target="_blank"`
		: 'href="#" onclick="return false"';
	return `<a class="doc-chip" ${open} style="text-decoration:none;color:inherit;"><span class="dc-ico"><svg><use href="#i-file"></use></svg></span><span class="dc-meta"><span class="dc-name">${d.name}</span><span class="dc-sub">${ext} · ${size}</span></span></a>`;
}
function shareDoc(id) {
	const now = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
	current.msgs.push(['me', '', now, id]);
	renderConvo(current);
}
const docKebab = document.getElementById('doc-kebab');
const docMenu = document.getElementById('doc-menu');
function buildDocMenu() {
	const list = document.getElementById('doc-menu-list');
	const docs = D ? D.all() : [];
	list.innerHTML = docs.length
		? docs
				.map(
					(d) =>
						`<button type="button" data-share="${d.id}"><svg><use href="#i-file"></use></svg> ${d.name}</button>`
				)
				.join('')
		: '<div style="padding:0.5rem 0.6rem;color:var(--color-fg-faint);font-size:0.8rem;">No documents yet</div>';
	list.querySelectorAll('[data-share]').forEach((b) =>
		b.addEventListener('click', () => {
			shareDoc(b.dataset.share);
			docMenu.setAttribute('hidden', '');
		})
	);
}
docKebab.addEventListener('click', (e) => {
	e.stopPropagation();
	if (docMenu.hasAttribute('hidden')) {
		buildDocMenu();
		docMenu.removeAttribute('hidden');
	} else docMenu.setAttribute('hidden', '');
});
document.addEventListener('click', (e) => {
	if (!e.target.closest('#doc-menu') && !e.target.closest('#doc-kebab'))
		docMenu.setAttribute('hidden', '');
});
document.addEventListener('keydown', (e) => {
	if (e.key === 'Escape') docMenu.setAttribute('hidden', '');
});

// ?doc=<id> shares a stored document straight into the Support thread
(function () {
	const id = new URLSearchParams(location.search).get('doc');
	if (!id || !D || !D.get(id)) return;
	const sup = THREADS.find((t) => t.id === 'support') || THREADS[0];
	const now = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
	sup.msgs.push(['me', '', now, id]);
	sup.msgs.push([
		'them',
		'Got the file — thanks. The team will take a look and follow up here.',
		now
	]);
	current = sup;
	renderList(current.id);
	renderConvo(current);
})();
