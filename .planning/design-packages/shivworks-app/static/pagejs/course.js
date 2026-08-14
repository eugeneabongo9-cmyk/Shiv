const MODULES = [
	{ t: 'Origin & The Criminal Assault Paradigm', dur: '11:20', state: 'done' },
	{ t: 'Reading Pre-Assault Indicators', dur: '13:05', state: 'done' },
	{ t: 'Verbal Agility & Boundary Setting', dur: '14:48', state: 'done' },
	{ t: 'Open-Hand Default & The Fence', dur: '15:02', state: 'current' },
	{ t: 'Managing Multiple Unknown Contacts', dur: '10:55', state: 'locked' },
	{ t: 'Scenario Integration & Drills', dur: '07:30', state: 'locked' }
];
document.getElementById('module-list').innerHTML = MODULES.map((m, i) => {
	const idx = String(i + 1).padStart(2, '0');
	const stateEl =
		m.state === 'done'
			? '<span class="mi-state done"><svg><use href="#i-check"></use></svg></span>'
			: m.state === 'current'
				? '<span class="mi-state current"><svg><use href="#i-dot"></use></svg></span>'
				: '<span class="mi-state locked"><svg><use href="#i-lock"></use></svg></span>';
	return `<li class="module-item ${m.state === 'current' ? 'current' : ''}">
      ${stateEl}
      <div class="mi-body">
        <p class="mi-title">${m.t}</p>
        <p class="mi-meta">Module ${idx} · ${m.dur}${m.state === 'current' ? ' · Now playing' : m.state === 'done' ? ' · Completed' : ''}</p>
      </div>
    </li>`;
}).join('');
