const C = window.SWCatalog;
const S = window.SWSession;
const root = document.getElementById('adm-root');
const SEC_ICON = {
	lessons: 'i-book',
	classes: 'i-radio',
	groups: 'i-users',
	oneonones: 'i-target'
};

/* ---------------- access gate ---------------- */
function renderGate() {
	root.innerHTML = `
      <div class="panel gate">
        <div class="g-ico"><svg><use href="#i-lock"></use></svg></div>
        <h1>Restricted area</h1>
        <p>The admin console is limited to staff accounts. Sign in with admin credentials to manage content, members, and platform settings.</p>
        <a class="btn btn-primary" href="admin-login.html" style="justify-content:center;">Go to admin sign-in <svg><use href="#i-arrow"></use></svg></a>
      </div>`;
}

/* ---------------- console ---------------- */
let secFilter = 'all';

function renderShell() {
	const me = S.get();
	root.innerHTML = `
      <div class="adm-head">
        <div>
          <p class="eyebrow">Admin console</p>
          <h1>Command &amp; control.</h1>
        </div>
        <span class="adm-badge"><svg><use href="#i-shield"></use></svg> ${me.adminName || 'Administrator'} · Full access</span>
      </div>

      <div class="adm-tabs" id="adm-tabs">
        <button class="adm-tab on" data-tab="overview"><svg><use href="#i-grid"></use></svg> Overview</button>
        <button class="adm-tab" data-tab="content"><svg><use href="#i-layers"></use></svg> Content manager</button>
        <button class="adm-tab" data-tab="documents"><svg><use href="#i-folder"></use></svg> Documents</button>
        <button class="adm-tab" data-tab="members"><svg><use href="#i-users"></use></svg> Members</button>
        <button class="adm-tab" data-tab="support"><svg><use href="#i-help"></use></svg> Support</button>
        <button class="adm-tab" data-tab="roadmap"><svg><use href="#i-map"></use></svg> Feature roadmap</button>
      </div>

      <section class="adm-panel on" data-panel="overview"></section>
      <section class="adm-panel" data-panel="content"></section>
      <section class="adm-panel" data-panel="documents"></section>
      <section class="adm-panel" data-panel="members"></section>
      <section class="adm-panel" data-panel="support"></section>
      <section class="adm-panel" data-panel="roadmap"></section>`;

	document.getElementById('adm-tabs').addEventListener('click', (e) => {
		const t = e.target.closest('.adm-tab');
		if (!t) return;
		document.querySelectorAll('.adm-tab').forEach((x) => x.classList.remove('on'));
		document.querySelectorAll('.adm-panel').forEach((x) => x.classList.remove('on'));
		t.classList.add('on');
		document.querySelector(`.adm-panel[data-panel="${t.dataset.tab}"]`).classList.add('on');
	});

	renderOverview();
	renderContent();
	renderDocuments();
	renderMembers();
	renderSupport();
	renderRoadmap();
	initKebabs();

	// deep-link: #add-<section> opens Content; #documents / #support open their tabs
	var hash = location.hash || '';
	if (/^#documents/.test(hash)) document.querySelector('.adm-tab[data-tab="documents"]').click();
	else if (/^#support/.test(hash)) document.querySelector('.adm-tab[data-tab="support"]').click();
	else if (/^#add-/.test(hash)) document.querySelector('.adm-tab[data-tab="content"]').click();
}

/* ---- overview ---- */
function renderOverview() {
	const counts = C.counts();
	const el = document.querySelector('.adm-panel[data-panel="overview"]');
	const maxc = Math.max(...C.SECTIONS.map((s) => counts[s.key]));
	el.innerHTML = `
      <div class="stat-grid">
        <div class="stat"><div class="sv">1,284</div><div class="sl">Active members</div><div class="sd up">▲ 38 this week</div></div>
        <div class="stat"><div class="sv">${counts.total}</div><div class="sl">Content items</div><div class="sd">across ${C.SECTIONS.length} sections</div></div>
        <div class="stat"><div class="sv">${counts.classes}</div><div class="sl">Live classes</div><div class="sd">${counts.classes ? 'next: Sat 7:00 PM CT' : '—'}</div></div>
        <div class="stat"><div class="sv">94%</div><div class="sl">7-day retention</div><div class="sd up">▲ 2.1 pts</div></div>
      </div>
      <div class="adm-2col">
        <div class="panel" style="padding:1.4rem 1.6rem;">
          <div class="row-header" style="margin-bottom:0.6rem;"><h2 style="font-size:1.05rem;text-transform:uppercase;">Content by section</h2></div>
          ${C.SECTIONS.map(
						(s) => `
            <div class="breakdown-row">
              <div class="br-ico"><svg><use href="#${SEC_ICON[s.key]}"></use></svg></div>
              <div class="br-main"><div class="bn">${s.label}</div><div class="br-bar"><i style="width:${maxc ? (counts[s.key] / maxc) * 100 : 0}%"></i></div></div>
              <div class="br-n">${counts[s.key]}</div>
            </div>`
					).join('')}
        </div>
        <div class="panel" style="padding:1.4rem 1.6rem;">
          <div class="row-header" style="margin-bottom:0.6rem;"><h2 style="font-size:1.05rem;text-transform:uppercase;">Recent activity</h2></div>
          <div id="adm-activity"></div>
        </div>
      </div>`;
	renderActivity();
}
function renderActivity() {
	const host = document.getElementById('adm-activity');
	if (!host) return;
	const custom = C.all()
		.filter((i) => i.custom)
		.slice(-3)
		.reverse();
	const base = [
		{ t: 'New member <b>Sara Kwon</b> upgraded to VIP', m: '12 min ago' },
		{ t: '<b>Office Hours with Craig</b> reached 80 RSVPs', m: '1 hour ago' },
		{ t: '3 after-action reports flagged for review', m: '3 hours ago' }
	];
	const acts = custom
		.map((c) => ({
			t: `Published <b>${c.title}</b> to ${C.section(c.section).label}`,
			m: 'just now'
		}))
		.concat(base);
	host.innerHTML = acts
		.slice(0, 5)
		.map(
			(a) =>
				`<div class="act-row"><span class="act-dot"></span><div><div class="at">${a.t}</div><div class="am">${a.m}</div></div></div>`
		)
		.join('');
}

/* ---- content manager ---- */
function renderContent() {
	const el = document.querySelector('.adm-panel[data-panel="content"]');
	el.innerHTML = `
      <div class="cm-grid">
        <form class="panel cm-form" id="cm-form" style="padding:1.4rem 1.5rem;" data-endpoint="POST /api/admin/content">
          <h2>Add content</h2>
          <p class="fhint">Publish a new course, class, private group, or 1-on-1. It appears in the Library section instantly.</p>
          <div class="fld">
            <label>Section</label>
            <select name="section" id="cm-section">
              ${C.SECTIONS.map((s) => `<option value="${s.key}">${s.label}</option>`).join('')}
            </select>
          </div>
          <div class="fld"><label>Title</label><input name="title" id="cm-title" placeholder="e.g. Vehicle Entanglements" required /></div>
          <div class="fld"><label>Description</label><textarea name="desc" id="cm-desc" placeholder="One or two sentences on what this covers."></textarea></div>
          <div class="fld-2">
            <div class="fld"><label>Status</label>
              <select name="status" id="cm-status">
                <option value="ready">Ready now</option>
                <option value="scheduled">Scheduled</option>
                <option value="roadmap">Coming soon</option>
              </select>
            </div>
            <div class="fld"><label>Access tier</label>
              <select name="tier" id="cm-tier">
                <option value="member">Member</option>
                <option value="free">Free preview</option>
                <option value="vip">VIP</option>
              </select>
            </div>
          </div>
          <div class="fld-2">
            <div class="fld"><label id="cm-count-label">Modules</label><input type="number" name="count" id="cm-count" min="0" value="0" /></div>
            <div class="fld" id="cm-when-wrap" hidden><label>When</label><input name="when" id="cm-when" placeholder="Sat Jun 28 · 7:00 PM CT" /></div>
          </div>
          <button class="btn btn-primary" type="submit"><svg><use href="#i-plus"></use></svg> Publish to Library</button>
          <div class="cm-flash" id="cm-flash"></div>
        </form>

        <div class="cm-tablewrap">
          <div class="cm-tabhead">
            <h2>All content</h2>
            <div class="cm-secfilter" id="cm-secfilter">
              <button class="on" data-sec="all">All</button>
              ${C.SECTIONS.map((s) => `<button data-sec="${s.key}">${s.label}</button>`).join('')}
            </div>
          </div>
          <div style="overflow-x:auto;"><table class="cm"><thead><tr>
            <th>Title</th><th>Section</th><th>Status</th><th class="col-tier">Tier</th><th class="col-count">Size</th><th></th>
          </tr></thead><tbody id="cm-tbody"></tbody></table></div>
        </div>
      </div>`;

	// count label + when visibility follow the section
	const secSel = el.querySelector('#cm-section');
	function syncFields() {
		const sec = C.section(secSel.value);
		el.querySelector('#cm-count-label').textContent =
			sec.unit.charAt(0).toUpperCase() + sec.unit.slice(1);
		el.querySelector('#cm-when-wrap').hidden = secSel.value !== 'classes';
	}
	secSel.addEventListener('change', syncFields);

	// preselect from #add-<section> hash (deep link from Library)
	const m = (location.hash || '').match(/^#add-(\w+)/);
	if (m && C.section(m[1])) secSel.value = m[1];
	syncFields();

	el.querySelector('#cm-form').addEventListener('submit', (e) => {
		e.preventDefault();
		const item = {
			section: secSel.value,
			title: el.querySelector('#cm-title').value.trim() || 'Untitled',
			desc: el.querySelector('#cm-desc').value.trim(),
			status: el.querySelector('#cm-status').value,
			tier: el.querySelector('#cm-tier').value,
			count: parseInt(el.querySelector('#cm-count').value, 10) || 0
		};
		if (secSel.value === 'classes') item.when = el.querySelector('#cm-when').value.trim();
		const created = C.add(item);
		const flash = el.querySelector('#cm-flash');
		flash.textContent =
			'✓ Published “' + created.title + '” to ' + C.section(created.section).label;
		flash.classList.add('show');
		setTimeout(() => flash.classList.remove('show'), 3200);
		e.target.reset();
		syncFields();
	});

	el.querySelector('#cm-secfilter').addEventListener('click', (e) => {
		const b = e.target.closest('button');
		if (!b) return;
		el.querySelectorAll('#cm-secfilter button').forEach((x) => x.classList.remove('on'));
		b.classList.add('on');
		secFilter = b.dataset.sec;
		renderTable();
	});

	renderTable();
}

function renderTable() {
	const tbody = document.getElementById('cm-tbody');
	if (!tbody) return;
	const rows = C.all().filter((i) => secFilter === 'all' || i.section === secFilter);
	tbody.innerHTML = rows
		.map(
			(it) => `
      <tr>
        <td><div class="ct-title">${it.custom ? '<svg style="width:0.85rem;height:0.85rem;color:var(--color-accent)"><use href="#i-check"></use></svg>' : ''}${it.title}</div></td>
        <td><span class="ct-sec">${C.section(it.section).label}</span></td>
        <td><span class="st-pill ${it.status}">${it.status === 'ready' ? 'Ready' : it.status === 'scheduled' ? 'Scheduled' : 'Soon'}</span></td>
        <td class="col-tier" style="text-transform:capitalize;color:var(--color-fg-muted)">${it.tier}</td>
        <td class="col-count" style="font-family:var(--font-mono);font-size:0.78rem;color:var(--color-fg-muted)">${it.count} ${C.section(it.section).unit}</td>
        <td style="text-align:right;">${
					it.custom
						? `<button class="row-del" data-del="${it.id}" title="Remove"><svg><use href="#i-trash"></use></svg></button>`
						: '<span class="row-lock">built-in</span>'
				}</td>
      </tr>`
		)
		.join('');
	tbody.querySelectorAll('[data-del]').forEach((btn) => {
		btn.addEventListener('click', () => {
			C.remove(btn.dataset.del);
		});
	});
}

/* ---- members ---- */
const MEMBERS = [
	{
		name: 'Marcus Reyes',
		email: 'marcus.reyes@email.com',
		tier: 'Bronze',
		rank: 'Trained Practitioner',
		role: 'member'
	},
	{
		name: 'Sara Kwon',
		email: 'sara.kwon@email.com',
		tier: 'VIP',
		rank: 'Trained Practitioner',
		role: 'member'
	},
	{
		name: 'Derek King',
		email: 'derek.k@email.com',
		tier: 'Bronze',
		rank: 'Pressure Tested',
		role: 'staff'
	},
	{
		name: 'Heather Polk',
		email: 'h.polk@email.com',
		tier: 'VIP',
		rank: 'Collective',
		role: 'admin'
	},
	{
		name: 'Cole Barrett',
		email: 'cole.b@email.com',
		tier: 'Bronze',
		rank: 'Practitioner',
		role: 'member'
	},
	{
		name: 'Jenn Lewis',
		email: 'jenn.l@email.com',
		tier: 'Bronze',
		rank: 'Trained Practitioner',
		role: 'member'
	}
];
function renderMembers() {
	const el = document.querySelector('.adm-panel[data-panel="members"]');
	el.innerHTML = `
      <div class="cm-tablewrap">
        <div class="cm-tabhead"><h2>Members · ${MEMBERS.length} shown of 1,284</h2><span class="ct-sec">Manage roles &amp; access</span></div>
        <div style="overflow-x:auto;"><table class="mbr"><thead><tr><th>Member</th><th>Tier</th><th>Rank</th><th>Role</th><th></th></tr></thead>
        <tbody id="mbr-body"></tbody></table></div>
      </div>`;
	drawMembers();
}
function drawMembers() {
	const body = document.getElementById('mbr-body');
	if (!body) return;
	body.innerHTML = MEMBERS.map((m, i) => {
		const ini = m.name
			.split(' ')
			.map((w) => w[0])
			.join('')
			.slice(0, 2)
			.toUpperCase();
		return `<tr>
        <td><div class="mbr-id"><span class="mbr-av">${ini}</span><div><div style="font-weight:600">${m.name}</div><div class="ct-sec" style="text-transform:none">${m.email}</div></div></div></td>
        <td>${m.tier === 'VIP' ? '<span class="role-pill admin">VIP</span>' : '<span class="role-pill">Bronze</span>'}</td>
        <td style="color:var(--color-fg-muted)">${m.rank}</td>
        <td><span class="role-pill ${m.role === 'admin' ? 'admin' : ''}">${m.role}</span></td>
        <td style="text-align:right;">
          <button class="btn btn-secondary" style="padding:0.4rem 0.7rem;font-size:0.7rem;" data-toggle="${i}">${m.role === 'admin' ? 'Revoke admin' : 'Make admin'}</button>
        </td>
      </tr>`;
	}).join('');
	body.querySelectorAll('[data-toggle]').forEach((btn) => {
		btn.addEventListener('click', () => {
			const m = MEMBERS[+btn.dataset.toggle];
			m.role = m.role === 'admin' ? 'member' : 'admin';
			drawMembers();
		});
	});
}

/* ---- roadmap ---- */
function renderRoadmap() {
	const el = document.querySelector('.adm-panel[data-panel="roadmap"]');
	const COLS = [
		{
			k: 'Live now',
			note: 'Shipped in this build',
			items: [
				{
					c: 'live',
					t: 'Content manager',
					d: 'Add / remove courses, classes, private groups, and 1-on-1s — live in the Library.'
				},
				{
					c: 'live',
					t: 'Document library',
					d: 'Upload, store, and share any file straight into the message platform.'
				},
				{
					c: 'live',
					t: 'Platform support',
					d: 'Message the ShivWorks support team and track tickets from the console.'
				},
				{
					c: 'live',
					t: 'Role-gated access',
					d: 'Admin console hidden from members; revealed on admin sign-in.'
				},
				{
					c: 'live',
					t: 'Member role management',
					d: 'Promote or revoke admin rights from the members table.'
				}
			]
		},
		{
			k: 'Next up',
			note: 'Planned, scoped < 1 day each',
			items: [
				{
					c: 'soon',
					t: 'Edit existing content',
					d: 'Inline edit of built-in items, not just add/remove.'
				},
				{
					c: 'soon',
					t: 'Drag-to-reorder',
					d: 'Reorder cards within a section and reorder the sections themselves.'
				},
				{
					c: 'soon',
					t: 'Schedule & publish later',
					d: 'Set a go-live date so content unlocks automatically.'
				},
				{
					c: 'soon',
					t: 'Private group rosters',
					d: 'Add and remove members from invite-only groups.'
				}
			]
		},
		{
			k: 'Exploring',
			note: 'Bigger bets',
			items: [
				{
					c: 'plan',
					t: 'Cohort analytics',
					d: 'Completion, retention, and engagement per course and per cohort.'
				},
				{
					c: 'plan',
					t: '1-on-1 booking calendar',
					d: 'Coach availability and member self-booking with reminders.'
				},
				{ c: 'plan', t: 'Bulk import', d: 'CSV upload to seed many lessons or members at once.' },
				{ c: 'plan', t: 'Audit log', d: 'Full history of every admin action with who and when.' }
			]
		}
	];
	el.innerHTML = `
      <p style="color:var(--color-fg-muted);font-size:0.9rem;line-height:1.6;max-width:70ch;margin-bottom:1.6rem;">The admin surface is built to grow. Here's the planned feature set — what's live in this build, what's queued next, and the bigger bets we're scoping.</p>
      <div class="road-grid">
        ${COLS.map(
					(col) => `
          <div class="road-col">
            <h2>${col.k}</h2><div class="rk">${col.note}</div>
            ${col.items.map((it) => `<div class="road-item"><div class="ri-t">${it.t} <span class="ri-chip ${it.c}">${it.c === 'live' ? 'Live' : it.c === 'soon' ? 'Next' : 'Planned'}</span></div><div class="ri-d">${it.d}</div></div>`).join('')}
          </div>`
				).join('')}
      </div>`;
}

/* ---- documents ---- */
const D = window.SWDocs;
let docFlash = '';
function renderDocuments() {
	const el = document.querySelector('.adm-panel[data-panel="documents"]');
	const docs = D.all();
	const used = docs.reduce((s, d) => s + (d.size || 0), 0);
	el.innerHTML = `
      <div class="stat-grid" style="grid-template-columns:repeat(3,1fr);margin-bottom:1.6rem;">
        <div class="stat"><div class="sv">${docs.length}</div><div class="sl">Documents stored</div></div>
        <div class="stat"><div class="sv">${D.fmtSize(used)}</div><div class="sl">Total size</div></div>
        <div class="stat"><div class="sv">${docs.filter((d) => D.isCustom(d.id)).length}</div><div class="sl">Uploaded by staff</div></div>
      </div>

      <label class="dropzone" id="dropzone" data-endpoint="POST /api/admin/documents">
        <input type="file" id="doc-input" multiple hidden />
        <div class="dz-ico"><svg><use href="#i-upload"></use></svg></div>
        <div class="dz-title">Upload documents</div>
        <div class="dz-sub">Click to browse or drag files here · PDF, DOCX, images. Stored on the platform and ready to send in messages.</div>
        <div class="cm-flash ${docFlash ? 'show' : ''}" id="doc-flash">${docFlash}</div>
      </label>

      <div class="cm-tablewrap" style="margin-top:1.4rem;">
        <div class="cm-tabhead"><h2>Document library</h2><span class="ct-sec">Share any file straight into the message platform</span></div>
        <div style="overflow-x:auto;"><table class="cm"><thead><tr>
          <th>Name</th><th class="col-tier">Type</th><th>Tag</th><th class="col-count">Size</th><th>Added</th><th></th>
        </tr></thead><tbody id="doc-tbody"></tbody></table></div>
      </div>`;

	const dz = el.querySelector('#dropzone');
	const input = el.querySelector('#doc-input');
	input.addEventListener('change', () => handleFiles(input.files));
	['dragenter', 'dragover'].forEach((ev) =>
		dz.addEventListener(ev, (e) => {
			e.preventDefault();
			dz.classList.add('drag');
		})
	);
	['dragleave', 'drop'].forEach((ev) =>
		dz.addEventListener(ev, (e) => {
			e.preventDefault();
			dz.classList.remove('drag');
		})
	);
	dz.addEventListener('drop', (e) => {
		if (e.dataTransfer && e.dataTransfer.files) handleFiles(e.dataTransfer.files);
	});

	drawDocs();
}
async function handleFiles(files) {
	if (!files || !files.length) return;
	let n = 0;
	for (const f of files) {
		await D.addFile(f);
		n++;
	}
	docFlash = '✓ Uploaded ' + n + ' document' + (n > 1 ? 's' : '');
	setTimeout(() => {
		docFlash = '';
		const f = document.getElementById('doc-flash');
		if (f) f.classList.remove('show');
	}, 3200);
}
function drawDocs() {
	const tb = document.getElementById('doc-tbody');
	if (!tb) return;
	tb.innerHTML = D.all()
		.map((d) => {
			const date = new Date(d.addedAt);
			const ds = isNaN(date)
				? '—'
				: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
			return `<tr>
        <td><div class="ct-title"><span class="doc-ext">${D.extOf(d.name)}</span>${d.name}</div></td>
        <td class="col-tier" style="color:var(--color-fg-muted);font-family:var(--font-mono);font-size:0.72rem;">${(d.type || '').split('/').pop() || 'file'}</td>
        <td><span class="ct-sec">${d.tag || 'Upload'}</span></td>
        <td class="col-count" style="font-family:var(--font-mono);font-size:0.78rem;color:var(--color-fg-muted)">${D.fmtSize(d.size)}</td>
        <td style="color:var(--color-fg-faint);font-family:var(--font-mono);font-size:0.72rem;">${ds}</td>
        <td style="text-align:right;">
          <div class="kebab-wrap" style="position:relative;display:inline-block;">
            <button class="kebab" data-tip="Actions" aria-label="Document actions"><svg><use href="#i-dots"></use></svg></button>
            <div class="kebab-menu" hidden style="right:0;top:calc(100% + 6px);">
              <p class="km-label">Send</p>
              <a href="messages.html?doc=${d.id}"><svg><use href="#i-send"></use></svg> Share in messages</a>
              <button data-open="${d.id}"><svg><use href="#i-download"></use></svg> Open / download</button>
              ${D.isCustom(d.id) ? '<div class="km-sep"></div><button class="km-danger" data-deldoc="' + d.id + '"><svg><use href="#i-trash"></use></svg> Remove</button>' : ''}
            </div>
          </div>
        </td>
      </tr>`;
		})
		.join('');
	tb.querySelectorAll('[data-open]').forEach((b) =>
		b.addEventListener('click', () => {
			const d = D.get(b.dataset.open);
			closeKebabs();
			if (d && d.dataUrl) window.open(d.dataUrl, '_blank');
			else {
				docFlash = '“' + d.name + '” is stored as a reference (metadata only).';
				const fl = document.getElementById('doc-flash');
				if (fl) {
					fl.textContent = docFlash;
					fl.classList.add('show');
					setTimeout(() => fl.classList.remove('show'), 3200);
				}
			}
		})
	);
	tb.querySelectorAll('[data-deldoc]').forEach((b) =>
		b.addEventListener('click', () => {
			closeKebabs();
			D.remove(b.dataset.deldoc);
		})
	);
}

/* ---- support ---- */
const SUP_KEY = 'sw-support';
function loadTickets() {
	let t = [];
	try {
		t = JSON.parse(localStorage.getItem(SUP_KEY)) || [];
	} catch (e) {}
	if (!t.length)
		t = [
			{
				subj: 'Live stream latency on mobile',
				cat: 'Bug',
				status: 'open',
				when: '2 days ago',
				body: 'A few members report 20–30s delay on the iOS app during live sessions.'
			},
			{
				subj: 'Request: bulk member CSV import',
				cat: 'Feature',
				status: 'planned',
				when: '1 week ago',
				body: 'Would like to onboard a corporate cohort of 40 at once.'
			}
		];
	return t;
}
function saveTickets(t) {
	try {
		localStorage.setItem(SUP_KEY, JSON.stringify(t));
	} catch (e) {}
}
let tickets = loadTickets();

function renderSupport() {
	const el = document.querySelector('.adm-panel[data-panel="support"]');
	el.innerHTML = `
      <div class="cm-grid">
        <form class="panel cm-form" id="sup-form" style="padding:1.4rem 1.5rem;" data-endpoint="POST /api/admin/support">
          <h2>Contact platform support</h2>
          <p class="fhint">Reach the ShivWorks Network support team directly. We typically respond within one business day.</p>
          <div class="fld"><label>Category</label>
            <select id="sup-cat"><option>Question</option><option>Bug</option><option>Feature request</option><option>Billing</option><option>Urgent / outage</option></select>
          </div>
          <div class="fld"><label>Subject</label><input id="sup-subj" placeholder="Short summary" required /></div>
          <div class="fld"><label>Message</label><textarea id="sup-body" placeholder="Describe what you need. Include steps or links if it's a bug." style="min-height:120px;"></textarea></div>
          <div class="fld"><label>Attach a document (optional)</label>
            <select id="sup-doc"><option value="">— None —</option>${D.all()
							.map((d) => `<option value="${d.id}">${d.name}</option>`)
							.join('')}</select>
          </div>
          <button class="btn btn-primary" type="submit"><svg><use href="#i-send"></use></svg> Send to support</button>
          <div class="cm-flash" id="sup-flash"></div>
        </form>

        <div class="cm-tablewrap">
          <div class="cm-tabhead"><h2>Your support tickets</h2><span class="ct-sec">Status updates appear here</span></div>
          <div id="sup-list"></div>
        </div>
      </div>`;

	el.querySelector('#sup-form').addEventListener('submit', (e) => {
		e.preventDefault();
		const subj = el.querySelector('#sup-subj').value.trim() || 'Untitled request';
		const cat = el.querySelector('#sup-cat').value;
		tickets.unshift({
			subj,
			cat,
			status: 'open',
			when: 'just now',
			body: el.querySelector('#sup-body').value.trim()
		});
		saveTickets(tickets);
		const fl = el.querySelector('#sup-flash');
		fl.textContent = '✓ Sent — ticket opened. Support will reply by email.';
		fl.classList.add('show');
		setTimeout(() => fl.classList.remove('show'), 3400);
		e.target.reset();
		drawTickets();
	});
	drawTickets();
}
function drawTickets() {
	const host = document.getElementById('sup-list');
	if (!host) return;
	host.innerHTML = tickets
		.map(
			(t) => `
      <div class="ticket">
        <div class="tk-main">
          <div class="tk-subj">${t.subj}</div>
          <div class="tk-meta">${t.cat} · ${t.when}</div>
          ${t.body ? `<div class="tk-body">${t.body}</div>` : ''}
        </div>
        <span class="tk-status ${t.status}">${t.status}</span>
      </div>`
		)
		.join('');
}

/* ---- kebab menus (shared) ---- */
function closeKebabs() {
	document
		.querySelectorAll('.kebab-menu:not([hidden])')
		.forEach((m) => m.setAttribute('hidden', ''));
}
function initKebabs() {
	document.addEventListener('click', (e) => {
		const btn = e.target.closest('.kebab');
		if (btn) {
			e.stopPropagation();
			const menu = btn.parentNode.querySelector('.kebab-menu');
			const willOpen = menu && menu.hasAttribute('hidden');
			closeKebabs();
			if (willOpen) menu.removeAttribute('hidden');
			return;
		}
		if (!e.target.closest('.kebab-menu')) closeKebabs();
	});
	document.addEventListener('keydown', (e) => {
		if (e.key === 'Escape') closeKebabs();
	});
}

/* ---------------- boot ---------------- */
if (S.isAdmin()) renderShell();
else renderGate();
C.onChange(() => {
	renderActivity();
	renderTable();
});
if (window.SWDocs)
	window.SWDocs.onChange(() => {
		if (S.isAdmin()) {
			drawDocs();
			const el = document.querySelector('.adm-panel[data-panel="documents"]');
			if (el && el.classList.contains('on')) renderDocuments();
		}
	});
