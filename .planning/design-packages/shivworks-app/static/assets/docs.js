/* ============================================================
   THE SHIVWORKS NETWORK — document store
   Admin-uploaded files + platform documents. Persisted to
   localStorage ('sw-docs'). Small files keep an inline data URL
   so they can be opened/sent; large files keep metadata only.
   Used by the Admin console (Documents tab) and Messages (share).
   ============================================================ */
(function () {
	var KEY = 'sw-docs';
	var INLINE_LIMIT = 700 * 1024; // keep data URLs only for files under ~700KB

	var DEFAULTS = [
		{
			id: 'd-curriculum',
			name: 'ShivWorks Curriculum Map.pdf',
			type: 'application/pdf',
			size: 412000,
			tag: 'Reference',
			addedAt: '2026-05-02T10:00:00Z'
		},
		{
			id: 'd-waiver',
			name: 'Liability Waiver & Release.pdf',
			type: 'application/pdf',
			size: 98000,
			tag: 'Forms',
			addedAt: '2026-05-04T10:00:00Z'
		},
		{
			id: 'd-gear',
			name: 'ECQC Gear List.pdf',
			type: 'application/pdf',
			size: 64000,
			tag: 'Reference',
			addedAt: '2026-05-06T10:00:00Z'
		},
		{
			id: 'd-aar',
			name: 'After-Action Report Template.docx',
			type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
			size: 38000,
			tag: 'Templates',
			addedAt: '2026-05-10T10:00:00Z'
		}
	];

	function loadCustom() {
		try {
			return JSON.parse(localStorage.getItem(KEY)) || [];
		} catch (e) {
			return [];
		}
	}
	function saveCustom(a) {
		try {
			localStorage.setItem(KEY, JSON.stringify(a));
		} catch (e) {}
	}

	var custom = loadCustom();
	var listeners = [];
	function emit() {
		listeners.forEach(function (fn) {
			try {
				fn();
			} catch (e) {}
		});
	}

	function fmtSize(b) {
		if (b == null) return '—';
		if (b < 1024) return b + ' B';
		if (b < 1024 * 1024) return (b / 1024).toFixed(0) + ' KB';
		return (b / 1024 / 1024).toFixed(1) + ' MB';
	}
	function extOf(name) {
		var m = /\.([a-z0-9]+)$/i.exec(name || '');
		return m ? m[1].toUpperCase() : 'FILE';
	}

	window.SWDocs = {
		fmtSize: fmtSize,
		extOf: extOf,
		all: function () {
			return DEFAULTS.concat(custom);
		},
		get: function (id) {
			return this.all().find(function (d) {
				return d.id === id;
			});
		},
		isCustom: function (id) {
			return custom.some(function (d) {
				return d.id === id;
			});
		},
		// add already-built metadata (optionally with dataUrl)
		addMeta: function (meta) {
			var d = Object.assign({ tag: 'Upload', addedAt: new Date().toISOString() }, meta);
			d.id = 'u' + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36);
			custom.push(d);
			saveCustom(custom);
			emit();
			return d;
		},
		// add from a File (reads small files as data URL)
		addFile: function (file) {
			var self = this;
			return new Promise(function (resolve) {
				var base = {
					name: file.name,
					type: file.type || 'application/octet-stream',
					size: file.size,
					tag: 'Upload'
				};
				if (file.size <= INLINE_LIMIT && window.FileReader) {
					var fr = new FileReader();
					fr.onload = function () {
						base.dataUrl = fr.result;
						resolve(self.addMeta(base));
					};
					fr.onerror = function () {
						resolve(self.addMeta(base));
					};
					fr.readAsDataURL(file);
				} else {
					resolve(self.addMeta(base));
				}
			});
		},
		remove: function (id) {
			var n = custom.length;
			custom = custom.filter(function (d) {
				return d.id !== id;
			});
			if (custom.length !== n) {
				saveCustom(custom);
				emit();
				return true;
			}
			return false;
		},
		onChange: function (fn) {
			listeners.push(fn);
		}
	};
})();
