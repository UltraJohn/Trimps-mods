// Nice Bones v3.3.0 — Trimps Steam mod (loaded by mods/mods.js)
//
// Settings > Mods has two toggles in the Nice Bones box (added by the Nice Mod Loader, mods.js;
// both on by default, kept in the save): "Fast Skeletimps" (the
// 10-minute wait below) and "Skeletimp Banking". With both off the game behaves as without the mod.
//
// Helps fresh saves catch up on bones, and stops Skeletimp time going to waste.
//
// The game spawns at most one Skeletimp per world Zone, and only when 45 minutes
// (35 with the talent) have passed since the last one was killed. Time beyond that
// is lost: a 2-hour map run still gives one Skeletimp.
//
// Faster timer: until the save can cover all 10 Exotic Imports (50 bones each), the
// wait is 10 minutes. Progress is read from the save itself: bones owned + 50 per
// Exotic Import owned. At 500 the wait goes back to the game's own 45 / 35 minutes.
//
// Banking: every full wait that passes is a banked Skeletimp, up to 6. When a world
// Zone is built, the first Skeletimp spawns exactly as in the game. The extra banked
// ones come last: once the game has picked a cell (Exotics, Turkimp, Randimp and the
// rest as usual), a cell it filled with a regular imp gets a 5% roll to become a
// Skeletimp instead. So extras never take the place of another special imp. One that
// does not spawn stays banked for the next Zone. Killing a Skeletimp uses up one. The
// average rate never goes above one per wait; it just keeps the time you spend in
// maps or slow Zones. Megaskeletimp odds and the bones per kill are unchanged.
//
// The bank is stored in the save, in the game's own lastSkeletimp timestamp: banked
// = whole waits since that time. A kill moves it forward by one wait instead of
// setting it to "now". Nothing is stored outside the save.
//
// How: the game files are never changed. At runtime the mod wraps a few game
// functions (its wrapper calls the game's original, plus one step):
//   - Skeletimp / Megaskeletimp loot: after the game sets lastSkeletimp to "now",
//     put it back to one wait later than before the kill (keeps the rest of the bank).
//   - buildGrid / getRandomBadGuy: while a world grid is built, the game's
//     canSkeletimp flag is set from the bank until the first Skeletimp spawns;
//     after that, extra banked ones may replace regular imps the game picked
//     (rolled on the game's Skeletimp seed, so the other imps are not affected).
//   - newGame: the game builds a new `game` object on every load and portal; the
//     wrapper re-wraps the loot functions on it.
//   - showBones: adds the progress and bank lines to the Bone Trader.
//
// Version check: before wrapping, the mod compares each function with a fingerprint
// of the version it was made for. If any changed (a game update), the mod stays off
// and shows a warning naming the function and its new fingerprint. Other mods may wrap the same
// functions (the Nice Mod Loader wraps newGame too); each wrapper keeps the function it wrapped in
// `__original`, and the check follows that chain back to the game's own function.

(function () {
	'use strict';

	// true = run even if a game update changed the wrapped functions (at your own risk).
	const IGNORE_VERSION_CHECK = false;

	// Fingerprints of the wrapped game functions (Trimps 5.10.1).
	const FINGERPRINTS = {
		'newGame': '24a892bb',
		'showBones': '309b6d8f',
		'buildGrid': '09d15b8a',
		'getRandomBadGuy': '069383a0',
		'game.badGuys.Skeletimp.loot': '487628ce',
		'game.badGuys.Megaskeletimp.loot': 'a194c2ac',
	};

	const MIN = 60 * 1000;
	const FAST_WAIT = 10 * MIN;    // Nice Bones wait until the goal
	const BANK_MAX = 6;            // most Skeletimps that can be banked
	const IMPORT_COST = 50;
	const GOAL = 500;              // 10 Exotic Imports x 50 bones
	const SKELETIMPS = ['Skeletimp', 'Megaskeletimp'];

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
		return {
			'newGame': window.newGame,
			'showBones': window.showBones,
			'buildGrid': window.buildGrid,
			'getRandomBadGuy': window.getRandomBadGuy,
			'game.badGuys.Skeletimp.loot': game.badGuys.Skeletimp && game.badGuys.Skeletimp.loot,
			'game.badGuys.Megaskeletimp.loot': game.badGuys.Megaskeletimp && game.badGuys.Megaskeletimp.loot,
		};
	}

	function progress(g) {
		const imps = (g.unlocks && g.unlocks.imps) || {};
		const owned = Object.keys(imps).filter(function (k) { return imps[k]; }).length;
		return (Number(g.global.b) || 0) + IMPORT_COST * owned;
	}

	/* Settings in the game's Settings > Mods tab, kept in the save like the game's own settings.
	   Descriptions: no quotes or apostrophes (they go in a quoted HTML attribute) and no words that
	   match another settings tab's name (general, layout, alerts, qol, performance, other). */
	const OPTIONS = [
		{
			key: 'nbFastTimer',
			titles: ['Fast Skeletimps: Off', 'Fast Skeletimps: On'],
			fallback: 1,
			description: 'Skeletimps every 10 minutes instead of 45 (35 with the talent) until your bones plus 50 per Exotic Import owned reach 500 (Nice Bones mod).',
			onToggle: refreshStatus,
		},
		{
			key: 'nbBanking',
			titles: ['Skeletimp Banking: Off', 'Skeletimp Banking: On'],
			fallback: 1,
			description: 'Every full Skeletimp wait that passes is banked, up to 6, and a world Zone can spawn one Skeletimp per banked one, '
				+ 'so time spent in maps or slow Zones is not wasted (Nice Bones mod). Off: one Skeletimp per wait, like the game.',
			onToggle: refreshStatus,
		},
	];

	function optionOn(key) {
		const item = game.options.menu[key];
		return item ? item.enabled === 1 : OPTIONS.find(function (o) { return o.key === key; }).fallback === 1;
	}

	// After a click in Settings: update the Bone Trader line if it is open.
	function refreshStatus() {
		try { showStatus(); } catch (e) { /* trader closed */ }
	}

	// Settings > Mods comes from the Nice Mod Loader (mods.js). Without it the settings keep their
	// fallback values.
	function registerOptions() {
		if (!window.NiceModLoader) {
			console.warn('[Nice Bones] Nice Mod Loader (mods.js) not found, so the settings are not in Settings > Mods.');
			return;
		}
		NiceModLoader.register({ name: 'Nice Bones', options: OPTIONS });
	}

	function fastTimer() { return optionOn('nbFastTimer') && progress(game) < GOAL; }
	function bankMax() { return optionOn('nbBanking') ? BANK_MAX : 1; }

	// The wait between Skeletimps: ours until the goal (if on), otherwise the game's own.
	function wait() {
		if (fastTimer()) return FAST_WAIT;
		const talent = game.talents && game.talents.skeletimp2 && game.talents.skeletimp2.purchased;
		return (talent ? 35 : 45) * MIN;
	}

	// Banked time since lastSkeletimp, capped at the bank size (1 wait with banking off, as in the game).
	function bankedTime(last, w) {
		return Math.max(0, Math.min(Date.now() - (Number(last) || 0), bankMax() * w));
	}

	function banked() {
		const w = wait();
		return Math.floor(bankedTime(game.global.lastSkeletimp, w) / w);
	}

	function wrapLoot(g) {
		SKELETIMPS.forEach(function (name) {
			const enemy = g.badGuys && g.badGuys[name];
			if (!enemy || typeof enemy.loot !== 'function' || enemy.loot.__niceBones) return;
			const original = enemy.loot;
			enemy.loot = function () {
				const last = game.global.lastSkeletimp;
				const before = progress(game);
				const w = wait(); // the wait this Skeletimp was banked with
				const result = original.apply(this, arguments);
				// Use up one wait; the rest stays banked (the game just set it to "now").
				game.global.lastSkeletimp = Date.now() - Math.max(0, bankedTime(last, w) - w);
				if (optionOn('nbFastTimer') && before < GOAL && progress(game) >= GOAL) {
					message('Nice Bones: you have enough bones for every Exotic Import, so Skeletimps are back to their normal timer.'
						+ (optionOn('nbBanking') ? ' Banking stays on.' : ''), 'Notices', 'italic', '');
				}
				return result;
			};
			enemy.loot.__niceBones = true;
			enemy.loot.__original = original;
		});
	}

	function wrapNewGame() {
		const original = window.newGame;
		window.newGame = function () {
			const g = original.apply(this, arguments);
			try { wrapLoot(g); } catch (e) { console.error('[Nice Bones]', e); }
			return g;
		};
		window.newGame.__original = original;
	}

	// While a world grid is built: how many Skeletimps it may still spawn, and whether the
	// game's own (first) one has spawned yet.
	let gridLeft = -1;
	let gridFirstDone = false;

	function wrapBuildGrid() {
		const original = window.buildGrid;
		window.buildGrid = function () {
			try { gridLeft = banked(); } catch (e) { console.error('[Nice Bones]', e); gridLeft = -1; }
			gridFirstDone = false;
			try { return original.apply(this, arguments); }
			finally { gridLeft = -1; }
		};
		window.buildGrid.__original = original;
	}

	// A cell the game filled with a regular imp from its normal list (not an Exotic, Turkimp,
	// Randimp, Pumpkimp, Mutimp or the Zone's last cell). Only these can become extra Skeletimps.
	function isRegular(name, level, totalCells, imports) {
		const bad = game.badGuys[name];
		if (!bad || bad.locked || bad.last || level === totalCells) return false;
		if (imports && imports.indexOf(name) !== -1) return false;
		return bad.location === 'World' || bad.location === 'All' || bad.location === 'Exterminate';
	}

	function wrapGetRandomBadGuy() {
		const original = window.getRandomBadGuy;
		window.getRandomBadGuy = function (mapSuffix, level, totalCells, world, imports) {
			if (gridLeft < 0 || mapSuffix) return original.apply(this, arguments);
			if (!gridFirstDone) {
				// The first Skeletimp: exactly the game's own roll, at its usual place.
				window.canSkeletimp = gridLeft > 0;
				const result = original.apply(this, arguments);
				if (SKELETIMPS.indexOf(result) !== -1) { gridLeft--; gridFirstDone = true; }
				return result;
			}
			// Extra banked ones: the game picks the cell as it would after its one Skeletimp; only a
			// regular imp can then be replaced, with the same 5% roll on the game's Skeletimp seed
			// (the cell seed is untouched, so every other imp spawns as without the mod).
			window.canSkeletimp = false;
			const result = original.apply(this, arguments);
			if (gridLeft > 0 && isRegular(result, level, totalCells, imports)
				&& getRandomIntSeeded(game.global.skeleSeed++, 0, 100) < 5) {
				gridLeft--;
				return (getRandomIntSeeded(game.global.skeleSeed++, 0, 100) < ((game.talents.skeletimp.purchased) ? 20 : 10)) ? 'Megaskeletimp' : 'Skeletimp';
			}
			return result;
		};
		window.getRandomBadGuy.__original = original;
	}

	function wrapShowBones() {
		const original = window.showBones;
		window.showBones = function () {
			const result = original.apply(this, arguments);
			try { showStatus(); } catch (e) { console.error('[Nice Bones]', e); }
			return result;
		};
		window.showBones.__original = original;
	}

	function showStatus() {
		const box = document.getElementById('boneOwnedContainer');
		if (!box) return;
		let line = document.getElementById('niceBonesStatus');
		const fast = optionOn('nbFastTimer'), bank = optionOn('nbBanking');
		if (!fast && !bank) { if (line) line.remove(); return; }
		if (!line) {
			line = document.createElement('div');
			line.id = 'niceBonesStatus';
			line.style.cssText = 'font-size: 0.6em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;';
			box.appendChild(line);
		}
		const value = progress(game);
		const minutes = Math.round(wait() / MIN);
		line.textContent = 'Nice Bones: ' + (fast && value < GOAL ? Math.floor(value) + ' / ' + GOAL + ' (bones + 50 per import owned), ' : '')
			+ 'Skeletimps every ' + minutes + ' minutes' + (bank ? ', ' + banked() + ' / ' + BANK_MAX + ' banked' : '');
	}

	function warn(text) {
		const bar = document.createElement('div');
		bar.id = 'niceBonesWarning';
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

	function start() {
		const fns = current();
		const changed = Object.keys(FINGERPRINTS).filter(function (k) { return fingerprint(fns[k]) !== FINGERPRINTS[k]; });
		if (changed.length) {
			const list = changed.map(function (k) { return k + ' (now ' + fingerprint(fns[k]) + ')'; }).join(', ');
			console.warn('[Nice Bones] Changed game functions: ' + list);
			if (!IGNORE_VERSION_CHECK) {
				warn('Nice Bones is off: a Trimps update changed ' + list + '. The mod needs an update; to run it anyway, set IGNORE_VERSION_CHECK = true in mods/nice-bones.js.');
				return;
			}
			warn('Nice Bones is running although a Trimps update changed ' + list + ' (IGNORE_VERSION_CHECK is on).');
			if (changed.some(function (k) { return fingerprint(fns[k]) === 'missing'; })) return; // nothing to wrap
		}
		wrapNewGame();
		wrapShowBones();
		wrapBuildGrid();
		wrapGetRandomBadGuy();
		wrapLoot(game);
		registerOptions();
	}

	if (document.body) start();
	else document.addEventListener('DOMContentLoaded', start);
})();
