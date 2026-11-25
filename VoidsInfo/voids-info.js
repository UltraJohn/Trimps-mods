// VoidsInfo v1.0.0 — Trimps Steam mod (loaded by mods/mods.js)
//
// Settings > Mods has "Void Map Info: Off/On" in the VoidsInfo box (added by the Trimps Mod Loader,
// mods.js; on by default, kept in the save). Off removes the box.
//
// A small box in the corner of the Science panel shows how many cells you have cleared since your
// last Void Map drop, over the average number of cells between drops with your current setup.
// Hover it for the details: the drop cooldown, the chance per cell right now, how many more cells
// to expect, how wide the spread is, what a better shield or the Golden Void upgrades would change,
// and the guaranteed drops from a Hazardous (or better) shield.
//
// How the game drops Void Maps (checkVoidMap): after your first portal, every cell you clear
// counts up a cell counter. Nothing can drop until the counter passes a cooldown of 1000 cells
// (+13 per Zone of your recent best above Z80, counted up to Z200), lowered by the shield's Void
// Map Drop Chance and by Golden Void. Past the cooldown the chance grows by 0.002% every 10 cells.
// A drop resets the counter. This mod does the same sums without changing anything.
//
// A Steam version of the VoidsInfo browser add-on (Void Map Clarifier) by stellar-demesne, with the
// same name. None of its code is used; this is a new implementation.
//
// The game files are never changed and no game function is wrapped. The mod copies the cooldown
// formula from checkVoidMap, so it compares checkVoidMap with a fingerprint of the version this
// was made for (Trimps 5.10.1). If a Trimps update changed it, the mod stays off and shows a
// warning (set IGNORE_VERSION_CHECK to true below to run it anyway).

(function () {
	'use strict';

	// true = run even if a game update changed the functions below (numbers may then be wrong).
	const IGNORE_VERSION_CHECK = false;

	// Fingerprints of the game functions whose formulas this mod copies (Trimps 5.10.1).
	const FINGERPRINTS = {
		'checkVoidMap': 'b5a9f088',
	};

	const NAME = 'VoidsInfo';
	const BOX_ID = 'niceVoidsBox';

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
		return { 'checkVoidMap': window.checkVoidMap };
	}

	/* Settings in the game's Settings > Mods tab, kept in the save like the game's own settings.
	   Descriptions: no quotes or apostrophes (they go in a quoted HTML attribute) and no words that
	   match another settings tab's name. */
	const OPTIONS = [
		{
			key: 'nvInfo',
			titles: ['Void Map Info: Off', 'Void Map Info: On'],
			fallback: 1,
			description: 'A small box in the Science panel with the cells cleared since your last Void Map and the average cells per drop. Hover it for the drop odds (VoidsInfo mod).',
			onToggle: update,
		},
	];

	function optionOn(key) {
		const item = window.game && game.options.menu[key];
		return item ? item.enabled === 1 : OPTIONS.find(function (o) { return o.key === key; }).fallback === 1;
	}

	/* ------------------------------------------------------------------ drop maths (from checkVoidMap) */

	// The Zone the cooldown is based on, as checkVoidMap works it out (read only, capped at 200).
	function cooldownZone() {
		let max = getVoidMaxLevel();
		const last = getLastPortal();
		if (last != -1 && (max - last) < 25) max = last;
		if (max > 200) max = 200;
		return max;
	}

	// Cells before Void Maps can drop. shieldPct and golden can be swapped in for the what-ifs.
	function cooldown(shieldPct, golden) {
		const zone = cooldownZone();
		let min = (zone > 80) ? (1000 + ((zone - 80) * 13)) : 1000;
		min *= (1 - (shieldPct / 100));
		min *= (1 - golden);
		return min;
	}

	function nurtureBonus() {
		const n = game.challenges.Nurture;
		return (n && n.boostsActive() && n.getLevel() >= 4) ? 0.2 : 0;
	}

	function currentShieldPct() { return getHeirloomBonus('Shield', 'voidMaps'); }
	function currentGolden() { return game.goldenUpgrades.Void.currentBonus + nurtureBonus(); }

	// Chance of a drop on the check made while the counter reads n.
	function chanceAt(n, min) {
		const c = Math.floor((n - min) / 10) / 50000;
		return c < 0 ? 0 : c;
	}

	// Cells from a counter value of `from` (all earlier checks failed) until the next drop:
	// mean and the 1% / 50% / 99% points. Exact sum over the game's chance steps.
	const statsCache = {};
	function dropStats(min, from) {
		const key = Math.round(min * 1000) + ':' + from;
		if (statsCache[key]) return statsCache[key];
		let survive = 1, mean = 0, n = from, p1 = null, p50 = null, p99 = null;
		while (survive > 1e-9 && n < from + 200000) {
			mean += survive;
			survive *= (1 - chanceAt(n, min));
			n++;
			const cells = n - from;
			if (p1 === null && survive <= 0.99) p1 = cells;
			if (p50 === null && survive <= 0.5) p50 = cells;
			if (p99 === null && survive <= 0.01) p99 = cells;
		}
		const out = { mean: mean, p1: p1, p50: p50, p99: p99 };
		if (Object.keys(statsCache).length > 50) for (const k in statsCache) delete statsCache[k];
		statsCache[key] = out;
		return out;
	}

	// Best Void Map Drop Chance a shield of the equipped rarity can roll, or null if unknown.
	function maxShieldPct() {
		const shield = game.global.ShieldEquipped;
		if (!shield || typeof shield.rarity !== 'number') return null;
		const mod = game.heirlooms.Shield.voidMaps;
		if (!mod || !mod.max) return null;
		const max = mod.max[shield.rarity];
		if (typeof max !== 'number') return null;
		return (typeof scaleHeirloomModUniverse === 'function') ? scaleHeirloomModUniverse('Shield', 'voidMaps', max) : max;
	}

	function hazardousCredit() {
		const shield = game.global.ShieldEquipped;
		if (!shield || shield.rarity < 10 || !(game.heirlooms.Shield.voidMaps.currentBonus > 0)) return null;
		return game.global.hazShieldCredit;
	}

	function blocked() {
		if (game.global.totalPortals < 1) return 'Void Maps start dropping after your first portal.';
		if (game.global.universe == 2 && game.global.totalRadPortals < 1) return 'Void Maps start dropping in this universe after your first portal here.';
		if (game.global.universe == 2 && game.global.spireActive) return 'No Void Maps drop while the Spire is active in this universe.';
		return '';
	}

	/* ------------------------------------------------------------------ display */

	function cells(n) { return prettify(Math.round(n)) + ' cell' + (Math.round(n) === 1 ? '' : 's'); }
	function pct(x) { return prettify(x * 100) + '%'; }

	function tooltipText() {
		const why = blocked();
		const shieldPct = currentShieldPct(), golden = currentGolden();
		const min = cooldown(shieldPct, golden);
		const last = game.global.lastVoidMap;
		const avg = dropStats(min, 0);
		const next = dropStats(min, last);
		let t = '';
		if (why) t += '<p><b>' + why + '</b></p>';
		t += '<p>You have cleared <b>' + cells(last) + '</b> since your last Void Map. '
			+ 'Nothing can drop until <b>' + cells(min) + '</b> (the cooldown, from Z' + cooldownZone()
			+ (shieldPct ? ', ' + prettify(shieldPct) + '% shield' : '') + (golden ? ', ' + pct(golden) + ' Golden Void' : '') + ').</p>';
		t += '<p>Chance on the next cell: <b>' + prettify(chanceAt(last, min) * 100) + '%</b>. '
			+ 'From here, expect the next drop in about <b>' + cells(next.mean) + '</b> (half the time within ' + cells(next.p50) + ').</p>';
		t += '<p>On average a Void Map drops every <b>' + cells(avg.mean) + '</b>. The spread is wide: '
			+ '1% of drops come within ' + cells(avg.p1) + ', and 1% take ' + cells(avg.p99) + ' or more.</p>';
		const best = maxShieldPct();
		if (best !== null && best > shieldPct + 0.001) {
			t += '<p>With the best Void Map Drop Chance for your shield rarity (' + prettify(best) + '%), the average would be '
				+ cells(dropStats(cooldown(best, golden), 0).mean) + '.</p>';
		}
		const goldenNow = game.goldenUpgrades.Void.currentBonus;
		if (goldenNow > 0) {
			t += '<p>Without Golden Void (' + pct(goldenNow) + ') the average would be ' + cells(dropStats(cooldown(shieldPct, golden - goldenNow), 0).mean) + '.</p>';
		}
		const credit = hazardousCredit();
		if (credit !== null) {
			t += '<p>Your shield also gives a guaranteed Void Map every 1000 cells: ' + prettify(credit) + ' / 1000.</p>';
		}
		t += '<p>Void Maps owned: <b>' + prettify(game.global.totalVoidMaps) + '</b>.</p>';
		return t;
	}

	function panel() { return document.getElementById('science'); }

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
			try { tooltip('Void Map Drops', 'customText', e, tooltipText()); } catch (err) { console.error('[' + NAME + ']', err); }
		};
		box.onmouseout = function () { tooltip('hide'); };
		box.setAttribute('aria-label', 'Void Map drop information');
		parent.appendChild(box);
		return box;
	}

	let lastText = '';
	function update() {
		try {
			if (!window.game || !optionOn('nvInfo')) {
				const old = document.getElementById(BOX_ID);
				if (old) old.remove();
				lastText = '';
				return;
			}
			const box = ensureBox();
			if (!box) return;
			const why = blocked();
			const min = cooldown(currentShieldPct(), currentGolden());
			const text = why ? 'Voids<br/>off' : prettify(game.global.lastVoidMap) + '<br/>/ ' + prettify(Math.round(dropStats(min, 0).mean));
			if (text !== lastText) { box.innerHTML = text; lastText = text; }
		} catch (e) {
			console.error('[' + NAME + ']', e);
		}
	}

	function warn(text) {
		const bar = document.createElement('div');
		bar.id = 'niceVoidsWarning';
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
		if (!window.TrimpsModLoader) {
			console.warn('[' + NAME + '] Trimps Mod Loader (mods.js) not found, so the setting is not in Settings > Mods.');
			return;
		}
		TrimpsModLoader.register({ name: NAME, options: OPTIONS });
	}

	function start() {
		const fns = current();
		const changed = Object.keys(FINGERPRINTS).filter(function (k) { return fingerprint(fns[k]) !== FINGERPRINTS[k]; });
		if (changed.length) {
			const list = changed.map(function (k) { return k + ' (now ' + fingerprint(fns[k]) + ')'; }).join(', ');
			console.warn('[' + NAME + '] Changed game functions: ' + list);
			if (!IGNORE_VERSION_CHECK) {
				warn(NAME + ' is off: a Trimps update changed ' + list + '. The mod needs an update; to run it anyway, set IGNORE_VERSION_CHECK = true in mods/voids-info.js.');
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
