// Trimps – Nice Mod Loader 1.1.0 (Steam mod)
//
// The Steam version of Trimps only loads mods/mods.js, so this file loads the other mods
// in the mods folder for you. To add a mod: put its .js file in the mods folder and add its
// file name to the list below. To turn one off: remove (or comment out) its line. Then restart Trimps.
//
// Mods are loaded one after another, in the order listed. If one is missing or has an error,
// the rest still load; check the console (F12) for "[Mod loader]" messages.
//
// The loader also adds a "Mods" tab to the game's Settings menu. Each mod that registers settings
// gets its own box there, in the order of the list below. The settings are kept in your save,
// like the game's own settings.
//
// For mod authors: call NiceModLoader.register() once when your mod starts.
//
//   NiceModLoader.register({
//       name: 'My Mod',                       // the box title in Settings > Mods
//       options: [{
//           key: 'mmThing',                   // key in game.options.menu; keep it unique (use a prefix)
//           titles: ['Thing: Off', 'Thing: On'], // one button text per value; a click cycles them
//           fallback: 1,                      // value for a new save
//           description: 'Hover text.',       // no quotes or apostrophes (see below)
//           onToggle: function () { ... },    // optional, runs after each click
//       }],
//   });
//
//   NiceModLoader.value('mmThing')  ->  the current value (the fallback before the save has it)
//   NiceModLoader.setValue('mmThing', 2)  ->  sets it (0 up to titles.length - 1)
//
// An option with hidden: true is kept in the save but never shown in any settings tab. Use it for
// a value a mod remembers itself (its titles are then just the list of allowed values).
//
// Descriptions go inside a quoted HTML attribute, so no quotes or apostrophes. They also must not
// contain the name of one of the game's other settings tabs (general, layout, alerts, qol,
// performance, other): the game fills those tabs by searching every setting's text.
//
// The game files are never changed. At runtime two game functions are wrapped (the wrapper calls
// the game's original and adds one step): newGame (put the mods' settings into each new game
// object, so the game saves and loads them) and searchSettings (draw the Mods tab; every other
// search goes to the game's own code). Before wrapping, each is compared with a fingerprint of
// the version this loader was made for. If a Trimps update changed one, that part stays off and
// a warning names the function and its new fingerprint; set IGNORE_VERSION_CHECK = true below to
// wrap it anyway. Without the newGame wrapper the settings are put back from the local save once
// a second; without the searchSettings wrapper the Mods tab shows the settings the game's own way
// (one list, and nothing at all if there are more than 12).
//
// Other mods may wrap the same functions. Each wrapper keeps the function it wrapped in
// `__original`, and the fingerprint check follows that chain back to the game's own function.

(function () {
	'use strict';

	const MODS = [
		'nice-theme.js',
		'nice-features.js',
		'nice-perks.js',
		'nice-bones.js',
		'graphs-only.js',
		'mazio.js',
		'voids-info.js',
		'runetrinket-info.js',
		'seeds-info.js',
		// 'another-mod.js',
	];

	// Relative to index.html, which is where the game loads mods/mods.js from.
	const FOLDER = 'mods/';

	// true = wrap the game functions even if a Trimps update changed them (at your own risk).
	const IGNORE_VERSION_CHECK = false;

	// Fingerprints of the wrapped game functions (Trimps 5.10.1).
	const FINGERPRINTS = {
		newGame: '24a892bb',
		searchSettings: '572a3fcd',
	};

	/* ------------------------------------------------------------------ Settings */
	const categories = []; // { name, options }, in register order

	function findOption(key) {
		for (let i = 0; i < categories.length; i++) {
			const opt = categories[i].options.find(function (o) { return o.key === key; });
			if (opt) return opt;
		}
		return null;
	}

	// Adds the options that are missing to a game object. values: key -> value to start with
	// (missing = the option's fallback). Returns true if anything was added.
	function addOptions(g, list, values) {
		const menu = g && g.options && g.options.menu;
		if (!menu) return false;
		let added = false;
		list.forEach(function (opt) {
			if (menu[opt.key]) return;
			menu[opt.key] = {
				// 'mods' makes the game's own search find them too ("Browse All", typing a word).
				extraTags: 'mods',
				// The game skips locked settings everywhere it lists them, but still saves them.
				locked: opt.hidden ? true : undefined,
				enabled: values && values[opt.key] !== undefined ? values[opt.key] : opt.fallback,
				description: opt.description,
				titles: opt.titles.slice(),
				onToggle: function () {
					if (typeof opt.onToggle === 'function') {
						try { opt.onToggle(); } catch (e) { console.error('[Mod loader]', e); }
					}
				},
			};
			added = true;
		});
		return added;
	}

	function allOptions() {
		return categories.reduce(function (list, c) { return list.concat(c.options); }, []);
	}

	// For a save that loaded before a mod registered (or without the newGame wrapper): read the
	// values from the game's local save.
	function savedValues(list) {
		const values = {};
		try {
			const text = localStorage.getItem('trimpSave1');
			const save = text && JSON.parse(LZString.decompressFromBase64(text));
			const menu = save && save.options && save.options.menu;
			list.forEach(function (opt) {
				const item = menu && menu[opt.key];
				if (item && item.enabled >= 0 && item.enabled < opt.titles.length) values[opt.key] = item.enabled;
			});
		} catch (e) { /* no save yet */ }
		return values;
	}

	function modsTabShown() {
		const input = document.getElementById('searchSettings');
		return !!(input && game.options.displayed && isModsSearch(input.value));
	}

	function refreshIfShown() {
		if (modsTabShown() && typeof searchSettings === 'function') searchSettings(document.getElementById('searchSettings'));
	}

	// Safety net, once a second: puts the settings back if a new game object lacks them.
	function ensureOptions() {
		if (typeof game === 'undefined') return;
		const list = allOptions();
		if (addOptions(game, list, savedValues(list))) refreshIfShown();
	}

	function register(def) {
		if (!def || !def.name || !Array.isArray(def.options)) {
			console.warn('[Mod loader] register() needs { name, options: [...] }');
			return;
		}
		const options = def.options.filter(function (opt) {
			if (!opt || !opt.key || !Array.isArray(opt.titles) || !opt.titles.length) {
				console.warn('[Mod loader] ' + def.name + ': skipped an option without key or titles');
				return false;
			}
			if (findOption(opt.key)) {
				console.warn('[Mod loader] ' + def.name + ': option key ' + opt.key + ' is already used');
				return false;
			}
			return true;
		}).map(function (opt) {
			return {
				key: opt.key,
				titles: opt.titles.slice(),
				fallback: opt.fallback >= 0 && opt.fallback < opt.titles.length ? opt.fallback : 0,
				description: String(opt.description || ''),
				onToggle: opt.onToggle,
				hidden: !!opt.hidden,
			};
		});
		let category = categories.find(function (c) { return c.name === def.name; });
		if (category) category.options = category.options.concat(options);
		else categories.push({ name: String(def.name), options: options });
		if (typeof game !== 'undefined' && addOptions(game, options, savedValues(options))) refreshIfShown();
	}

	function value(key) {
		const item = typeof game !== 'undefined' && game.options && game.options.menu[key];
		if (item) return item.enabled;
		const opt = findOption(key);
		return opt ? opt.fallback : undefined;
	}

	function setValue(key, v) {
		const opt = findOption(key);
		if (!opt || !(v >= 0 && v < opt.titles.length) || Math.floor(v) !== v) {
			console.warn('[Mod loader] setValue: no option ' + key + ' with value ' + v);
			return;
		}
		const item = typeof game !== 'undefined' && game.options && game.options.menu[key];
		if (item) item.enabled = v;
	}

	window.NiceModLoader = { version: '1.1.0', register: register, value: value, setValue: setValue };

	/* ------------------------------------------------------------------ Mods tab */
	const CSS = String.raw`
#settingSearchResults.nmlMods { height: auto; }
.nmlBoxes { display: flex; flex-wrap: wrap; align-items: flex-start; padding: 0 1vw 0.3vw; }
.nmlBox {
	min-width: 0; margin: 0 0.5vw 0.4vw; padding: 0 0.3vw 0.3vw;
	border: 1px solid rgba(128, 128, 128, 0.6); border-radius: 4px;
}
.nmlBox > legend {
	width: auto; margin: 0 0 0 0.4vw; padding: 0 0.4vw; border: 0;
	font-size: 1.1vw; line-height: inherit; color: inherit; opacity: 0.85;
}
.nmlBox .optionContainer { margin-left: 0.5vw; margin-right: 0.5vw; }
.nmlEmpty { padding: 0.5vw 2vw; opacity: 0.85; }
`;

	function isModsSearch(text) {
		return String(text || '').trim().toLowerCase() === 'mods';
	}

	function escapeHtml(text) {
		return String(text).replace(/[&<>"']/g, function (c) {
			return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
		});
	}

	// Same steps as the game's searchSettings, with one box per mod and no limit.
	function drawModsTab(resultsElem) {
		resultsElem.classList.add('nmlMods');
		clearSettingTabs();
		const tooltips = {};
		let html = '';
		categories.forEach(function (c) {
			let buttons = '';
			c.options.forEach(function (opt) {
				const item = game.options.menu[opt.key];
				if (!item || opt.hidden) return;
				buttons += getSettingHtml(item, opt.key);
				tooltips['toggle' + opt.key] = getSettingsHTMLTooltipArgs(opt.key);
			});
			if (buttons) html += '<fieldset class="nmlBox"><legend>' + escapeHtml(c.name) + '</legend>' + buttons + '</fieldset>';
		});
		resultsElem.innerHTML = html
			? '<div class="nmlBoxes">' + html + '</div>'
			: '<div class="nmlEmpty">No mod settings yet.</div>';
		Object.keys(tooltips).forEach(function (id) { makeAccessibleTooltip(id, tooltips[id]); });
	}

	function ensureModsTab() {
		if (document.getElementById('ModsTab')) return;
		const hotkeys = document.getElementById('HotkeyTab');
		if (!hotkeys) return;
		const tab = document.createElement('li');
		tab.id = 'ModsTab';
		tab.className = 'tabNotSelected settingTab';
		tab.setAttribute('role', 'presentation');
		tab.setAttribute('onclick', "settingTab('Mods')");
		tab.innerHTML = '<a>Mods</a>';
		hotkeys.parentNode.insertBefore(tab, hotkeys);
	}

	/* ------------------------------------------------------------------ Game function wrappers */
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

	const changedFns = [];
	const EFFECT_WHEN_OFF = {
		newGame: 'mod settings may not be kept when a save is loaded or imported',
		searchSettings: 'the Mods tab shows one list (empty with more than 12 settings)',
	};
	// Puts makeWrapper(original) in place of window[name] if the fingerprint matches.
	function wrap(name, makeWrapper) {
		const original = window[name];
		const now = fingerprint(original);
		if (now !== FINGERPRINTS[name]) {
			changedFns.push({ name: name, now: now });
			console.warn('[Mod loader] Game function ' + name + ' changed, fingerprint now ' + now);
			if (!IGNORE_VERSION_CHECK || now === 'missing') return false;
		}
		const wrapper = makeWrapper(original);
		wrapper.__original = original;
		window[name] = wrapper;
		return true;
	}

	function warnChanged() {
		if (!changedFns.length) return;
		const list = changedFns.map(function (f) { return f.name + ' (now ' + f.now + ')'; }).join(', ');
		const effects = changedFns.map(function (f) { return EFFECT_WHEN_OFF[f.name]; }).join(', and ');
		const bar = document.createElement('div');
		bar.id = 'nmlWarning';
		bar.style.cssText = 'position:fixed;bottom:0;left:50%;transform:translateX(-50%);z-index:100000;max-width:90vw;'
			+ 'padding:0.5em 2.2em 0.5em 1em;background:#7f1d1d;color:#fff;border:1px solid #fca5a5;border-bottom:0;';
		bar.textContent = IGNORE_VERSION_CHECK
			? 'Nice Mod Loader is running although a Trimps update changed ' + list + ' (IGNORE_VERSION_CHECK is on).'
			: 'Nice Mod Loader: a Trimps update changed ' + list + ', so ' + effects + '. '
				+ 'The loader needs an update; to run it anyway, set IGNORE_VERSION_CHECK = true in mods/mods.js.';
		const close = document.createElement('span');
		close.textContent = '×';
		close.title = 'Close';
		close.style.cssText = 'position:absolute;right:0.6em;top:0.4em;cursor:pointer;';
		close.onclick = function () { bar.remove(); };
		bar.appendChild(close);
		document.body.appendChild(bar);
	}

	function setupSettings() {
		const style = document.createElement('style');
		style.id = 'nmlStyle';
		style.textContent = CSS;
		document.head.appendChild(style);

		wrap('newGame', function (original) {
			return function () {
				const g = original.apply(this, arguments);
				try { addOptions(g, allOptions()); } catch (e) { console.error('[Mod loader]', e); }
				return g;
			};
		});
		wrap('searchSettings', function (original) {
			return function (elem) {
				const resultsElem = document.getElementById('settingSearchResults');
				if (elem && isModsSearch(elem.value) && resultsElem) {
					try { drawModsTab(resultsElem); return; } catch (e) { console.error('[Mod loader]', e); }
				}
				if (resultsElem) resultsElem.classList.remove('nmlMods');
				return original.apply(this, arguments);
			};
		});
		ensureModsTab();
		warnChanged();
		setInterval(function () {
			try { ensureOptions(); } catch (e) { console.error('[Mod loader]', e); }
		}, 1000);
	}

	/* ------------------------------------------------------------------ Loading */
	function loadNext(i) {
		if (i >= MODS.length) return;
		const script = document.createElement('script');
		script.src = FOLDER + MODS[i];
		script.onload = function () { loadNext(i + 1); };
		script.onerror = function () {
			console.warn('[Mod loader] Could not load ' + script.src + ' (missing file or typo in the list?)');
			loadNext(i + 1);
		};
		document.body.appendChild(script);
	}

	try { setupSettings(); } catch (e) { console.error('[Mod loader]', e); }
	loadNext(0);
})();
