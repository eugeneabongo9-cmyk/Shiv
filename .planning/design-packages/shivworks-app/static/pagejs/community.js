const AV = ['#bc1313', '#2a2a2a', '#363636', '#222222', '#2e2e2e', '#383838'];
function avatar(initials, i) {
	return `<div class="avatar" style="background:linear-gradient(180deg, ${AV[i % AV.length]}55, ${AV[i % AV.length]}22);color:#fff;">${initials}</div>`;
}

const PIN = `<div class="pinned"><svg><use href="#i-pin"></use></svg><div><p class="pl">Pinned · Brian H. (Staff)</p><p>AAR format reminder: what was the drill, what worked, what broke, and the one thing you'd change. Keep it short. Tag the module.</p></div></div>`;

const MSGS = [
	{
		in: 'DK',
		name: 'Derek K.',
		rank: 'Pressure Tested',
		time: '9:14 AM',
		text: 'Ran the open-hand default drill from MUC Module 04 at training last night. The fence held way better once I stopped reaching and kept my elbows in. Game changer for managing the approach.',
		reacts: [
			['flame', '7', 'hot'],
			['thumb', '12', '']
		]
	},
	{
		in: 'AM',
		name: 'Alice M.',
		rank: 'Practitioner',
		time: '9:31 AM',
		text: "Question on the verbal agility piece — do you keep the same loop phrase the whole time or switch it up if they're not responding?",
		reacts: [['thumb', '4', '']]
	},
	{
		in: 'CD',
		name: 'Craig Douglas',
		rank: 'Staff',
		rankclass: 'admin',
		time: '9:48 AM',
		text: "Keep the loop simple and repeatable. The phrase isn't the point — the posture and the line in the sand behind it is. If they blow through the verbal, you've already bought the time you needed to move.",
		reacts: [
			['flame', '23', 'hot'],
			['thumb', '31', '']
		]
	},
	{
		in: 'NT',
		name: 'Nikolaus T.',
		rank: 'Collective',
		vip: true,
		time: '10:02 AM',
		text: "This is exactly what clicked for me at the La Crosse roadshow. The entangled shooting block makes a lot more sense after you internalize the MUC fundamentals first. Don't skip the order.",
		reacts: [['thumb', '9', '']]
	},
	{
		in: 'JL',
		name: 'Jenn L.',
		rank: 'Trained Practitioner',
		time: '10:20 AM',
		text: "Posting my after-action from this morning's pressure test in #after-action-reports. Short version: base under load is everything.",
		reacts: [['flame', '5', 'hot']]
	}
];

document.getElementById('feed').innerHTML =
	PIN +
	MSGS.map((m, i) => {
		const rc = m.rankclass ? m.rankclass : m.vip ? 'vip' : '';
		return `<div class="msg">
      ${avatar(m.in, i)}
      <div class="msg-body">
        <div class="msg-head">
          <span class="name">${m.name}</span>
          <span class="rank ${rc}">${m.rank}</span>
          <span class="time">${m.time}</span>
        </div>
        <p class="msg-text">${m.text}</p>
        <div class="msg-react">${m.reacts.map((r) => `<span class="react ${r[2]}"><svg style="width:0.7rem;height:0.7rem"><use href="#i-${r[0]}"></use></svg> ${r[1]}</span>`).join('')}</div>
      </div>
    </div>`;
	}).join('');

const ONLINE = [
	['Craig Douglas', 'Staff'],
	['Derek K.', 'Pressure Tested'],
	['Nikolaus T.', 'Collective'],
	['Jenn L.', 'Trained Practitioner'],
	['Alice M.', 'Practitioner'],
	['Marcus R.', 'Trained Practitioner']
];
const OFFLINE = [
	['Chip T.', 'Pressure Tested'],
	['Paul F.', 'Trained Practitioner']
];
const mem = (list, idle) =>
	list
		.map(
			(m) =>
				`<div class="member"><span class="dot ${idle ? 'idle' : ''}"></span><div><div class="m-name">${m[0]}</div><div class="m-rank">${m[1]}</div></div></div>`
		)
		.join('');
document.getElementById('online').innerHTML = mem(ONLINE, false);
document.getElementById('offline').innerHTML = mem(OFFLINE, true);
