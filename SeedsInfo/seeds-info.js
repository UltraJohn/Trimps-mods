// SeedsInfo v1.0.0 — Trimps Steam mod (loaded by mods/mods.js)
//
// Settings > Mods has "Mutated Seed Info: Off/On" in the SeedsInfo box (added by the Trimps Mod
// Loader, mods.js; on by default, kept in the save). Off removes the box.
//
// In Universe 2 from Z201 (outside the Spire), a small box in the corner of the Metal panel shows
// the Mutated Seeds still to be won in this Zone, over the Zone's total. Hover it for a list of
// the mutated enemies in the Zone by kind (Raging, Novad, Compressed, Randomized and their mixes):
// how many are left, how many there were, and the Seeds they give.
//
// A Steam version of the SeedsInfo browser add-on (Mutation Counter) by stellar-demesne, with the
// same name. None of its code is used; this is a new implementation.
//
// The game files are never changed and no game function is wrapped. The Seeds per enemy copy the
// sum in u2Mutations.rewardMutation (without its side effects: no Seeds, Radon, Nullifium or
// messages are given), so the mod compares that function with a fingerprint of the version this
// was made for (Trimps 5.10.1). If a Trimps update changed it, the mod stays off and shows a
// warning (set IGNORE_VERSION_CHECK to true below to run it anyway).

(function () {
	'use strict';

	// true = run even if a game update changed the functions below (numbers may then be wrong).
	const IGNORE_VERSION_CHECK = false;

	// Fingerprints of the game functions whose formulas this mod copies (Trimps 5.10.1).
	const FINGERPRINTS = {
		'u2Mutations.rewardMutation': 'b8e7e498',
	};

	const NAME = 'SeedsInfo';
	const BOX_ID = 'niceSeedsBox';

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
		return { 'u2Mutations.rewardMutation': window.u2Mutations && u2Mutations.rewardMutation };
	}

	/* Settings in the game's Settings > Mods tab, kept in the save like the game's own settings.
	   Descriptions: no quotes or apostrophes (they go in a quoted HTML attribute) and no words that
	   match another settings tab's name. */
	const OPTIONS = [
		{
			key: 'nsInfo',
			titles: ['Mutated Seed Info: Off', 'Mutated Seed Info: On'],
			fallback: 1,
			description: 'In Universe 2 from Z201, a small box in the Metal panel with the Mutated Seeds left in this Zone and its total. Hover it for the mutated enemies by kind (SeedsInfo mod).',
			onToggle: update,
		},
	];

	function optionOn(key) {
		const item = window.game && game.options.menu[key];
		return item ? item.enabled === 1 : OPTIONS.find(function (o) { return o.key === key; }).fallback === 1;
	}

	function shown() {
		return game.global.universe == 2 && game.global.world > 200 && !game.global.spireActive;
	}

	/* ------------------------------------------------------------------ seeds (from rewardMutation) */

	function typeOf(mut) {
		if (mut == 'RGE') return 'Rage';
		if (mut == 'NVA' || mut == 'NVX') return 'Nova';
		if (mut == 'CMP' || mut == 'CMX') return 'Compression';
		if (mut == 'CSP' || mut == 'CSX') return 'Swapper';
		return null;
	}

	// Multipliers that are the same for every enemy in the Zone.
	function zoneMult() {
		let m = 1;
		if (game.global.desoCompletions > 0) m *= game.challenges.Desolation.getTrimpMult();
		if (game.global.challengeActive == 'Daily') m *= (1 + (getDailyHeliumValue(countDailyWeight()) / 100));
		if (Fluffy.isRewardActive('bigSeeds')) m *= 10;
		m *= u2SpireBonuses.seedDrop();
		return calcHeirloomBonus('Staff', 'SeedDrop', m);
	}

	function seedsFor(cell, mult, typeMult) {
		let sum = 0;
		for (let i = 0; i < cell.u2Mutation.length; i++) {
			const t = typeOf(cell.u2Mutation[i]);
			if (t) sum += typeMult[t];
		}
		return (game.global.world - 199) * sum * cell.u2Mutation.length * mult;
	}

	// Mutated enemies in the current world grid, grouped by the name the game gives them.
	function survey() {
		const grid = game.global.gridArray || [];
		const mult = zoneMult();
		const typeMult = {};
		['Rage', 'Nova', 'Compression', 'Swapper'].forEach(function (t) {
			const type = u2Mutations.types[t];
			typeMult[t] = (type && typeof type.rewardMult === 'function') ? type.rewardMult() : 0;
		});
		const firstLeft = game.global.lastClearedCell + 1;
		const groups = {};
		const out = { total: 0, left: 0, groups: [] };
		for (let i = 0; i < grid.length; i++) {
			const cell = grid[i];
			if (!cell || !cell.u2Mutation || !cell.u2Mutation.length) continue;
			const seeds = seedsFor(cell, mult, typeMult);
			const name = u2Mutations.getName(cell.u2Mutation);
			let g = groups[name];
			if (!g) {
				g = groups[name] = { name: name, color: u2Mutations.getColor(cell.u2Mutation), count: 0, left: 0, seeds: 0, seedsLeft: 0 };
				out.groups.push(g);
			}
			g.count++;
			g.seeds += seeds;
			out.total += seeds;
			if (i >= firstLeft) {
				g.left++;
				g.seedsLeft += seeds;
				out.left += seeds;
			}
		}
		out.groups.sort(function (a, b) { return b.seeds - a.seeds; });
		return out;
	}

	/* ------------------------------------------------------------------ display */

	function tooltipText() {
		const s = survey();
		let t = '<p>Mutated Seeds in Z' + game.global.world + ': <b>' + prettify(s.left) + '</b> still to win, of <b>' + prettify(s.total) + '</b> in the Zone.</p>';
		if (!s.groups.length) {
			t += '<p>No mutated enemies in this Zone.</p>';
		}
		else {
			t += "<table class='table' style='width:100%;margin-bottom:0.5em;'><tr><th>Enemy</th><th>Left</th><th>Seeds left</th><th>Zone total</th></tr>";
			s.groups.forEach(function (g) {
				t += "<tr><td><span style='display:inline-block;width:0.8em;height:0.8em;margin-right:0.35em;vertical-align:middle;background-color:" + g.color + ";'></span>"
					+ g.name + '</td><td>' + g.left + ' / ' + g.count + '</td><td>' + prettify(g.seedsLeft) + '</td><td>' + prettify(g.seeds) + '</td></tr>';
			});
			t += '</table>';
		}
		t += '<p>You have ' + prettify(game.global.mutatedSeeds) + ' Mutated Seeds.</p>';
		return t;
	}

	function panel() { return document.getElementById('metal'); }

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
			try { tooltip('Mutated Seeds', 'customText', e, tooltipText()); } catch (err) { console.error('[' + NAME + ']', err); }
		};
		box.onmouseout = function () { tooltip('hide'); };
		box.setAttribute('aria-label', 'Mutated Seed information');
		parent.appendChild(box);
		return box;
	}

	let lastText = '';
	function update() {
		try {
			if (!window.game || !optionOn('nsInfo') || !shown()) {
				const old = document.getElementById(BOX_ID);
				if (old) old.remove();
				lastText = '';
				return;
			}
			const box = ensureBox();
			if (!box) return;
			const s = survey();
			const text = prettify(s.left) + '<br/>/ ' + prettify(s.total);
			if (text !== lastText) { box.innerHTML = text; lastText = text; }
		} catch (e) {
			console.error('[' + NAME + ']', e);
		}
	}

	function warn(text) {
		const bar = document.createElement('div');
		bar.id = 'niceSeedsWarning';
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
				warn(NAME + ' is off: a Trimps update changed ' + list + '. The mod needs an update; to run it anyway, set IGNORE_VERSION_CHECK = true in mods/seeds-info.js.');
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
