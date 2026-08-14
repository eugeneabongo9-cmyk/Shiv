const MILESTONES = [
	{ d: 'Mar 04, 2026', label: 'Joined the ShivWorks Network', cat: 'Origin', earned: true },
	{ d: 'Mar 09, 2026', label: 'Completed your training profile', cat: 'Profile', earned: true },
	{ d: 'Mar 22, 2026', label: 'First course completed', cat: 'Curriculum', earned: true },
	{ d: 'Apr 15, 2026', label: 'Reached Trained Practitioner', cat: 'Rank', earned: true },
	{ d: '--', label: 'Attend 10 live sessions', cat: 'Live', earned: false },
	{ d: '--', label: 'Reach Pressure Tested', cat: 'Rank', earned: false }
];
document.getElementById('milestones').innerHTML = MILESTONES.map(
	(m) => `
    <li class="${m.earned ? '' : 'locked'}">
      <span class="d">${m.d}</span>
      <span class="lbl">${m.label}</span>
      <span class="cat">${m.cat}</span>
    </li>`
).join('');

const ACTIVITY = [
	{ t: 'today', a: 'Completed a module', p: 15 },
	{ t: 'today', a: 'Replied in a thread', p: 5 },
	{ t: 'yesterday', a: 'Attended a live session', p: 30 },
	{ t: '2d ago', a: 'Submitted an after-action report', p: 20 },
	{ t: '4d ago', a: 'Watched a Roadshow episode', p: 10 },
	{ t: '1w ago', a: '7-day streak bonus', p: 25 }
];
document.getElementById('activity').innerHTML = ACTIVITY.map(
	(e) => `
    <li>
      <span class="d">${e.t}</span>
      <span class="lbl">${e.a}</span>
      <span class="pts">+${e.p} TP</span>
    </li>`
).join('');

if (window.gsap && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
	gsap.from('.ds-tile .v', {
		textContent: 0,
		duration: 0.8,
		ease: 'power1.out',
		snap: { textContent: 1 },
		stagger: 0.06
	});
}
