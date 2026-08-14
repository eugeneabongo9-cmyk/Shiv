// GET /api/live/:id/chat → items[] { name, role, body }
const CHAT = [
	['Derek K.', 'staff', 'Retention position looks clean from this angle.'],
	['Alice M.', '', 'Do you cant the gun in or out during the entry?'],
	['Nikolaus T.', 'vip', 'This is the exact problem I hit at the roadshow.'],
	['Jenn L.', '', 'Base under load — there it is again.'],
	['Wes A.', '', 'Can you run the entry one more time slow?'],
	['Priya N.', '', 'Note to self: stop reaching with the support hand.'],
	['Chip T.', '', 'The line in the sand point is gold.'],
	['Heather H.', '', 'Watching from the range parking lot 🙌'],
	['Sam R.', '', 'How do you train this without a partner?'],
	['Lena V.', 'vip', 'Replays going in the library after?']
];
document.getElementById('lc-feed').innerHTML = CHAT.map(
	(c) =>
		`<div class="lc-msg"><span class="lc-name ${c[1]}">${c[0]}</span><span class="lc-text">${c[2]}</span></div>`
).join('');
const lf = document.getElementById('lc-feed');
lf.scrollTop = lf.scrollHeight;

// GET /api/live/schedule → items[] { month, day, title, summary, when }
const SCHED = [
	{
		mon: 'JUN',
		day: '14',
		title: 'Office Hours with Craig',
		summary: 'Open Q&A — bring your hardest training questions and we work them live.',
		when: 'Sat · 7:00 PM CT · ~60 min'
	},
	{
		mon: 'JUN',
		day: '21',
		title: 'Edged Weapon Awareness Workshop',
		summary: 'Recognizing and managing edged-weapon threats inside conversational range.',
		when: 'Sat · 6:00 PM CT · ~75 min'
	},
	{
		mon: 'JUN',
		day: '28',
		title: 'AAR Roundtable — Member Submissions',
		summary: 'We pull three member after-action reports and break them down on stream.',
		when: 'Sat · 7:00 PM CT · ~60 min'
	},
	{
		mon: 'JUL',
		day: '05',
		title: 'Live Fire Q&A — Entangled Shooting',
		summary: 'Follow-up session for the new live-fire module. Safety, gear, and reps.',
		when: 'Sat · 6:30 PM CT · ~60 min'
	}
];
document.getElementById('sched-list').innerHTML = SCHED.map(
	(s) => `
    <div class="sched-row">
      <div class="sched-date"><div class="d-mon">${s.mon}</div><div class="d-day">${s.day}</div></div>
      <div class="sched-main">
        <h3>${s.title}</h3>
        <p>${s.summary}</p>
        <span class="sched-when"><svg><use href="#i-clock"></use></svg> ${s.when}</span>
      </div>
      <button class="btn btn-secondary"><svg><use href="#i-bell"></use></svg> Remind me</button>
    </div>`
).join('');

// GET /api/live/replays → items[] { title, label, date, duration }
const REPLAYS = [
	{
		title: 'Verbal Agility Workshop',
		label: 'Replay — Verbal Agility',
		date: 'May 31',
		dur: '58 min'
	},
	{
		title: 'In-Fight Weapon Access',
		label: 'Replay — Weapon Access',
		date: 'May 24',
		dur: '1h 06m'
	},
	{
		title: 'Managing the Approach — Office Hours',
		label: 'Replay — Office Hours',
		date: 'May 17',
		dur: '62 min'
	},
	{
		title: 'Ground Movement Fundamentals',
		label: 'Replay — Ground Movement',
		date: 'May 10',
		dur: '47 min'
	},
	{
		title: 'Criminal Assault Paradigm',
		label: 'Replay — Assault Paradigm',
		date: 'May 03',
		dur: '1h 12m'
	},
	{
		title: 'Office Hours with Craig — April',
		label: 'Replay — Office Hours',
		date: 'Apr 26',
		dur: '64 min'
	}
];
document.getElementById('replay-grid').innerHTML = REPLAYS.map(
	(r) => `
    <a class="panel replay-card" href="#">
      <div class="media-ph"><div class="media-ph-inner"><svg style="width:1.3rem;height:1.3rem;color:var(--color-accent)"><use href="#i-play"></use></svg><span class="media-ph-label">[ ${r.label} ]</span></div></div>
      <div class="replay-body">
        <h3>${r.title}</h3>
        <div class="replay-meta"><span>${r.date}</span><span>${r.dur}</span></div>
      </div>
    </a>`
).join('');
