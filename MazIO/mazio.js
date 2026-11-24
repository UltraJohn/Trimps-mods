// MazIO v1.0.0 — Trimps Steam mod (loaded by mods/mods.js)
//
// Settings > Mods has "MaZ Import/Export: Off/On" in the MazIO box (added by the Nice Mod
// Loader, mods.js; on by default, kept in the save). Off removes the two buttons.
//
// Adds Export and Import buttons to the game's Map at Zone window (hotkey Z, or the Map At Zone
// setting's configure button).
//  * Export shows the MaZ rows of the preset you are looking at (A or B) as a line of text, plus
//    your map presets for this universe, ready to copy. Keep it in a text file, share it, or move
//    it between saves.
//  * Import takes that text and loads the rows into the Map at Zone window. Nothing is kept until
//    you click the game's own "Save and Close", which checks every row as usual; Cancel leaves your
//    rows as they were. Tick "Also import map presets" to replace your map presets as well (that
//    part happens straight away).
// Rows from the other universe are refused, because the map choices differ. Text exported by the
// MazIO browser add-on is read too, as long as it holds a list of rows with a "world" value.
//
// A Steam version of the MazIO browser add-on (Map at Zone Import/Export) by stellar-demesne /
// Quiaaaa, with the same name. None of its code is used; this is a new implementation.
//
// The game files are never changed. One game function is wrapped (the wrapper calls the game's
// original, then adds one step): tooltip, to add the two buttons after the game builds the Map at
// Zone window. Before wrapping it is compared with a fingerprint of the version this mod was made
// for (Trimps 5.10.1). If a Trimps update changed it, the mod stays off and shows a warning (set
// IGNORE_VERSION_CHECK to true below to run it anyway). Other mods may wrap tooltip too (Nice
// Features does); each wrapper keeps the function it wrapped in `__original`, and the check
// follows that chain back to the game's own function.

(function () {
	'use strict';

	// true = run even if a game update changed the wrapped function (at your own risk).
	const IGNORE_VERSION_CHECK = false;

	// Fingerprints of the wrapped game functions (Trimps 5.10.1).
	const FINGERPRINTS = {
		'tooltip': '6a625f44',
	};

	const NAME = 'MazIO';
	const WINDOW = 'Set Map At Zone';
	const PANEL_ID = 'niceMazIoPanel';
	const FORMAT = 'MazIO';
	// The values a MaZ row keeps (from the game's mapAtZone.save).
	const ROW_NUMBERS = ['world', 'through', 'cell', 'preset', 'repeat', 'until', 'exit', 'bwWorld', 'times', 'prio', 'rx', 'tx'];
	const ROW_FLAGS = ['check', 'on'];
	const PRESET_KEYS = ['p1', 'p2', 'p3', 'p4', 'p5'];

	// FNV-1a hash of a function's source (line endings ignored), as 8 hex digits.
	function fingerprint(fn) {
		while (typeof fn === 'function' && typeof fn.__original === 'function') fn = fn.__original; // skip other mods' wrappers
		if (typeof fn !== 'function') return 'missing';
		const text = Function.prototype.toString.call(fn).replace(/\r\n?/g, '\n');
		let h = 0x811c9dc5;
		for (let i = 0; i < text.length; i++) {
			h ^= text.charCodeAt(i);
			h = Math.imul(h, 0x01000193);
		}
		return (h >>> 0).toString(16).padStart(8, '0');
	}

	function current() {
		return { 'tooltip': window.tooltip };
	}

	/* Settings in the game's Settings > Mods tab, kept in the save like the game's own settings.
	   Descriptions: no quotes or apostrophes (they go in a quoted HTML attribute) and no words that
	   match another settings tab's name. */
	const OPTIONS = [
		{
			key: 'nmIO',
			titles: ['MaZ Import/Export: Off', 'MaZ Import/Export: On'],
			fallback: 1,
			description: 'Export and Import buttons in the Map at Zone window, to copy your MaZ rows and map presets as text and load them back (MazIO mod).',
			onToggle: function () { if (!optionOn('nmIO')) closePanel(); },
		},
	];

	function optionOn(key) {
		const item = window.game && game.options.menu[key];
		return item ? item.enabled === 1 : OPTIONS.find(function (o) { return o.key === key; }).fallback === 1;
	}

	/* ------------------------------------------------------------------ data */

	function maz() { return game.options.menu.mapAtZone; }
	function presetLetter() {
		const m = maz();
		return (game.global.universe == 2 ? m.U2Mode : m.U1Mode) === 'b' ? 'B' : 'A';
	}
	function mapPresets() { return game.global.universe == 2 ? game.global.mapPresets2 : game.global.mapPresets; }

	function exportText() {
		const rows = maz().getSetZone().map(function (row) {
			const out = {};
			ROW_NUMBERS.concat(ROW_FLAGS).forEach(function (k) { if (row[k] !== undefined) out[k] = row[k]; });
			return out;
		});
		return JSON.stringify({ format: FORMAT, version: 1, universe: game.global.universe, rows: rows, mapPresets: mapPresets() });
	}

	// Finds the list of rows in any JSON shape: our own, MazIO's, or a bare list.
	function findRows(data) {
		const isRows = function (v) {
			return Array.isArray(v) && v.length > 0 && v.every(function (r) { return r && typeof r === 'object' && 'world' in r; });
		};
		if (isRows(data)) return data;
		if (data && typeof data === 'object') {
			if (isRows(data.rows)) return data.rows;
			for (const k in data) if (isRows(data[k])) return data[k];
		}
		return null;
	}

	function findPresets(data) {
		if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
		const candidates = [data.mapPresets, data.presets, data.mapPresets2];
		for (let i = 0; i < candidates.length; i++) {
			const p = candidates[i];
			if (p && typeof p === 'object' && PRESET_KEYS.some(function (k) { return p[k] && typeof p[k] === 'object'; })) return p;
		}
		return null;
	}

	// Keeps only the values a row can hold, with the right types. The game's Save checks the ranges.
	function cleanRow(row) {
		const out = {};
		ROW_NUMBERS.forEach(function (k) {
			if (row[k] === undefined || row[k] === null || row[k] === '') return;
			const n = Number(row[k]);
			if (isFinite(n)) out[k] = Math.round(n);
		});
		ROW_FLAGS.forEach(function (k) {
			if (row[k] !== undefined) out[k] = row[k] === true || row[k] === 'true' || row[k] === 1;
		});
		return out;
	}

	// Copies only the preset values the game already has, with the same types.
	function applyPresets(source) {
		const target = mapPresets();
		let count = 0;
		PRESET_KEYS.forEach(function (p) {
			const from = source[p], to = target[p];
			if (!from || typeof from !== 'object' || !to) return;
			let changed = false;
			Object.keys(to).forEach(function (k) {
				if (from[k] !== undefined && typeof from[k] === typeof to[k]) { to[k] = from[k]; changed = true; }
			});
			if (changed) count++;
		});
		return count;
	}

	// Shows the rows in the Map at Zone window without keeping them: the window is built from the
	// stored rows, so they are swapped in just while the game builds it.
	function loadIntoWindow(rows) {
		const m = maz();
		const kept = m.getSetZone();
		m.storeSetting(rows);
		try {
			cancelTooltip(true);
			tooltip(WINDOW, null, 'update');
		} finally {
			m.storeSetting(kept);
		}
	}

	function doImport(text, withPresets) {
		let data;
		try { data = JSON.parse(String(text).trim()); }
		catch (e) { return { error: 'That is not valid export text (it should start with { or [).' }; }
		const rows = findRows(data);
		if (!rows) return { error: 'No Map at Zone rows found in that text.' };
		if (data && typeof data.universe === 'number' && data.universe != game.global.universe) {
			return { error: 'Those rows are from Universe ' + data.universe + '. Switch to that universe to import them.' };
		}
		const max = maz().getMaxSettings();
		const clean = rows.map(cleanRow).filter(function (r) { return typeof r.world === 'number'; });
		if (!clean.length) return { error: 'None of the rows has a Start Zone.' };
		const dropped = Math.max(0, clean.length - max);
		const use = clean.slice(0, max);
		let presetCount = 0;
		if (withPresets) {
			const presets = findPresets(data);
			if (!presets) return { error: 'That text has no map presets. Untick the presets box to import only the rows.' };
			presetCount = applyPresets(presets);
		}
		loadIntoWindow(use);
		return { rows: use.length, dropped: dropped, presets: presetCount, max: max };
	}

	/* ------------------------------------------------------------------ panel */

	function closePanel() {
		const p = document.getElementById(PANEL_ID);
		if (p) p.remove();
	}

	function button(text, cls, onclick) {
		const b = document.createElement('span');
		b.className = 'btn btn-md ' + cls;
		b.setAttribute('role', 'button');
		b.tabIndex = 0;
		b.textContent = text;
		b.style.marginRight = '0.4em';
		b.onclick = onclick;
		b.onkeydown = function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onclick(); } };
		return b;
	}

	// The game reads hotkeys from the whole page (Z saves the window, Esc cancels); keep keys typed
	// in the panel to the panel.
	function keepKeys(el) {
		['keydown', 'keyup', 'keypress'].forEach(function (type) {
			el.addEventListener(type, function (e) {
				if (type === 'keydown' && e.key === 'Escape') closePanel();
				e.stopPropagation();
			});
		});
	}

	function openPanel(mode) {
		closePanel();
		const panel = document.createElement('div');
		panel.id = PANEL_ID;
		panel.setAttribute('role', 'dialog');
		panel.setAttribute('aria-label', mode === 'export' ? 'Export Map at Zone' : 'Import Map at Zone');
		panel.style.cssText = 'position:fixed;top:12%;left:50%;transform:translateX(-50%);z-index:100001;width:min(40em,90vw);'
			+ 'padding:0.8em 1em;background:#111;color:#ddd;border:2px solid #555;border-radius:4px;box-shadow:0 0 1em #000;font-size:0.9em;';
		const title = document.createElement('div');
		title.style.cssText = 'font-weight:bold;font-size:1.1em;margin-bottom:0.4em;';
		const note = document.createElement('div');
		note.style.cssText = 'margin-bottom:0.5em;';
		const area = document.createElement('textarea');
		area.style.cssText = 'width:100%;height:9em;font-family:monospace;font-size:0.85em;color:#000;background:#eee;resize:vertical;';
		area.spellcheck = false;
		const status = document.createElement('div');
		status.setAttribute('aria-live', 'polite');
		status.style.cssText = 'min-height:1.3em;margin:0.4em 0;';
		const buttons = document.createElement('div');
		panel.append(title, note, area, status, buttons);
		keepKeys(panel);

		if (mode === 'export') {
			title.textContent = 'Export Map at Zone (preset ' + presetLetter() + ', Universe ' + game.global.universe + ')';
			note.textContent = 'Your saved Map at Zone rows and map presets. Changes in the window that you have not saved yet are not included.';
			area.value = exportText();
			area.readOnly = true;
			buttons.append(
				button('Copy', 'btn-success', function () {
					area.focus();
					area.select();
					let ok = false;
					try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
					status.textContent = ok ? 'Copied.' : 'Select the text and press Ctrl+C to copy it.';
				}),
				button('Close', 'btn-info', closePanel)
			);
		}
		else {
			title.textContent = 'Import Map at Zone (preset ' + presetLetter() + ', Universe ' + game.global.universe + ')';
			note.textContent = 'Paste exported text. The rows load into the Map at Zone window; click Save and Close there to keep them, or Cancel to keep your old ones.';
			const label = document.createElement('label');
			label.style.cssText = 'display:block;margin-top:0.4em;cursor:pointer;';
			const check = document.createElement('input');
			check.type = 'checkbox';
			check.style.marginRight = '0.4em';
			label.append(check, document.createTextNode('Also import map presets (replaces your current ones straight away)'));
			panel.insertBefore(label, status);
			buttons.append(
				button('Load rows', 'btn-success', function () {
					let result;
					try { result = doImport(area.value, check.checked); }
					catch (e) { console.error('[' + NAME + ']', e); result = { error: 'Import failed: ' + e.message }; }
					if (result.error) { status.textContent = result.error; status.style.color = '#fca5a5'; return; }
					closePanel();
					const parts = ['Loaded ' + result.rows + ' row' + (result.rows === 1 ? '' : 's') + ' into the window.'];
					if (result.dropped) parts.push(result.dropped + ' more did not fit (you can have ' + result.max + ').');
					if (result.presets) parts.push(result.presets + ' map preset' + (result.presets === 1 ? '' : 's') + ' replaced.');
					parts.push('Click Save and Close to keep the rows.');
					const err = document.getElementById('mazError');
					if (err) err.innerHTML = '<span style="color:#86efac">' + parts.join(' ') + '</span>';
				}),
				button('Close', 'btn-danger', closePanel)
			);
		}
		document.body.appendChild(panel);
		area.focus();
		if (mode === 'export') area.select();
	}

	/* ------------------------------------------------------------------ hook */

	function addButtons() {
		const tip = document.getElementById('tooltipDiv');
		const row = tip && tip.querySelector('#tipCost .maxCenter');
		if (!row || document.getElementById('niceMazIoExport')) return;
		const exp = button('Export', 'btn-primary', function () { openPanel('export'); });
		exp.id = 'niceMazIoExport';
		const imp = button('Import', 'btn-primary', function () { openPanel('import'); });
		imp.id = 'niceMazIoImport';
		exp.style.marginLeft = '0.4em';
		row.append(exp, imp);
	}

	function wrapTooltip() {
		const original = window.tooltip;
		window.tooltip = function (what) {
			const result = original.apply(this, arguments);
			if (what === WINDOW) {
				try { if (optionOn('nmIO')) addButtons(); } catch (e) { console.error('[' + NAME + ']', e); }
			}
			return result;
		};
		window.tooltip.__original = original;
	}

	// Is the Map at Zone window on screen? (The game hides the tooltip on close but may leave its
	// content in place.)
	function windowOpen() {
		const tip = document.getElementById('tooltipDiv');
		return !!(tip && tip.style.display !== 'none' && document.getElementById('mazContainer'));
	}

	// Close the panel when the Map at Zone window goes away (Save, Cancel or Esc).
	function watchWindow() {
		setInterval(function () {
			if (document.getElementById(PANEL_ID) && !windowOpen()) closePanel();
		}, 500);
	}

	function warn(text) {
		const bar = document.createElement('div');
		bar.id = 'niceMazIoWarning';
		bar.style.cssText = 'position:fixed;top:0;left:50%;transform:translateX(-50%);z-index:100000;max-width:90vw;'
			+ 'padding:0.5em 2.2em 0.5em 1em;background:#7f1d1d;color:#fff;border:1px solid #fca5a5;border-top:0;';
		bar.textContent = text;
		const close = document.createElement('span');
		close.textContent = '×';
		close.title = 'Close';
		close.style.cssText = 'position:absolute;right:0.6em;top:0.4em;cursor:pointer;';
		close.onclick = function () { bar.remove(); };
		bar.appendChild(close);
		document.body.appendChild(bar);
	}

	function registerOptions() {
		if (!window.NiceModLoader) {
			console.warn('[' + NAME + '] Nice Mod Loader (mods.js) not found, so the setting is not in Settings > Mods.');
			return;
		}
		NiceModLoader.register({ name: NAME, options: OPTIONS });
	}

	function start() {
		const fns = current();
		const changed = Object.keys(FINGERPRINTS).filter(function (k) { return fingerprint(fns[k]) !== FINGERPRINTS[k]; });
		if (changed.length) {
			const list = changed.map(function (k) { return k + ' (now ' + fingerprint(fns[k]) + ')'; }).join(', ');
			console.warn('[' + NAME + '] Changed game functions: ' + list);
			if (!IGNORE_VERSION_CHECK) {
				warn(NAME + ' is off: a Trimps update changed ' + list + '. The mod needs an update; to run it anyway, set IGNORE_VERSION_CHECK = true in mods/mazio.js.');
				return;
			}
			warn(NAME + ' is running although a Trimps update changed ' + list + ' (IGNORE_VERSION_CHECK is on).');
			if (changed.some(function (k) { return fingerprint(fns[k]) === 'missing'; })) return;
		}
		wrapTooltip();
		watchWindow();
		registerOptions();
	}

	if (document.body) start();
	else document.addEventListener('DOMContentLoaded', start);
})();
