// Graphs Only v1.2.0 — Trimps Steam mod (loaded by mods/mods.js)
//
// Settings > Mods has "Graphs Button: Off/On" in the Graphs Only box (added by the Nice Mod Loader,
// mods.js; on by default, kept in the save). Off only hides the button; data is still recorded.
//
// The AutoTrimps "Graphs only" script (Quiaaaa's fork, linked from the Zorn192/AutoTrimps
// README), bundled locally instead of downloaded from github.io on every start. Adds a
// "Graphs" button next to Achievements with per-zone / per-portal graphs. Graph history and
// graph settings are kept in localStorage (portalDataHistory, portalDataCurrent, GRAPHSETTINGS),
// the same as the original script.
//
// Files in mods/graphs-only/ (GPL-3.0, see LICENSE.txt; Highcharts 11.1.0 is free for personal use):
//   Graphs.js       Quiaaaa/AutoTrimps gh-pages, commit 1a6a322 (2026-03-29), with two changes,
//                   both marked "Steam mod":
//                   - Highcharts is loaded from this folder, not from github.io.
//                   - the buyUpgrade wrapper returns the game's result (the original drops it,
//                     which made the game's own AutoUpgrade skip its after-purchase step).
//   highcharts.js, boost.js, dark-graph.css   unchanged copies from the same commit.
//
// Version check: Graphs.js wraps 7 game functions to collect data. Before loading it, this
// file compares each with a fingerprint of the version it was made for. If any changed (a game
// update), graphs stay off and a warning names the function. Other mods may wrap the same
// functions (Nice Features wraps mapsSwitch); the check follows their `__original` chain, and
// after loading this file sets `__original` on the graphs wrappers too.

(function () {
	'use strict';

	// true = load even if a game update changed the wrapped functions (at your own risk).
	const IGNORE_VERSION_CHECK = false;

	// Fingerprints of the wrapped game functions (Trimps 5.10.1).
	const FINGERPRINTS = {
		nextWorld: '62a244c2',
		activatePortal: '3003ca51',
		buildMapGrid: '731bb813',
		mapsSwitch: 'd1e6c1bd',
		abandonChallenge: 'e788ab4e',
		rewardResource: '0d2267e5',
		buyUpgrade: '8cd3324a',
	};

	const FOLDER = 'mods/graphs-only/';

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

	function warn(text) {
		const bar = document.createElement('div');
		bar.id = 'graphsOnlyWarning';
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

	// Graphs.js keeps each original in a global var named original<function>.
	function markWrappers() {
		Object.keys(FINGERPRINTS).forEach(function (name) {
			const original = window['original' + name];
			if (typeof window[name] === 'function' && typeof original === 'function' && window[name] !== original) {
				window[name].__original = original;
			}
		});
	}

	/* "Graphs Button: Off/On" in Settings > Mods, kept in the save like the game's own settings. The
	   description goes in a quoted HTML attribute (no quotes or apostrophes) and must not match another
	   settings tab's name (general, layout, alerts, qol, performance, other). */
	const OPTION = {
		key: 'goButton',
		titles: ['Graphs Button: Off', 'Graphs Button: On'],
		fallback: 1,
		description: 'Shows the Graphs button next to Achievements (Graphs Only mod, from AutoTrimps). '
			+ 'Off hides the button, but Zone and portal data are still recorded, so the graphs have no gaps when you turn it back on.',
		onToggle: function () { applyButton(); },
	};

	function applyButton() {
		const item = game.options.menu[OPTION.key];
		const on = item ? item.enabled === 1 : OPTION.fallback === 1;
		if (document.body.classList.contains('goNoButton') !== !on) document.body.classList.toggle('goNoButton', !on);
		const open = document.getElementById('graphParent');
		if (!on && open && open.style.display === 'block' && window.Graphs) Graphs.UI.escapeATWindows(true); // close the window
	}

	function setupOption() {
		const style = document.createElement('style');
		style.textContent = 'body.goNoButton #graphsBtn { display: none !important; }';
		document.head.appendChild(style);
		// Settings > Mods comes from the Nice Mod Loader (mods.js). Without it the button stays on.
		if (window.NiceModLoader) NiceModLoader.register({ name: 'Graphs Only', options: [OPTION] });
		else console.warn('[Graphs Only] Nice Mod Loader (mods.js) not found, so the setting is not in Settings > Mods.');
		applyButton();
		// Also once a second, for a save loaded or imported later.
		setInterval(function () { try { applyButton(); } catch (e) { console.error('[Graphs Only]', e); } }, 1000);
	}

	function start() {
		const changed = Object.keys(FINGERPRINTS).filter(function (k) { return fingerprint(window[k]) !== FINGERPRINTS[k]; });
		if (changed.length) {
			const list = changed.map(function (k) { return k + ' (now ' + fingerprint(window[k]) + ')'; }).join(', ');
			console.warn('[Graphs Only] Changed game functions: ' + list);
			if (!IGNORE_VERSION_CHECK) {
				warn('Graphs Only is off: a Trimps update changed ' + list + '. The mod needs an update; to run it anyway, set IGNORE_VERSION_CHECK = true in mods/graphs-only.js.');
				return;
			}
			warn('Graphs Only is running although a Trimps update changed ' + list + ' (IGNORE_VERSION_CHECK is on).');
			if (changed.some(function (k) { return fingerprint(window[k]) === 'missing'; })) return; // nothing to wrap
		}
		window.graphsBasePath = FOLDER; // Graphs.js reads this for highcharts.js, boost.js and dark-graph.css
		const script = document.createElement('script');
		script.id = 'Graphs';
		script.src = FOLDER + 'Graphs.js';
		script.onload = function () {
			markWrappers();
			try { setupOption(); } catch (e) { console.error('[Graphs Only]', e); }
		};
		script.onerror = function () { console.warn('[Graphs Only] Could not load ' + script.src); };
		document.head.appendChild(script);
	}

	// Same 1 second delay as the original loader, so the game has finished starting up.
	setTimeout(start, 1000);
})();
