// RunetrinketInfo v1.0.0 — Trimps Steam mod (loaded by mods/mods.js)
//
// Settings > Mods has "Runetrinket Info: Off/On" in the RunetrinketInfo box (added by the Nice
// Mod Loader, mods.js; on by default, kept in the save). Off removes the box.
//
// In Universe 2, once you have the Observation perk, a small box in the corner of the Wood panel
// shows your Runetrinkets over the cap. Hover it for the bonus they give, the chance to find one
// at the end of this Zone, the guaranteed ones every 25 Zones, and how many a run to your best
// Zone should bring with your current perk level.
//
// A Steam version of the RunetrinketInfo browser add-on (Runetrinket Counter) by stellar-demesne,
// with the same name. None of its code is used; this is a new implementation.
//
// The game files are never changed and no game function is wrapped. All numbers come from the
// Observation perk's own functions (getMult, getTrinketCap, getDropChance, getChanceText), except
// the guaranteed Runetrinkets every 25 Zones, which copy onNextWorld. So the mod compares
// onNextWorld with a fingerprint of the version this was made for (Trimps 5.10.1). If a Trimps
// update changed it, the mod stays off and shows a warning (set IGNORE_VERSION_CHECK to true
// below to run it anyway).

(function () {
	'use strict';

	// true = run even if a game update changed the functions below (numbers may then be wrong).
	const IGNORE_VERSION_CHECK = false;

	// Fingerprints of the game functions whose formulas this mod copies (Trimps 5.10.1).
	const FINGERPRINTS = {
		'game.portal.Observation.onNextWorld': '9af83c80',
	};

	const NAME = 'RunetrinketInfo';
	const BOX_ID = 'niceRunetrinketsBox';

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
		const obs = window.game && game.portal && game.portal.Observation;
		return { 'game.portal.Observation.onNextWorld': obs && obs.onNextWorld };
	}

	/* Settings in the game's Settings > Mods tab, kept in the save like the game's own settings.
	   Descriptions: no quotes or apostrophes (they go in a quoted HTML attribute) and no words that
	   match another settings tab's name. */
	const OPTIONS = [
		{
			key: 'nrInfo',
			titles: ['Runetrinket Info: Off', 'Runetrinket Info: On'],
			fallback: 1,
			description: 'In Universe 2, a small box in the Wood panel with your Runetrinkets and their cap. Hover it for the bonus and the drop odds (RunetrinketInfo mod).',
			onToggle: update,
		},
	];

	function optionOn(key) {
		const item = window.game && game.options.menu[key];
		return item ? item.enabled === 1 : OPTIONS.find(function (o) { return o.key === key; }).fallback === 1;
	}

	function obs() { return game.portal.Observation; }

	function shown() {
		return game.global.universe == 2 && !obs().radLocked;
	}

	// Free Runetrinkets every 25 Zones above Z100 (copied from onNextWorld).
	function freePer25() { return Math.floor(obs().radLevel / 2); }

	// Expected Runetrinkets from a run that clears Zones up to `cleared`, with the current perk
	// level. The game rolls after moving on, with the new Zone number: clearing Z100 rolls for Z101.
	// Ignores the cap and Alchemy potions.
	function expectedRun(cleared) {
		const o = obs();
		let total = 0;
		for (let w = 101; w <= cleared + 1; w++) {
			total += o.getDropChance(w, true) / 100;
			if (w % 25 === 0) total += freePer25();
		}
		return total;
	}

	function bestCleared() { return game.global.highestRadonLevelCleared; }

	/* ------------------------------------------------------------------ display */

	function tooltipText() {
		const o = obs();
		const level = o.radLevel + 1;
		const cap = o.getTrinketCap();
		const active = Math.min(o.trinkets, cap);
		let t = '<p>You have <b>' + prettify(o.trinkets) + '</b> Runetrinket' + needAnS(o.trinkets) + ' and can store <b>' + prettify(cap) + '</b>'
			+ (u2Mutations.tree.Runed.purchased ? ' (1.5x from the Runed mutator)' : '') + '.</p>';
		t += '<p>Each one gives ' + prettify(level) + '% attack, health and gathered resources (1% per perk level), for <b>'
			+ formatMultAsPercent(o.getMult(), true) + '</b> in total' + (o.trinkets > cap ? ' (' + prettify(o.trinkets - cap) + ' over the cap give nothing)' : '') + '.</p>';
		t += '<p>' + o.getChanceText() + '</p>';
		const free = freePer25();
		t += '<p>Guaranteed: ' + (free > 0 ? '<b>' + free + '</b> every 25 Zones above Z100' : 'none yet (1 every 25 Zones above Z100 per 2 perk levels)') + '.</p>';
		const best = bestCleared();
		if (best >= 100) {
			const run = expectedRun(best);
			const runs = Math.ceil((cap - active) / run);
			t += '<p>A run that clears Z' + best + ' (your best) should bring about <b>' + prettify(run) + '</b> Runetrinkets';
			if (active < cap) t += '; at that rate the cap is ' + prettify(runs) + ' run' + needAnS(runs) + ' away';
			t += '.</p>';
		}
		if (active >= cap) t += '<p><b>You are at the cap.</b> New Runetrinkets are lost until you raise the Observation perk.</p>';
		return t;
	}

	function panel() { return document.getElementById('wood'); }

	function ensureBox() {
		let box = document.getElementById(BOX_ID);
		if (box) return box;
		const parent = panel();
		if (!parent) return null;
		if (getComputedStyle(parent).position === 'static') parent.style.position = 'relative';
		box = document.createElement('div');
		box.id = BOX_ID;
		box.style.cssText = 'position:absolute;top:0.2em;right:0.3em;z-index:2;font-size:0.6em;line-height:1.15;'
			+ 'text-align:center;padding:0.1em 0.35em;border:1px solid rgba(160,160,160,0.6);border-radius:3px;'
			+ 'background:rgba(0,0,0,0.35);cursor:default;';
		box.onmouseover = function (e) {
			try { tooltip('Runetrinkets', 'customText', e, tooltipText()); } catch (err) { console.error('[' + NAME + ']', err); }
		};
		box.onmouseout = function () { tooltip('hide'); };
		box.setAttribute('aria-label', 'Runetrinket information');
		parent.appendChild(box);
		return box;
	}

	let lastText = '';
	function update() {
		try {
			if (!window.game || !optionOn('nrInfo') || !shown()) {
				const old = document.getElementById(BOX_ID);
				if (old) old.remove();
				lastText = '';
				return;
			}
			const box = ensureBox();
			if (!box) return;
			const o = obs(), cap = o.getTrinketCap();
			const text = prettify(o.trinkets) + '<br/>/ ' + prettify(cap);
			if (text !== lastText) { box.innerHTML = text; lastText = text; }
			box.style.color = o.trinkets >= cap ? '#fbbf24' : '';
		} catch (e) {
			console.error('[' + NAME + ']', e);
		}
	}

	function warn(text) {
		const bar = document.createElement('div');
		bar.id = 'niceRunetrinketsWarning';
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
				warn(NAME + ' is off: a Trimps update changed ' + list + '. The mod needs an update; to run it anyway, set IGNORE_VERSION_CHECK = true in mods/runetrinket-info.js.');
				return;
			}
			warn(NAME + ' is running although a Trimps update changed ' + list + ' (IGNORE_VERSION_CHECK is on).');
			if (changed.some(function (k) { return fingerprint(fns[k]) === 'missing'; })) return;
		}
		registerOptions();
		update();
		setInterval(update, 1000);
	}

	if (document.body) start();
	else document.addEventListener('DOMContentLoaded', start);
})();
