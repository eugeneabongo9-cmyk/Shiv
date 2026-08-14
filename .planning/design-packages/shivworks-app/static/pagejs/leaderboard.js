const ROWS = [
	{ name: 'Derek K.', rank: 'Collective', tp: 5240, vip: true },
	{ name: 'Craig Douglas', rank: 'Collective', tp: 4980 },
	{ name: 'Nikolaus T.', rank: 'Collective', tp: 4210, vip: true },
	{ name: 'Chip T.', rank: 'Pressure Tested', tp: 3680 },
	{ name: 'Paul F.', rank: 'Pressure Tested', tp: 3120 },
	{ name: 'Heather H.', rank: 'Pressure Tested', tp: 2740 },
	{ name: 'Sam R.', rank: 'Pressure Tested', tp: 2380 },
	{ name: 'Lena V.', rank: 'Pressure Tested', tp: 1990, vip: true },
	{ name: 'Tomas G.', rank: 'Pressure Tested', tp: 1610 },
	{ name: 'Priya N.', rank: 'Trained Practitioner', tp: 1340 },
	{ name: 'Wes A.', rank: 'Trained Practitioner', tp: 1120 },
	{ name: 'Jenn L.', rank: 'Trained Practitioner', tp: 980 },
	{ name: 'Owen B.', rank: 'Trained Practitioner', tp: 840 },
	{ name: 'Marcus R.', rank: 'Trained Practitioner', tp: 720, you: true },
	{ name: 'Alice M.', rank: 'Practitioner', tp: 460 }
];
function initials(n) {
	return n
		.split(' ')
		.map((w) => w[0])
		.join('')
		.slice(0, 2)
		.toUpperCase();
}
document.getElementById('board-body').innerHTML = ROWS.map((r, i) => {
	const pos = i + 1;
	const cls = [
		'member-row',
		r.you ? 'viewer' : '',
		pos === 1 ? 'gold' : pos <= 3 ? 'top' : ''
	].join(' ');
	return `<tr class="${cls}">
      <td class="pos"><span class="n">${String(pos).padStart(2, '0')}</span></td>
      <td><div class="who">
        <span class="avatar">${initials(r.name)}</span>
        <span class="name">${r.name}${r.vip ? '<span class="vipdot">VIP</span>' : ''}${r.you ? '<span class="you-tag">You</span>' : ''}</span>
      </div></td>
      <td class="rank-cell">${r.rank}</td>
      <td class="tp-cell">${r.tp.toLocaleString()}</td>
    </tr>`;
}).join('');
