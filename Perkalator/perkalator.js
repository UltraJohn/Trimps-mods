// Trimps – Perkalator 2.0.0 (Steam mod, formerly Nice Perks)
//
// Adds a perk preset list and an Optimize button next to Cancel and Respec in the Portal and
// View Perks windows. Optimize works out the best perks for the chosen preset (Perky in
// Universe 1, Surky in Universe 2) straight from the game, uses your respec if one is available,
// and fills the perks in through the game's own Import Perks step. Nothing is kept until you
// press Confirm (or Activate Portal); Cancel throws it away. Turn it off in Settings > Mods.
//
// Also colours the change the game shows after a perk level while you change perks, such as
// "(+15)" in green and "(-3)" in red (Perk Change Colors in Settings > Mods).
//
// The optimizers are not ours:
//   Perky by Grimy (https://github.com/Grimy/Grimy.github.io, WTFPL).
//   Surky by surströmming.
//   Both as adapted to run inside the game by SadAugust in AutoTrimps
//   (https://github.com/SadAugust/AutoTrimps, mods/perky.js and mods/surky.js at commit 0cf73d4,
//   GPL-3.0). The maths below is copied from there with the page inputs replaced by values read
//   from the game, so this file is under the GPL-3.0 too (https://www.gnu.org/licenses/gpl-3.0).
//   Changes: no input boxes, locked perks, jQuery or golden upgrade advice; the target zone and
//   the Surky run values come from the game; Surky's Radon per run uses this run only (no history);
//   Surky's own getExoticChance no longer replaces the game's function; small fixes for undeclared
//   variables and the trinket count (props.zone was never set, now the target zone). Four Surky
//   details follow the Surky site (nsheetz.github.io/perks) again instead of SadAugust's copy:
//   Pheromones are worth nothing at the breed cap (3, not 3.001), no Bait dump, Bait is valued for
//   the Trappa preset before the run starts, and Potions of Finding default to 0.
//
// The game files are never changed. Two game functions are called (not wrapped): respecPerks and
// importPerks. Both are compared with a fingerprint of the version this was made for; if a Trimps
// update changed one, Optimize stays off and its tooltip says why. Set IGNORE_VERSION_CHECK = true
// to use them anyway. One game function is wrapped (the wrapper calls the game's original, then
// adds one step): updatePerkLevel, to colour the change. It is fingerprinted the same way; if it
// changed, the colours stay off and a warning says so.
//
// Needs Trimps Mod Loader (mods/mods.js).

(function () {
	'use strict';

	const VERSION = '2.0.0';
	const IGNORE_VERSION_CHECK = false;
	const FINGERPRINTS = {
		respecPerks: 'd7dac3ed',
		importPerks: 'eae4dedc',
	};

	/* ------------------------------------------------------------------ Presets */
	// Universe 1 (Perky). Weights: helium, attack, health, Fluffy xp, population.
	const PERKY_PRESETS = [
		{ group: 'Zones', key: 'early', name: 'Z1-59', w: [5, 4, 3, 2.4], hze: 0, show: 0, text: 'For progressing through the first 60 zones.' },
		{ group: 'Zones', key: 'broken', name: 'Z60-99', w: [7, 3, 1, 2.2], hze: 59, show: 0, text: 'For zones 60-99.' },
		{ group: 'Zones', key: 'mid', name: 'Z100-180', w: [16, 5, 1, 4.4], hze: 99, show: 59, text: 'For zones 100-180.' },
		{ group: 'Zones', key: 'corruption', name: 'Z181-229', w: [25, 7, 1, 6.6], hze: 179, show: 99, text: 'For zones 181-229.' },
		{ group: 'Zones', key: 'magma', name: 'Z230-280', w: [35, 4, 3, 8], hze: 229, show: 179, text: 'For zones 230-280.' },
		{ group: 'Zones', key: 'z280', name: 'Z280-400', w: [42, 6, 1, 10], hze: 279, show: 229, text: 'For zones 280-400.' },
		{ group: 'Zones', key: 'z400', name: 'Z400-450', w: [88, 10, 1, 20], hze: 399, show: 279, text: 'For zones 400-450.' },
		{ group: 'Zones', key: 'z450', name: 'Z450+', w: [500, 50, 1, 110], hze: 449, show: 399, text: 'For zones 450 and up.' },
		{ group: 'Challenges', key: 'metal', name: 'Metal²', w: [0, 7, 1, 0], hze: 24, show: 0, text: 'Respec for the Metal² challenge.' },
		{ group: 'Challenges', key: 'scientist', name: 'Scientist', w: [0, 1, 3, 0], hze: 39, show: 34, text: 'Respec for the Scientist challenge.' },
		{ group: 'Challenges', key: 'trimp', name: 'Trimp²', w: [0, 99, 1, 0], hze: 59, show: 54, text: 'Respec for the Trimp² challenge.' },
		{ group: 'Challenges', key: 'trappercarp', name: 'Trapper² (initial)', w: [0, 0, 0, 0], hze: 69, show: 59, text: 'Max Carpentry when starting the Trapper² challenge.' },
		{ group: 'Challenges', key: 'trapper', name: 'Trapper² (respec)', w: [0, 7, 1, 0], hze: 69, show: 59, text: 'Respec during Trapper², after starting it with the initial preset.' },
		{ group: 'Challenges', key: 'coord', name: 'Coordinate²', w: [0, 40, 1, 0], hze: 119, show: 114, text: 'Respec for the Coordinate² challenge.' },
		{ group: 'Challenges', key: 'experience', name: 'Experience', w: [1, 50, 1, 500], hze: 599, show: 459, text: 'Respec for the Experience challenge.' },
		{ group: 'Challenges', key: 'c2', name: 'Other c²', w: [0, 7, 1, 1], hze: 64, show: 59, text: 'Respec for the other c² challenges.' },
		{ group: 'Special', key: 'spire', name: 'Spire respec', w: [0, 1, 1, 0], hze: 199, show: 169, text: 'Mid-run respec for the Spire, once you are done farming for it. Best during the first Spire.' },
		{ group: 'Special', key: 'income', name: 'Income', w: [0, 0, 0, 0], hze: 199, show: 169, text: 'Respec for resource income.' },
		{ group: 'Feats', key: 'tent', name: 'Tent City', w: [5, 4, 3, 0], hze: 74, show: 74, text: 'Respec for the Tent City feat.' },
		{ group: 'Feats', key: 'nerfed', name: 'Nerfed', w: [0, 4, 3, 0], hze: 199, show: 199, text: 'Respec for the Nerfed feat.' },
		{ group: 'Feats', key: 'nerfeder', name: 'Nerfeder', w: [0, 1, 0, 0], hze: 299, show: 299, text: 'Respec for the Nerfeder feat.' },
		{ group: 'Feats', key: 'unessenceted', name: 'Unessenceted', w: [0, 1, 0, 0], hze: 179, show: 179, text: 'Respec for the Unessenceted feat.' },
	];

	// Universe 2 (Surky). Weights: attack (clear), health (survival), radon.
	const SURKY_PRESETS = [
		{ group: 'Runs', key: 'ezfarm', name: 'Easy Radon Challenge', w: [0, 0, 1], hze: 0, show: 0, text: 'You can easily finish your Radon challenge at its minimum zone without Golden Battle.' },
		{ group: 'Runs', key: 'tufarm', name: 'Difficult Radon Challenge', w: [1, 0.5, 15], hze: 0, show: 0, text: 'You need some pushing power to finish your Radon challenge. Usually right when you first start a new one.' },
		{ group: 'Runs', key: 'push', name: 'Push/C³/Mayhem', w: [1, 1, 0], hze: 0, show: 0, text: 'Pushing runs. Best with Golden Battle upgrades.' },
		{ group: 'Challenges', key: 'downsize', name: 'Downsize³', w: [1, 1, 0], hze: 19, show: 0, text: 'Each housing building gives only 1 Trimp.' },
		{ group: 'Challenges', key: 'duel', name: 'Duel³', w: [1, 0.2, 0], hze: 44, show: 39, text: 'Values crit chance below 100% in Duel. A small effect that only matters for Criticality.' },
		{ group: 'Challenges', key: 'trappacarp', name: 'Trappa Carp', w: [1, 0, 0], hze: 49, show: 44, text: 'Max Carpentry when starting Trappa, if the starting population matters next to what you can trap.' },
		{ group: 'Challenges', key: 'trappa', name: 'Trappa³', w: [1, 1.5, 0], hze: 49, show: 44, text: 'Starting Trappa, or after starting it with Trappa Carp. Counts on 5 hours of trapping.' },
		{ group: 'Challenges', key: 'berserk', name: 'Berserk³', w: [1, 0.5, 0], hze: 114, show: 109, text: 'Never buys Frenzy.' },
		{ group: 'Challenges', key: 'alchemy', name: 'Alchemy', w: [1, 0.01, 10], hze: 154, show: 134, text: 'Values trinket drops with Potions of Finding.' },
		{ group: 'Challenges', key: 'smithless', name: 'Smithless³', w: [1, 0.5, 0], hze: 199, show: 174, text: 'Never buys Smithology, and Smithies count for nothing.' },
		{ group: 'Special', key: 'combat', name: 'Combat Respec', w: [1, 0.1, 0], hze: 0, show: 0, text: 'Mid-run respec for the most attack and health with your current equipment and population. Ignores Radon. In Trappa, only after sending your last army.' },
		{ group: 'Special', key: 'combatRadon', name: 'Radon Combat Respec', w: [1, 0.5, 15], hze: 0, show: 0, text: 'Like Combat Respec, but still values Radon.' },
		{ group: 'Special', key: 'equip', name: 'Equipment farming', w: [1, 0, 0], hze: 0, show: 0, text: 'Only equipment buying power, including zone progress for more speed books.' },
		{ group: 'Special', key: 'resminus', name: 'Resources (-maps)', w: [1, 0, 0], hze: 0, show: 0, text: 'Only resources from maps below your zone.' },
		{ group: 'Special', key: 'resplus', name: 'Resources (+maps)', w: [1, 0, 0], hze: 0, show: 0, text: 'Only resources from maps above your zone.' },
	];

	// The chosen preset is kept in the save (hidden settings). Index 0 = not chosen yet.
	const PRESET_KEYS = {
		1: 'nfPerkyPreset',
		2: 'nfSurkyPreset',
	};
	function presetsFor(universe) { return universe === 2 ? SURKY_PRESETS : PERKY_PRESETS; }
	function calcName(universe) { return universe === 2 ? 'Surky' : 'Perky'; }

	function hze(universe) {
		return typeof getHighestLevelCleared === 'function' ? getHighestLevelCleared(true) : (universe === 2 ? game.global.highestRadonLevelCleared : game.global.highestLevelCleared);
	}
	function presetUsable(p, universe) { return hze(universe) >= p.hze; }
	function presetShown(p, universe) { return hze(universe) >= p.show; }

	function defaultPreset(universe) {
		const list = presetsFor(universe);
		if (universe === 2) return list[0];
		let best = list[0];
		list.forEach(function (p) { if (p.group === 'Zones' && presetUsable(p, universe)) best = p; });
		return best;
	}

	function chosenPreset(universe) {
		const list = presetsFor(universe);
		const index = TrimpsModLoader.value(PRESET_KEYS[universe]);
		const p = index > 0 ? list[index - 1] : null;
		return p && presetShown(p, universe) ? p : defaultPreset(universe);
	}

	function setPreset(universe, key) {
		const list = presetsFor(universe);
		for (let i = 0; i < list.length; i++) {
			if (list[i].key === key) TrimpsModLoader.setValue(PRESET_KEYS[universe], i + 1);
		}
	}

	// Last zone to clear: where this run is (or ended), else where the last run in that
	// universe portalled.
	function targetZone(universe) {
		const g = game.global;
		const last = universe === 2 ? g.lastRadonPortal : g.lastPortal;
		let zone = g.universe === universe ? Math.max(g.world, last || 0) : (last || 0);
		if (!(zone > 0)) zone = universe === 2 ? Math.max(20, g.highestRadonLevelCleared + 1) : g.highestLevelCleared + 1;
		return Math.max(1, zone);
	}

	/* ------------------------------------------------------------------ Shared helpers */
	function masteryPurchased(name) {
		return !!(game.talents[name] && game.talents[name].purchased);
	}

	function isChallenge(name) {
		return typeof challengeActive === 'function' ? challengeActive(name) : game.global.challengeActive === name;
	}

	function noRespec() {
		return !game.global.canRespecPerks || (game.global.viewingUpgrades && !game.global.respecActive);
	}

	/* ------------------------------------------------------------------ Perky (Universe 1) */
	function PerkyPerk(perkName, scaling) {
		const p = game.portal[perkName];
		this.name = perkName;
		this.base_cost = p.priceBase;
		this.cost_increment = p.additive ? p.additiveInc : 0;
		this.scaling = scaling;
		this.max_level = p.max ? p.max : Infinity;
		this.cost_exponent = p.specialGrowth ? p.specialGrowth : 1.3;
		this.locked = p.locked;
		this.level = 0;
		this.min_level = noRespec() ? p.level : 0;
		this.gain = 0;
		this.bonus = 1;
		this.cost = this.base_cost;
	}
	PerkyPerk.prototype.levellable = function (he_left) {
		return !this.locked && this.level < this.max_level && this.cost * Math.max(1, Math.floor(this.level / 1e12)) <= he_left;
	};
	PerkyPerk.prototype.level_up = function (amount) {
		this.level += amount;
		this.bonus = this.scaling(this.level);
		let spent = this.cost;
		if (this.cost_increment) {
			spent = amount * (this.cost + (this.cost_increment * (amount - 1)) / 2);
			this.cost += amount * this.cost_increment;
		} else {
			this.cost = Math.ceil(this.level / 2 + this.base_cost * Math.pow(this.cost_exponent, this.level));
		}
		return spent;
	};
	PerkyPerk.prototype.log_ratio = function () {
		if (this.cost_increment) return (this.scaling(1) - this.scaling(0)) / this.bonus;
		return Math.log(this.scaling(this.level + 1) / this.bonus);
	};

	function perkyDgPopGain() {
		const gu = game.generatorUpgrades;
		const pgu = game.permanentGeneratorUpgrades;
		const maxZone = game.stats.highestLevel.valueTotal() / 2 + 115;
		const efficiency = 5e8 + 5e7 * gu.Efficiency.upgrades;
		const capacity = 3 + 0.4 * gu.Capacity.upgrades;
		const maxFuel = pgu.Storage.owned ? capacity * 1.5 : capacity;
		const supply = 230 + 2 * gu.Supply.upgrades;
		const overclock = gu.Overclocker.upgrades && 1 - 0.5 * Math.pow(0.99, gu.Overclocker.upgrades - 1);
		const burnRate = pgu.Slowburn.owned ? 0.4 : 0.5;
		const cells = masteryPurchased('magmaFlow') ? 18 : 16;
		const acceleration = masteryPurchased('quickGen') ? 1.03 : 1.02;
		const hyperspeed2 = masteryPurchased('hyperspeed2') ? game.stats.highestLevel.valueTotal() / 2 : 0;
		const blacksmith = 0.5 * masteryPurchased('blacksmith') + 0.25 * masteryPurchased('blacksmith2') + 0.15 * masteryPurchased('blacksmith3');
		const blacksmithTotal = blacksmith * game.stats.highestLevel.valueTotal();
		let housing = 0;
		let fuel = 0;
		let time = 0;
		for (let zone = 230; zone <= maxZone; ++zone) {
			fuel += cells * (0.01 * Math.min(zone, supply) - 2.1);
			const tickTime = Math.ceil(60 / Math.pow(acceleration, Math.floor((zone - 230) / 3)));
			time += zone > blacksmithTotal ? 28 : zone > hyperspeed2 ? 20 : 15;
			while (time >= tickTime) {
				time -= tickTime;
				housing += efficiency * Math.sqrt(Math.min(capacity, fuel));
				fuel = Math.max(0, fuel - burnRate);
			}
			while (fuel > maxFuel) {
				housing += overclock * efficiency * Math.sqrt(Math.min(capacity, fuel));
				fuel = Math.max(0, fuel - burnRate);
			}
			housing *= 1.009;
		}
		while (fuel >= burnRate) {
			housing += efficiency * Math.sqrt(Math.min(capacity, fuel));
			fuel = Math.max(0, fuel - burnRate);
		}
		return Math.floor(housing);
	}

	function perkyParsePerks() {
		const add = function (x) { return function (level) { return 1 + x * 0.01 * level; }; };
		const mult = function (x) { return function (level) { return Math.pow(1 + x * 0.01, level); }; };
		const perkData = {
			Looting_II: add(0.25), Carpentry_II: add(0.25), Motivation_II: add(1), Power_II: add(1), Toughness_II: add(1),
			Capable: function () { return 1; },
			Cunning: add(25), Curious: add(160), Classy: mult(4.5678375), Overkill: add(500), Resourceful: mult(-5),
			Coordinated: mult(-2), Siphonology: function (level) { return Math.pow(1 + level, 0.1); }, Anticipation: add(6),
			Resilience: mult(10), Meditation: add(1), Relentlessness: function (level) { return 1 + 0.05 * level * (1 + 0.3 * level); },
			Carpentry: mult(10), Artisanistry: mult(-5), Range: add(1), Agility: mult(-5), Bait: add(100), Trumps: add(20),
			Pheromones: add(10), Packrat: add(20), Motivation: add(5), Power: add(5), Toughness: add(5), Looting: add(5),
		};
		const perks = {};
		Object.keys(perkData).forEach(function (name) { perks[name] = new PerkyPerk(name, perkData[name]); });
		return perks;
	}

	function perkyGetPerkBuyCount(perkObj, heliumModifier) {
		const perk = game.portal[perkObj.name];
		let heliumAvailable = noRespec() ? game.resources.helium.respecMax : game.global.totalHeliumEarned;
		heliumAvailable *= heliumModifier;
		const perkLevels = noRespec() ? getPerkLevel(perkObj.name, true) + perk.levelTemp : 0;
		const priceBase = perk.priceBase;
		let toBuy = 0;
		if (!perk.additive) {
			const growth = perk.specialGrowth ? perk.specialGrowth : 1.3;
			let toSpend = 0;
			while (toBuy < 1000 && toSpend < heliumAvailable) {
				const nextLevel = perkLevels + toBuy;
				toSpend += Math.ceil(nextLevel / 2 + priceBase * Math.pow(growth, nextLevel));
				if (isNumberBad(toSpend)) return perkObj.min_level;
				toBuy++;
			}
			toBuy--;
		} else {
			const increase = perk.additiveInc;
			const nextPurchaseCost = priceBase + perkLevels * increase;
			const A = increase / 2;
			const B = nextPurchaseCost - A;
			const C = heliumAvailable * -1;
			toBuy = Math.floor((B * -1 + Math.sqrt(Math.pow(B, 2) - 4 * A * C)) / (2 * A));
		}
		if (toBuy <= 0) toBuy = 0;
		if (perk.max && toBuy > perk.max) toBuy = perk.max - perkLevels;
		return toBuy;
	}

	function perkyInput(preset) {
		const zone = Math.min(targetZone(1), getObsidianStart());
		const hzeTotal = game.stats.highestLevel.valueTotal();
		const spires = Math.min(Math.floor((zone - 101) / 100), game.global.spiresCompleted);
		const turkimpTimer = masteryPurchased('turkimp2') ? 1 : masteryPurchased('turkimp') ? 0.4 : 0.25;
		const cache = hzeTotal < 60 ? 0 : hzeTotal < 85 ? 7 : hzeTotal < 160 ? 10 : hzeTotal < 185 ? 14 : 20;
		let prod = 1 + turkimpTimer;
		let loot = 1 + 0.333 * turkimpTimer;
		loot *= hzeTotal < 100 ? 0.7 : 1 + (masteryPurchased('stillRowing') ? 0.3 : 0.2) * spires;
		let chronojest = 27 * game.unlocks.imps.Jestimp + 15 * game.unlocks.imps.Chronoimp;
		(game.global.StaffEquipped.mods || []).forEach(function (mod) {
			if (mod[0] === 'MinerSpeed' || mod[0] === 'allMetal') prod *= 1 + 0.01 * mod[1];
			else if (mod[0] === 'metalDrop') loot *= 1 + 0.01 * mod[1];
		});
		chronojest += (masteryPurchased('mapLoot2') ? 5 : 4) * cache;
		const w = preset.w;
		const result = {
			total_he: countHeliumSpent(false, true) + game.global.heliumLeftover + (portalWindowOpen ? game.resources.helium.owned : 0),
			zone: zone,
			perks: perkyParsePerks(),
			weight: { helium: w[0], attack: w[1], health: w[2], xp: w[3], trimps: w[4] || 0, income: 0 },
			fluffy: { xp: game.global.fluffyExp, prestige: game.global.fluffyPrestige },
			mod: {
				storage: 0.125,
				soldiers: 0,
				dg: perkyDgPopGain(),
				scaff: autoBattle.bonuses.Scaffolding.getMult(),
				tent_city: preset.key === 'tent',
				whip: game.unlocks.imps.Whipimp,
				magn: game.unlocks.imps.Magnimp,
				taunt: game.unlocks.imps.Tauntimp,
				ven: game.unlocks.imps.Venimp,
				chronojest: chronojest,
				prod: prod,
				loot: loot,
				breed_timer: masteryPurchased('patience') ? 45 : 30,
				army_mod: game.resources.trimps.maxMod,
			},
		};
		const key = preset.key;
		if (key === 'nerfed') { result.total_he = 1e8 - 1e4; result.zone = 200; result.mod.dg = 0; }
		if (key === 'trapper') {
			result.mod.soldiers = game.resources.trimps.owned;
			result.mod.prod = 0;
			result.perks.Pheromones.max_level = 0;
			result.perks.Anticipation.max_level = 0;
		}
		if (key === 'spire') { result.mod.prod = 0; result.mod.loot = 0; result.perks.Overkill.max_level = 0; result.zone = game.global.world; }
		if (key === 'trappercarp') { result.mod.prod = 0; result.mod.loot = 0; result.weight.trimps = 1e6; }
		if (key === 'metal') result.mod.prod = 0;
		if (key === 'trimp') result.mod.soldiers = 1;
		if (key === 'nerfed') result.perks.Overkill.max_level = 1;
		if (key === 'scientist') result.perks.Coordinated.max_level = 0;
		if (key === 'income') result.weight = { income: 3, trimps: 3, attack: 1, helium: 0, health: 0, xp: 0 };
		if (key === 'unessenceted') { result.total_he = 0; result.zone = 181; }
		if (key === 'nerfeder') { result.total_he = 1e9 - 1e5; result.zone = 300; }
		return result;
	}

	function perkyOptimize(preset) {
		const params = perkyInput(preset);
		const total_he = params.total_he, zone = params.zone, fluffy = params.fluffy, perks = params.perks, weight = params.weight, mod = params.mod;
		const Looting_II = perks.Looting_II, Carpentry_II = perks.Carpentry_II, Motivation_II = perks.Motivation_II, Power_II = perks.Power_II,
			Toughness_II = perks.Toughness_II, Capable = perks.Capable, Cunning = perks.Cunning, Curious = perks.Curious, Classy = perks.Classy,
			Overkill = perks.Overkill, Resourceful = perks.Resourceful, Coordinated = perks.Coordinated, Siphonology = perks.Siphonology,
			Anticipation = perks.Anticipation, Resilience = perks.Resilience, Meditation = perks.Meditation, Relentlessness = perks.Relentlessness,
			Carpentry = perks.Carpentry, Artisanistry = perks.Artisanistry, Range = perks.Range, Agility = perks.Agility, Bait = perks.Bait,
			Trumps = perks.Trumps, Pheromones = perks.Pheromones, Packrat = perks.Packrat, Motivation = perks.Motivation, Power = perks.Power,
			Toughness = perks.Toughness, Looting = perks.Looting;

		['whip', 'magn', 'taunt', 'ven'].forEach(function (name) { mod[name] = Math.pow(1.003, zone * 99 * 0.03 * mod[name]); });

		const books = Math.pow(1.25, zone) * Math.pow(zone > 100 ? 1.28 : 1.2, Math.max(zone - 59, 0));
		const gigas = Math.max(0, Math.min(zone - 60, zone / 2 - 25, zone / 3 - 12, zone / 5, zone / 10 + 17, 39));
		const base_housing = Math.pow(1.25, 5 + Math.min(zone / 2, 30) + gigas);
		const mystic = zone >= 25 ? Math.floor(Math.min(zone / 5, 9 + zone / 25, 15)) : 0;
		const tacular = (20 + zone - (zone % 5)) / 100;
		const base_income = 600 * mod.whip * books;
		const base_helium = Math.pow(zone - 19, 2);
		const max_tiers = zone / 5 + +((zone - 1) % 10 < 5);

		const exponents = {
			cost: Math.pow(1.069, 0.85 * (zone < 60 ? 57 : 53)),
			attack: Math.pow(1.19, 13),
			health: Math.pow(1.19, 14),
			block: Math.pow(1.19, 10),
		};
		const weightSum = weight.attack + weight.health;
		const equip_cost = {
			attack: (211 * weightSum) / weight.attack,
			health: (248 * weightSum) / weight.health,
			block: (5 * weightSum) / weight.health,
		};
		let he_left = total_he;

		function ticks() { return 1 + +(Agility.bonus > 0.9) + Math.ceil(10 * Agility.bonus); }
		function moti() { return Motivation.bonus * Motivation_II.bonus * Meditation.bonus; }
		function looting() { return Looting.bonus * Looting_II.bonus; }
		function gem_income() {
			const drag = moti() * mod.whip;
			const loot = looting() * mod.magn * 0.75 * 0.8;
			const cj = (mod.chronojest * drag * loot) / 30;
			return drag + loot + cj;
		}
		const trimps = mod.tent_city
			? function () {
				const carp = Carpentry.bonus * Carpentry_II.bonus;
				const territory = Trumps.bonus;
				return 10 * (mod.taunt + territory * (mod.taunt - 1) * 111) * carp;
			}
			: function () {
				const carp = Carpentry.bonus * Carpentry_II.bonus;
				const bonus = 3 + Math.log((base_housing * gem_income()) / Resourceful.bonus) / Math.log(1.4);
				const territory = Trumps.bonus * zone;
				return 10 * (base_housing * bonus + territory) * carp * mod.taunt + mod.dg * mod.scaff * carp;
			};
		function income(ignore_prod) {
			const storage = (mod.storage * Resourceful.bonus) / Packrat.bonus;
			const loot = (looting() * mod.magn) / ticks();
			const prod = ignore_prod ? 0 : moti() * mod.prod;
			const cj = mod.chronojest * 0.1 * prod * loot;
			return base_income * (prod + loot * mod.loot + cj) * (1 - storage) * trimps();
		}
		function equip(stat) {
			const cost = equip_cost[stat] * Artisanistry.bonus;
			let levels = 1.136;
			let tiers = Math.log(1 + income() / cost) / Math.log(exponents.cost);
			if (tiers > max_tiers + 0.45) {
				levels = Math.log(1 + Math.pow(exponents.cost, tiers - max_tiers) * 0.2) / Math.log(1.2);
				tiers = max_tiers;
			}
			return levels * Math.pow(exponents[stat], tiers);
		}
		// Number of buildings of a kind that the current income buys (cost: base cost, exp: cost growth).
		function building(cost, exp) {
			cost *= 4 * Resourceful.bonus;
			return Math.log(1 + (income(true) * (exp - 1)) / cost) / Math.log(exp);
		}
		function magma() { return Math.max(zone - 229, 0); }
		function breed() {
			const nurseries = building(2e6, 1.06) / (1 + 0.1 * Math.min(magma(), 20));
			const potency = 0.0085 * (zone >= 60 ? 0.1 : 1) * Math.pow(1.1, Math.floor(zone / 5));
			return potency * Math.pow(1.01, nurseries) * Pheromones.bonus * mod.ven;
		}
		const group_size = [];
		for (let coord = 0; coord <= Math.log(1 + he_left / 5e5) / Math.log(1.3); ++coord) {
			const ratio_1 = 1 + 0.25 * Math.pow(0.98, coord);
			const available_coords = zone - 1 + (magma() ? 100 : 0);
			let result = 1;
			for (let i = 0; i < available_coords; ++i) result = Math.ceil(result * ratio_1);
			group_size[coord] = result;
		}
		function soldiers() {
			const ratio = 1 + 0.25 * Coordinated.bonus;
			let pop = (mod.soldiers || trimps()) / 3;
			if (game.global.viewingUpgrades) pop *= mod.army_mod;
			if (mod.soldiers > 1) pop += 36000 * Bait.bonus;
			const unbought_coords = Math.max(0, Math.log(group_size[Coordinated.level] / pop) / Math.log(ratio));
			return group_size[0] * Math.pow(1.25, -unbought_coords);
		}
		function gators() {
			if (zone < 230 || mod.soldiers > 1) return 0;
			const ooms = Math.log(trimps() / group_size[Coordinated.level]) / Math.log(10);
			return Math.max(0, (ooms - 7 + Math.floor((zone - 215) / 100)) / 3);
		}
		function attack() {
			const gatorCount = gators();
			let atk = (0.15 + equip('attack')) * Math.pow(0.8, magma());
			atk *= Power.bonus * Power_II.bonus * Relentlessness.bonus;
			atk *= Siphonology.bonus * Range.bonus * Anticipation.bonus;
			atk *= fluffy.attack[Capable.level];
			atk *= masteryPurchased('amalg') ? Math.pow(1.5, gatorCount) : 1 + 0.5 * gatorCount;
			return soldiers() * atk;
		}
		// Total survivability (health and block).
		function health() {
			let hp = (0.6 + equip('health')) * Math.pow(0.8, magma());
			hp *= Toughness.bonus * Toughness_II.bonus * Resilience.bonus;
			const gyms = building(400, 1.185);
			const trainers = (gyms * Math.log(1.185) - Math.log(1 + gyms)) / Math.log(1.1) + 25 - mystic;
			let block = 0.04 * gyms * Math.pow(1 + mystic / 100, gyms) * (1 + tacular * trainers);
			let attacks = 60; // target number of attacks to survive
			const breedTimer = breed();
			const soldier = soldiers();
			if (zone < 70) {
				// no geneticists: ticks needed to repopulate an army
				const timer = Math.log(1 + (soldier * breedTimer) / Bait.bonus) / Math.log(1 + breedTimer);
				attacks = timer / ticks();
			} else {
				const fighting = Math.min(group_size[Coordinated.level] / trimps(), 1 / 3);
				const target_speed = fighting > 1e-9 ? (Math.pow(0.5 / (0.5 - fighting), 0.1 / mod.breed_timer) - 1) * 10 : fighting / mod.breed_timer;
				const geneticists = Math.log(breedTimer / target_speed) / -Math.log(0.98);
				hp *= Math.pow(1.01, geneticists);
				hp *= Math.pow(1.332, gators());
			}
			hp /= attacks;
			if (zone < 60) block += equip('block');
			else block = Math.min(block, 4 * hp);
			return soldier * (block + hp);
		}
		const stats = {
			agility: function () { return 1 / Agility.bonus; },
			helium: function () { return base_helium * looting() + 45; },
			xp: function () { return Cunning.bonus * Curious.bonus * Classy.bonus; },
			attack: attack,
			health: health,
			overkill: function () { return Overkill.bonus; },
			trimps: trimps,
			income: income,
		};
		function score() {
			let result = 0;
			for (const i in weight) {
				if (!weight[i]) continue;
				const stat = stats[i]();
				if (!isFinite(stat)) throw Error(i + ' is ' + stat);
				result += weight[i] * Math.log(stat);
			}
			return result;
		}
		function recompute_marginal_efficiencies() {
			const baseline = score();
			for (const name in perks) {
				const perk = perks[name];
				if (perk.cost_increment || !perk.levellable(he_left)) continue;
				perk.level_up(1);
				perk.gain = score() - baseline;
				perk.level_up(-1);
			}
			['Looting', 'Carpentry', 'Motivation', 'Power', 'Toughness'].forEach(function (name) {
				const perk = perks[name];
				let resetGain = false;
				if (perk.gain === 0) {
					perk.level_up(1);
					perk.gain = score() - baseline;
					perk.level_up(-1);
					resetGain = true;
				}
				const perkII = perks[name + '_II'];
				perkII.gain = (perk.gain * perkII.log_ratio()) / perk.log_ratio();
				if (resetGain) perk.gain = 0;
			});
		}
		function solve_quadratic_equation(a, b, c) {
			const delta = b * b - 4 * a * c;
			return (-b + Math.sqrt(delta)) / (2 * a);
		}
		function spend_he(perk, budget) {
			perk.gain /= perk.log_ratio();
			if (perk.cost_increment) {
				const ratio_2 = (1 + perk.level) / (1000 + Looting_II.level + Carpentry_II.level + Motivation_II.level + Power_II.level + Toughness_II.level);
				budget *= 0.5 * Math.pow(ratio_2, 2);
				const x = solve_quadratic_equation(perk.cost_increment / 2, perk.cost - perk.cost_increment / 2, -budget);
				const levelsToBuy = Math.floor(Math.max(Math.min(x, perk.max_level - perk.level), 1, perk.level / 1e12));
				he_left -= perk.level_up(levelsToBuy);
			} else {
				budget = Math.pow(budget, 0.5);
				do he_left -= perk.level_up(1);
				while (perk.cost < budget && perk.level < perk.max_level);
			}
			perk.gain *= perk.log_ratio();
		}

		mod.loot *= 20.8;
		weight.agility = (weight.helium + weight.attack) / 2;
		weight.overkill = 0.25 * weight.attack * (2 - Math.pow(0.9, weight.helium / weight.attack));

		if (preset.key !== 'unessenceted') Agility.min_level = perkyGetPerkBuyCount(Agility, 0.02);
		if (mod.soldiers <= 1 && Bait.min_level === 0) {
			if (zone > 90) Bait.max_level = 0;
			else if (Bait.max_level === Infinity) Bait.min_level = perkyGetPerkBuyCount(Bait, 0.001);
		}
		if (game.portal.Carpentry.locked) {
			Bait.min_level = 1;
			if (preset.key !== 'trapper') Pheromones.min_level = 1;
		}
		if (game.global.viewingUpgrades) Coordinated.min_level = game.portal.Coordinated.level;

		fluffy.attack = [];
		const potential = Math.log((0.003 * fluffy.xp) / Math.pow(5, fluffy.prestige) + 1) / Math.log(4);
		for (let cap = 0; cap <= 10; ++cap) {
			const level = Math.min(Math.floor(potential), cap);
			const progress = level === cap ? 0 : (Math.pow(4, potential - level) - 1) / 3;
			fluffy.attack[cap] = 1 + Math.pow(5, fluffy.prestige) * 0.1 * (level / 2 + progress) * (level + 1);
		}

		for (const name in perks) {
			const perk = perks[name];
			if (perk.cost_increment) he_left -= perk.level_up(perk.min_level);
			else while (perk.level < perk.min_level) he_left -= perk.level_up(1);
		}

		let ratio = 0.25;
		while (Capable.levellable(he_left * ratio)) {
			he_left -= Capable.level_up(1);
			ratio = Capable.level <= Math.floor(potential) && zone > 300 && weight.xp > 0 ? 0.25 : 0.01;
		}
		if (zone <= 300 || potential >= Capable.level) weight.xp = 0;

		// main loop
		const sorted_perks = Object.keys(perks).map(function (name) { return perks[name]; }).filter(function (perk) { return perk.levellable(he_left); });
		const reference_he = he_left;
		for (let x = 0.999; x > 1e-12; x *= x) {
			const he_target = reference_he * x;
			recompute_marginal_efficiencies();
			sorted_perks.sort(function (a, b) { return b.gain / b.cost - a.gain / a.cost; });
			while (he_left > he_target && sorted_perks.length) {
				const best = sorted_perks.shift();
				if (!best.levellable(he_left)) continue;
				spend_he(best, he_left - he_target);
				let i = 0;
				while (sorted_perks[i] && sorted_perks[i].gain / sorted_perks[i].cost > best.gain / best.cost) i++;
				sorted_perks.splice(i, 0, best);
			}
		}
		if (he_left + 1 < total_he / 1e12 && Toughness_II.level > 0) {
			--Toughness_II.level;
			he_left += Toughness_II.cost;
		}

		const levels = {};
		Object.keys(perks).forEach(function (name) { levels[name] = perks[name].level; });
		return levels;
	}

	/* ------------------------------------------------------------------ Surky (Universe 2) */
	function surkyExoticChance() {
		let exoticChance = 3;
		if (Fluffy.isRewardActive('exotic')) exoticChance += 0.5;
		if (game.permaBoneBonuses.exotic.owned > 0) exoticChance += game.permaBoneBonuses.exotic.addChance();
		return exoticChance;
	}

	function surkyInitPerks(preset) {
		const props = {
			radonSpent: 0,
			radonPerRun: 0,
			radonPerTrinket: 0,
			trinketRadonPerRun: 0,
			baselineTrinketsNext: 0,
			collectHubs: !autoBattle.oneTimers.Collectology.owned ? 1 : autoBattle.oneTimers.Collectology.getHubs(),
			tenacityTime: 10,
			trapHrs: 5,
			shinyTable: [0],
			clearWeight: preset.w[0],
			survivalWeight: preset.w[1],
			radonWeight: preset.w[2],
			coefC: 0,
			termR: 0,
			hazzie: false,
			shieldCD: 0,
			shieldPrismal: 0,
			healthDerate: 1,
			specialChallenge: preset.key,
			runningTrappa: isChallenge('Trappapalooza'),
			trappaStartPop: 1,
			scaffMult: autoBattle.bonuses.Scaffolding.getMult(),
			mutationMult: u2Mutations.tree.Trimps.purchased ? 1.5 : 1,
			expandingTauntimp: game.global.expandingTauntimp,
			hubsEnabled: game.global.exterminateDone,
			glassCap: 400,
			potency: 0.0085,
			carpNeeded: 0,
			bestPerk: '',
		};
		const definePerk = function (effect) {
			const perk = { optimize: true, level: 0 };
			if (effect !== undefined) perk.effect = effect;
			return perk;
		};
		const perks = {
			Agility: definePerk(),
			Artisanistry: definePerk(1 / 0.95),
			Bait: definePerk(),
			Carpentry: definePerk(1.1),
			Championism: definePerk(0),
			Criticality: definePerk(0.1),
			Equality: definePerk(1 / 0.9),
			Expansion: definePerk(1),
			Frenzy: definePerk(0.5),
			Greed: definePerk(0),
			Hunger: definePerk(),
			Looting: definePerk(0.05),
			Masterfulness: definePerk(1),
			Motivation: definePerk(0.05),
			Observation: definePerk(),
			Packrat: definePerk(0.2),
			Pheromones: definePerk(0.1),
			Power: definePerk(0.05),
			Prismal: definePerk(0.01),
			Range: definePerk(),
			Resilience: definePerk(1.1),
			Smithology: definePerk(1),
			Tenacity: definePerk(0),
			Toughness: definePerk(0.05),
			Trumps: definePerk(),
		};
		const efficiencyPerks = ['Artisanistry', 'Carpentry', 'Criticality', 'Equality', 'Frenzy', 'Greed', 'Hunger', 'Looting', 'Motivation', 'Observation', 'Packrat', 'Pheromones', 'Power', 'Prismal', 'Resilience', 'Smithology', 'Toughness', 'Trumps'];
		Object.keys(perks).forEach(function (perkName) {
			const perkData = game.portal[perkName];
			if (!perkData) return;
			const perk = perks[perkName];
			perk.locked = perkData.radLocked;
			perk.priceBase = perkData.priceBase;
			perk.priceFact = perkData.specialGrowth ? perkData.specialGrowth : 1.3;
			if (perkData.max) perk.max = perkData.max;
			if (efficiencyPerks.indexOf(perkName) !== -1) perk.efficiency = 0;
			if (perkName === 'Observation') perk.efficiency2 = 0;
			if (perkName === 'Frenzy') {
				perk.procEffect = 0.001;
				perk.timeEffect = 5;
			}
		});
		const key = preset.key;
		if (key === 'berserk') perks.Frenzy.optimize = false;
		if (key === 'smithless') perks.Smithology.optimize = false;
		perks.Bait.optimize = key === 'trappa';
		perks.Pheromones.optimize = key !== 'trappa' && game.stats.highestRadLevel.valueTotal() >= 60;
		perks.Trumps.optimize = key === 'downsize';
		if (props.runningTrappa && (key === 'combat' || key === 'combatRadon')) {
			perks.Bait.optimize = false;
			perks.Pheromones.optimize = false;
		}
		return [props, perks];
	}

	// Read the current levels (with any unconfirmed changes) into the perks object.
	function surkyResetPerkLevels(perks, skipLevel) {
		Object.keys(perks).forEach(function (key) {
			const value = perks[key];
			if (typeof value !== 'object' || !value.hasOwnProperty('optimize')) return;
			if (game.portal.hasOwnProperty(key)) {
				const portalPerk = game.portal[key];
				if (!skipLevel) value.level = portalPerk.radLevel + (portalPerk.levelTemp ? portalPerk.levelTemp : 0);
			} else {
				value.level = 0;
			}
		});
		return perks;
	}

	// The run values Surky asks for, read from the game: this run's, when it is in Universe 2.
	function surkyRunValues() {
		const inU2 = game.global.universe === 2;
		// Potions of Finding: what you own in Alchemy, else 0 (as on the Surky site).
		let findPots = 0;
		if (isChallenge('Alchemy') && typeof alchObj !== 'undefined') {
			findPots = alchObj.potionsOwned[alchObj.potionNames.indexOf('Potion of Finding')] || 0;
		}
		let radonPerRun = inU2 ? game.resources.radon.owned : 0;
		if (!(radonPerRun >= game.global.totalRadonEarned / 1e6) || !(radonPerRun > 0)) {
			// Not from a U2 run: Surky's fallback guess.
			radonPerRun = game.global.bestRadon / 5;
			if (!(radonPerRun > 30)) radonPerRun = 30;
		}
		return {
			targetZone: targetZone(2),
			weaponLevels: 1,
			armorLevels: 1,
			tributes: inU2 ? game.buildings.Tribute.owned : 0,
			meteorologists: inU2 ? game.jobs.Meteorologist.owned : 0,
			smithyCount: inU2 ? game.buildings.Smithy.owned : 0,
			housingCount: inU2 ? game.buildings.Collector.owned : 0,
			radonPerRun: radonPerRun,
			coordLimited: 0,
			findPots: findPots,
		};
	}

	function surkyInitialLoad(preset, skipLevels) {
		const init = surkyInitPerks(preset);
		const props = init[0];
		const perks = surkyResetPerkLevels(init[1], skipLevels);
		const run = surkyRunValues();
		Object.keys(run).forEach(function (k) { props[k] = run[k]; });
		props.vmZone = Math.max(15, props.targetZone - 1);

		// Scruffy level (adapted from Fluffy.getLevel() in the game source code)
		props.scruffyLevel = Math.floor(Math.log((game.global.fluffyExp2 / 1000) * 3 + 1) / Math.log(4));

		let shield = null;
		if (game.global.universe === 2 && Object.keys(game.global.ShieldEquipped).length !== 0) {
			shield = game.global.ShieldEquipped;
		} else {
			const u2Shield = game.global.lastHeirlooms.u2.Shield;
			if (game.global.ShieldEquipped.id === u2Shield) shield = game.global.ShieldEquipped;
			else shield = game.global.heirloomsCarried.find(function (s) { return s.id === u2Shield; });
		}
		if (shield && Object.keys(shield).length !== 1 && shield.mods) {
			const findMod = function (modName) { return shield.mods.find(function (el) { return el[0] === modName; }); };
			const critDamageMod = findMod('critDamage');
			props.shieldCD = critDamageMod ? Math.round(critDamageMod[1] / 10) : 0;
			const prismalMod = findMod('prismatic');
			props.shieldPrismal = prismalMod ? Math.round(prismalMod[1]) : 0;
			const ineqMod = findMod('inequality');
			props.healthDerate = ineqMod ? Math.log(0.9 + ineqMod[1] / 10000) / Math.log(0.9) : 1;
			props.hazzie = shield.rarity >= 10;
		}
		// Suprism gives 3% prismal shield per SA level
		if (autoBattle.oneTimers.Suprism.owned) props.shieldPrismal += 3 * (autoBattle.maxEnemyLevel - 1);

		props.shinyTable = [0];
		props.radonPerRun = Math.max(1, props.radonPerRun);

		const logEnemyHealthScaling = Math.log(Math.sqrt(3.265) * 1.1 * 1.32);
		const logEnemyAttackScaling = Math.log(Math.sqrt(3.27) * 1.15 * 1.32);
		props.logEnemyScaling = logEnemyHealthScaling + logEnemyAttackScaling + Math.log(1 + 1 / props.targetZone);
		if (props.targetZone >= 300) props.logEnemyScaling += 2 * Math.log(1.15);

		// equipment resource scaling for attack/health from weapon/armor levels
		const wLevScaling = Math.pow((props.weaponLevels + 1) / props.weaponLevels, 1 / Math.log(1.2));
		const aLevScaling = Math.pow((props.armorLevels + 1) / props.armorLevels, 1 / Math.log(1.2));
		props.equipScaling = {
			attack: Math.min(wLevScaling, Math.pow(Math.pow(1.19, 13), 1 / Math.log(Math.pow(1.069, 57 * 0.85)))),
			health: Math.min(aLevScaling, Math.pow(Math.pow(1.19, 14), 1 / Math.log(Math.pow(1.069, 57 * 0.85)))),
		};

		// Tenacity time: short when Radon matters, long when pushing.
		if (props.radonWeight > 0) props.tenacityTime = props.vmZone > 200 ? 40 : 10;
		else props.tenacityTime = 120;
		perks.Tenacity.effect = (function (time) {
			if (time <= 60) time *= 10 / 6;
			else time = (time - 60) * (2 / 6) + 100;
			return 1.1 + Math.floor(time / 4) * 0.01;
		})(props.tenacityTime);

		if (props.coordLimited < 0) props.coordLimited = 0;

		// approximate number of imports of a given type per zone
		const exoticChance = surkyExoticChance();
		const cells = (props.targetZone - 1) * 100;
		let randimpAmt = 1;
		if (u2Mutations.tree.Randimp1 && u2Mutations.tree.Randimp1.purchased) randimpAmt++;
		if (u2Mutations.tree.Randimp2 && u2Mutations.tree.Randimp2.purchased) randimpAmt++;
		let expectedExotics = cells * (exoticChance / 100);
		expectedExotics += (cells * 0.02) / (5 / randimpAmt);
		if (u2Mutations.tree.Tauntimps && u2Mutations.tree.Tauntimps.purchased) expectedExotics += Math.floor(game.global.world / 10) * 2;
		props.impsExpected = Math.floor(expectedExotics);
		props.imperzone = exoticChance + 3.0 / (5 / randimpAmt);

		let breedSpeedMult = 1;
		if (u2Mutations.tree.GeneHealth.purchased) breedSpeedMult /= 50;
		if (u2Mutations.tree.GeneAttack.purchased) breedSpeedMult /= 50;
		props.potency = 0.00085 * Math.pow(1.1, Math.floor(props.targetZone / 5)) * Math.pow(1.003, props.impsExpected) * breedSpeedMult;
		props.glassRadon = game.global.glassDone && props.vmZone > 175;

		// Tauntimp housing correction: population ~ <best housing count> * coefC - termR
		const housingTypes = { collector: [50, 1.12] };
		if (props.hubsEnabled || props.specialChallenge === 'downsize') {
			housingTypes.hut = [1, 1.24];
			housingTypes.house = [1, 1.22];
			housingTypes.mansion = [9, 1.2];
			housingTypes.hotel = [15, 1.18];
			housingTypes.resort = [26, 1.16];
			housingTypes.gateway = [31, 1.14];
		}
		let coefC = 0;
		let termR = 0;
		let typeCount = 0;
		const tauntRate = Math.pow(1.003, props.imperzone);
		Object.keys(housingTypes).forEach(function (key) {
			const startZone = housingTypes[key][0];
			const scaling = housingTypes[key][1];
			const scaleZones = props.targetZone - startZone;
			const houseRate = Math.log(1.25) / Math.log(scaling);
			const taunTemp = Math.pow(tauntRate, scaleZones);
			const tauntRm1 = tauntRate - 1;
			const factor = key === 'collector' ? props.collectHubs : 1;
			coefC += (factor * (taunTemp - 1)) / tauntRm1;
			termR += (factor * tauntRate * houseRate * (taunTemp * (scaleZones * tauntRm1 - 1) + 1)) / (tauntRm1 * tauntRm1);
			typeCount++;
		});
		props.coefC = coefC / typeCount;
		props.termR = termR / typeCount;

		props.perksRadon = countHeliumSpent(false, true) + game.global.radonLeftover + (portalWindowOpen ? game.resources.radon.owned : 0);
		props.radonSpent = surkyTotalPerksCost(perks);
		return [props, perks];
	}

	function surkyTotalPerksCost(perks) {
		let cost = 0;
		Object.keys(perks).forEach(function (name) { cost += surkyPerkCost(name, perks[name].level, true, perks); });
		return cost;
	}

	function surkyPerkCost(whichPerk, numLevels, fromZero, perks) {
		if (numLevels === 0) return 0;
		const perk = perks[whichPerk];
		let level = fromZero ? 0 : perk.level;
		// a perk that can't be levelled costs infinity, so it's never bought
		if (perk.locked || (perk.hasOwnProperty('max') && level + numLevels > perk.max && game.portal[whichPerk].hasOwnProperty('max'))) return Infinity;
		let cost = 0;
		for (let i = 0; i < numLevels; i++) {
			cost += Math.ceil(level / 2 + perk.priceBase * Math.pow(perk.priceFact, level));
			level++;
		}
		return cost;
	}

	function surkyCouldBuyPerk(whichPerk, actuallyBuy, numLevels, props, perks) {
		const perk = perks[whichPerk];
		const canBuy = !perk.hasOwnProperty('max') || perk.level + numLevels <= perk.max;
		const cost = canBuy ? surkyPerkCost(whichPerk, numLevels, false, perks) : Infinity;
		const affordable = cost + props.radonSpent <= props.perksRadon;
		if (canBuy && affordable && actuallyBuy) {
			props.radonSpent += cost;
			perks[whichPerk].level += numLevels;
		}
		return canBuy && affordable;
	}

	function surkyGreedEffect(tribs) {
		tribs = Math.min(tribs, 1250) - 600;
		let mod = 1.025;
		if (tribs > 0) {
			mod += 0.00015 * tribs;
			mod += Math.floor(tribs / 25) * 0.0035;
		}
		return mod;
	}

	// first-order feedback from Greed of a resource boost via more tributes
	function surkyGreedResourceFeedback(resBoost, tribs, perks) {
		if (tribs >= 1250) return [1, tribs];
		let tribsGained = Math.log(resBoost) / Math.log(1.05);
		if (tribs + tribsGained < 600) return [1, tribs];
		if (tribs + tribsGained > 1250) tribsGained = 1250 - tribs;
		if (tribs < 600) tribsGained = tribs + tribsGained - 600;
		const baseGreed = surkyGreedEffect(tribs);
		const greedGain = (baseGreed + 0.00029 * tribsGained) / baseGreed;
		return [Math.pow(greedGain, perks.Greed.level), tribs + tribsGained];
	}

	// Radon-equivalent value of trinkets: the Radon cost of the Motivation/Power/Toughness levels
	// that give the same boost. Returns [value of a run's trinkets at baseline, value of one more
	// trinket, trinkets expected after the next run].
	function surkyTrinketValues(motivCost, powCost, toughCost, props, perks) {
		const obsLevel = Math.max(1, 1 + perks.Observation.level);
		let shinies = game.portal.Observation.trinkets + surkyShinyCollect(perks.Observation.level + 1, props);
		if (game.portal.Observation.trinkets === 0) shinies += 10; // first Obs level gives 10 trinkets
		shinies = Math.min(shinies, obsLevel * 1000);
		const cappedBaseTrinkets = Math.min(game.portal.Observation.trinkets, obsLevel * 1000);
		const marginalShinePerRun = (100 + shinies * obsLevel) / (100 + cappedBaseTrinkets * obsLevel);
		const marginalShinePerTrinket = 1 + obsLevel / (100 + shinies * obsLevel);
		const res = [];
		[marginalShinePerRun, marginalShinePerTrinket].forEach(function (marginalShine) {
			const motF = perks.Motivation.priceFact;
			const motN = (marginalShine - 1) * (20 + perks.Motivation.level);
			const motShineCost = (motivCost / (motF - 1)) * (Math.pow(motF, motN) - 1);
			const powF = perks.Power.priceFact;
			const powN = (marginalShine - 1) * (20 + perks.Power.level);
			const powShineCost = (powCost / (powF - 1)) * (Math.pow(powF, powN) - 1);
			const touF = perks.Toughness.priceFact;
			const touN = (marginalShine - 1) * (20 + perks.Toughness.level);
			const touShineCost = (toughCost / (touF - 1)) * (Math.pow(touF, touN) - 1);
			res.push(motShineCost + powShineCost + touShineCost);
		});
		res.push(shinies);
		return res;
	}

	// Observation: direct power gain at the expected trinkets after the next run, and the extra
	// trinkets from the higher drop rate.
	function surkyObservationGains(levels, props, perks) {
		const obsLevel = 1 + perks.Observation.level;
		let shinies = game.portal.Observation.trinkets + surkyShinyCollect(obsLevel, props);
		shinies = Math.min(shinies, obsLevel * 1000);
		let shiniesNext = game.portal.Observation.trinkets + surkyShinyCollect(obsLevel + levels, props);
		if (game.portal.Observation.trinkets === 0) shiniesNext += 10;
		shiniesNext = Math.min(shiniesNext, (obsLevel + levels) * 1000);
		const directGain = (100 + shiniesNext * (obsLevel + levels)) / (100 + shinies * obsLevel);
		let maxDirectGain = Infinity;
		if (shinies >= obsLevel * 1000) maxDirectGain = (100 + (obsLevel + levels) * (obsLevel + levels) * 1000) / (100 + obsLevel * shinies);
		let moreTrinkets;
		if (game.portal.Observation.trinkets >= (obsLevel + levels) * 1000) moreTrinkets = 0;
		else if (game.portal.Observation.trinkets >= obsLevel * 1000) moreTrinkets = Math.max(0, shiniesNext - game.portal.Observation.trinkets);
		else moreTrinkets = shiniesNext - shinies;
		return [directGain, moreTrinkets, maxDirectGain];
	}

	// One step of applying the gain feedback (Greed, housing, equipment, coords, Meteorologists,
	// pushing, trinkets). See the Surky source for the details of each step.
	function surkyIterateValueFeedback(valueArray, props, perks) {
		let Va = valueArray[0], Vh = valueArray[1], Vm = valueArray[2], Vf = valueArray[3], Vres = valueArray[4], Vrad = valueArray[5],
			Vp = valueArray[6], tribs = valueArray[8], collectors = valueArray[9], mets = valueArray[11], trinketRate = valueArray[12],
			trinkets = valueArray[13], obsLevel = valueArray[14];
		const Ve = valueArray[7];
		const Vpushed = valueArray[15], VmDone = valueArray[16], VfDone = valueArray[17], VresDone = valueArray[18], VpDone = valueArray[19];
		const sc = props.specialChallenge;

		if (tribs < 1250) {
			const greed = surkyGreedResourceFeedback((Vf * Vres) / (VfDone * VresDone), tribs, perks);
			tribs = greed[1];
			Vres *= greed[0];
			Vrad *= greed[0];
		}

		let moreHousing = Math.log((Vf * Vres) / (VfDone * VresDone)) / Math.log(1.12);
		let baseHousing = collectors;
		if (props.hubsEnabled || sc === 'downsize') {
			moreHousing *= props.collectHubs;
			moreHousing += (5 * Math.log(Vres / VresDone)) / Math.log(1.2);
			baseHousing *= 6 + props.collectHubs;
		}
		const tauntCorrectedHousingBase = baseHousing * props.coefC - props.termR;
		const tauntCorrectedHousingNext = (baseHousing + moreHousing) * props.coefC - props.termR;
		let housingGain = tauntCorrectedHousingNext / tauntCorrectedHousingBase;
		if (!(housingGain > 1) || tauntCorrectedHousingBase <= 0) housingGain = 1;
		if (sc === 'downsize') {
			const trumPop = 2 * props.targetZone * (5 + perks.Trumps.level);
			housingGain = 1 + ((housingGain - 1) * baseHousing) / (baseHousing + trumPop);
		}
		Vres *= housingGain;
		Vp *= sc === 'trappa' || sc === 'combat' || sc === 'combatRadon' ? 1 : housingGain;
		collectors += housingGain;

		if (sc !== 'combat' && sc !== 'combatRadon') {
			const VmAdjusted = (Vm * Vres) / (VmDone * VresDone);
			Va *= Math.pow(props.equipScaling.attack, Math.log(VmAdjusted));
			Vh *= Math.pow(props.equipScaling.health, Math.log(VmAdjusted));
			if (sc !== 'smithless') {
				const smithyGain = Math.pow(1.25, Math.log(Vres / VresDone) / Math.log(props.scruffyLevel >= 14 ? 40 : 50));
				Va *= smithyGain;
				Vh *= smithyGain;
			}
		}

		let coordAdjust = props.coordLimited;
		if (sc === 'downsize') coordAdjust = Math.max(coordAdjust, 1);
		else if (sc === 'trappa' || (sc === 'combat' && props.runningTrappa)) coordAdjust = 1;
		else if (sc === 'combat' || sc === 'combatRadon') coordAdjust = perks.Carpentry.level < props.carpNeeded ? 1 : 0;
		const coordGain = Math.pow(1.25, (Math.log(Vp / VpDone) / Math.log(1.25)) * coordAdjust);
		Va *= coordGain;
		Vh *= coordGain;

		const antennas = game.buildings.Antenna.owned;
		const moreMets = Math.log((Vf * Vres) / (VfDone * VresDone)) / Math.log(5);
		const metEff = 0.01 + 0.0005 * antennas;
		const metRes = 0.5 + 0.25 * (antennas >= 20 ? Math.floor(antennas / 5) - 3 : 0);
		const metProd = mets * metEff;
		const metProdNext = (mets + moreMets) * metEff;
		const metRadGain = (1 + metProdNext) / (1 + metProd);
		const metFoodGain = antennas >= 5 ? (1 + metProdNext * metRes) / (1 + metProd * metRes) : 1;
		const metHPGain = antennas >= 10 ? (1 + metProdNext * metRes) / (1 + metProd * metRes) : 1;
		const metMineGain = antennas >= 15 ? (1 + metProdNext * metRes) / (1 + metProd * metRes) : 1;
		Vrad *= metRadGain;
		Vf *= metFoodGain;
		if (sc !== 'combat' && sc !== 'combatRadon') Vh *= metHPGain;
		Vm *= metMineGain;
		mets += moreMets;

		const pushPower = (Va * (sc === 'combat' && props.runningTrappa ? 1 : Vh)) / Vpushed;
		const pushZones = Math.log(pushPower) / props.logEnemyScaling;
		Vres *= Math.pow(sc === 'resplus' ? 1.1 : 1.25, pushZones);
		Va *= Math.pow(1.25, pushZones * (1 - Math.min(1, coordAdjust)));
		Vh *= Math.pow(1.25, pushZones * (1 - Math.min(1, coordAdjust)));

		if (props.clearWeight >= 0 && props.glassRadon) Vrad *= Math.pow(1.1, Math.min(pushZones, props.glassCap));

		if (props.scruffyLevel >= 3) {
			Vrad *= Math.pow(1.03, pushZones);
			Vrad *= 1 + (0.6 * pushZones) / (props.glassCap + props.targetZone);
		}
		let moreTrinkets = pushZones * trinketRate;
		const trinketMax = 1000 * obsLevel;
		if (moreTrinkets + trinkets > trinketMax) moreTrinkets = trinketMax - trinkets;
		if (moreTrinkets < 0) throw 'Unexpectedly tried to value more trinkets than our trinket max!: ' + trinkets;
		const trinketGain = 1 + (moreTrinkets * obsLevel) / (100 + trinkets * obsLevel);
		Va *= trinketGain;
		Vh *= trinketGain;
		Vres *= trinketGain;
		trinkets += moreTrinkets;

		valueArray[0] = Va;
		valueArray[1] = Vh;
		valueArray[2] = Vm;
		valueArray[3] = Vf;
		valueArray[4] = Vres;
		valueArray[5] = Vrad;
		valueArray[6] = Vp;
		valueArray[7] = Ve;
		valueArray[8] = tribs;
		valueArray[9] = collectors;
		valueArray[11] = mets;
		valueArray[13] = trinkets;
		valueArray[15] = Va * (sc === 'combat' && props.runningTrappa ? 1 : Vh);
		valueArray[16] = Vm;
		valueArray[17] = Vf;
		valueArray[18] = Vres;
		valueArray[19] = Vp;
	}

	function surkyLogWeightedValue(props, perks, Va, Vh, Vgear, Vres, Vrad, Ve, Vp, moreTrinkets, extraObs) {
		if (Ve === undefined) Ve = 1;
		if (Vp === undefined) Vp = 1;
		if (moreTrinkets === undefined) moreTrinkets = 0;
		if (extraObs === undefined) extraObs = 0;
		const sc = props.specialChallenge;
		const Wa = props.clearWeight;
		const Wh = sc === 'combat' && props.runningTrappa ? 0 : props.clearWeight * props.healthDerate + props.survivalWeight;
		const We = Math.max(1e-100, props.survivalWeight); // >0 so Equality is still a dump perk
		const Wr = props.radonWeight;
		const obsLevel = 1 + perks.Observation.level + extraObs;
		const valueArray = [Va, Vh, Vgear, 1, Vres, Vrad, Vp, Ve, props.tributes, props.housingCount, props.hubsEnabled, props.meteorologists, surkyObsDropRate(obsLevel, props.targetZone, props) / 100, props.baselineTrinketsNext, obsLevel, 1, 1, 1, 1, 1];
		for (let i = 0; i < 3; i++) surkyIterateValueFeedback(valueArray, props, perks);
		Va = valueArray[0];
		Vh = valueArray[1];
		const Vm = valueArray[2];
		Vres = valueArray[4];
		Vrad = valueArray[5];
		Ve = valueArray[7];
		const Vtrink = valueArray[13];
		// only count new trinket drops, not trinkets that a higher cap unlocks
		moreTrinkets += Math.max(0, Vtrink - Math.max(props.baselineTrinketsNext, game.portal.Observation.trinkets));
		let Vgrowth = (Vrad * props.radonPerRun + props.trinketRadonPerRun + props.radonPerTrinket * moreTrinkets) / (props.radonPerRun + props.trinketRadonPerRun);
		if (sc === 'combat') Vgrowth = 1;
		let res = Wa * Math.log(Va) + Wh * Math.log(Vh) + We * Math.log(Ve) + Wr * Math.log(Vgrowth);
		if (sc === 'resplus' || sc === 'resminus') res = Math.log(Vres) + 1e-100 * Math.log(Ve);
		if (sc === 'equip') res = Math.log(Vres * Vm) + 1e-100 * Math.log(Ve);
		return res;
	}

	function surkyObsDropRate(level, zone, props) {
		if (zone < 101) return 0;
		if (zone > 200) zone = 200;
		const base = (1 + (level - 1) / 2) * Math.pow(1.03, zone - 100);
		if (props.specialChallenge === 'alchemy' && zone <= 156) return 100 - (100 - base) * Math.pow(0.99, props.findPots);
		return base;
	}

	// trinkets expected by clearing the target zone (memoized per Observation level)
	function surkyShinyCollect(level, props) {
		if (typeof props.shinyTable[level] === 'undefined') {
			let shinies = 0;
			// the game checks for the drop after advancing the zone counter, so go to zone + 1
			for (let i = 101; i <= props.targetZone + 1; i++) {
				shinies += surkyObsDropRate(level, i, props) / 100;
				if (i % 25 === 0) {
					const free = Math.floor((level - 1) / 2);
					if (free > 0) shinies += free;
				}
			}
			props.shinyTable[level] = shinies;
		}
		return props.shinyTable[level];
	}

	// average attack with Frenzy, counting its uptime, for a given number of hits per life
	function surkyFrenzyAvgAtk(level, frenzyHits, perks) {
		const frenzyDeathTime = 0.4 + 0.258 * frenzyHits;
		const frenzyHitTime = frenzyDeathTime / frenzyHits;
		const frenzyProcChance = perks.Frenzy.procEffect * level;
		const frenzyProcWaitTime = frenzyHitTime / frenzyProcChance;
		const frenzyUptimePerProc = (frenzyDeathTime * Math.log((perks.Frenzy.timeEffect * level) / frenzyDeathTime + 1)) / Math.log(2);
		let frenzyUptimeFrac = frenzyUptimePerProc / (frenzyProcWaitTime + frenzyUptimePerProc);
		if (autoBattle.oneTimers.Mass_Hysteria.owned) frenzyUptimeFrac = 1;
		return 1 + frenzyUptimeFrac * perks.Frenzy.effect * level;
	}

	// pick the most efficient affordable perk
	function surkyEfficiencyFlag(props, perks) {
		let bestAffordableEff = 0;
		props.bestPerk = '';
		Object.keys(perks).forEach(function (perkName) {
			const perkObj = perks[perkName];
			if (typeof perkObj !== 'object' || !perkObj.hasOwnProperty('optimize') || !perkObj.optimize) return;
			if (surkyCouldBuyPerk(perkName, false, 1, props, perks) && perkObj.efficiency > bestAffordableEff) {
				bestAffordableEff = perkObj.efficiency;
				props.bestPerk = perkName;
			}
			if (perkObj.hasOwnProperty('efficiency2') && surkyCouldBuyPerk(perkName, false, 2, props, perks) && perkObj.efficiency2 > bestAffordableEff) {
				bestAffordableEff = perkObj.efficiency2;
				props.bestPerk = perkName;
			}
		});
		return props;
	}

	function surkyPerkEfficiencies(props, perks) {
		const sc = props.specialChallenge;
		const lwv = function () { return surkyLogWeightedValue.apply(null, [props, perks].concat(Array.prototype.slice.call(arguments))); };
		const cost1 = function (name) { return surkyPerkCost(name, 1, false, perks); };

		// combat respec: how much Carpentry is needed to afford all coords
		const moreCoordsNeeded = Math.max(0, props.targetZone - game.upgrades.Coordination.done);
		const popNeededForCoords = 3 * Math.pow(1.25, moreCoordsNeeded) * game.resources.trimps.maxSoldiers;
		const tauntBase = 1.003 + 0.0001 * perks.Expansion.level;
		const tauntMult = game.global.expandingTauntimp ? Math.pow(tauntBase, game.unlocks.impCount.Tauntimp) : 1;
		const tauntCorrectedMaxTrimps = tauntMult * (game.resources.trimps.max * game.resources.trimps.maxMod * props.scaffMult * props.mutationMult) * Math.pow(tauntBase, Math.max(props.impsExpected, game.unlocks.impCount.Tauntimp));
		props.carpNeeded = Math.log(popNeededForCoords / tauntCorrectedMaxTrimps) / Math.log(1.1);

		const motiv = 1 + perks.Motivation.level * perks.Motivation.effect;
		let motivGain = (motiv + perks.Motivation.effect) / motiv;
		if (sc === 'trappa') {
			// Trappa is mostly drops before 160 and mostly gathering after 170
			if (props.targetZone < 162) motivGain = Math.pow(motivGain, 0.0001);
			else if (props.targetZone < 172) motivGain = Math.pow(motivGain, 0.5);
		}
		const motivCost = cost1('Motivation');
		const pow = 1 + perks.Power.level * perks.Power.effect;
		const powGain = (pow + perks.Power.effect) / pow;
		const powCost = cost1('Power');
		const tough = 1 + perks.Toughness.level * perks.Toughness.effect;
		const toughGain = (tough + perks.Toughness.effect) / tough;
		const toughCost = cost1('Toughness');

		const trinketValues = surkyTrinketValues(motivCost, powCost, toughCost, props, perks);
		props.trinketRadonPerRun = trinketValues[0];
		props.radonPerTrinket = trinketValues[1];
		props.baselineTrinketsNext = trinketValues[2];

		perks.Artisanistry.efficiency = lwv(1, 1, perks.Artisanistry.effect, 1, 1, 1) / cost1('Artisanistry');

		// Bait: also when you pick Trappa at the portal, before the run starts (as on the Surky site).
		if (sc === 'trappa' || (sc === 'combat' && props.runningTrappa)) {
			const baitTime = 3600 * 10 * 10 * props.trapHrs;
			const totalBaitPopBase = baitTime * (1 + perks.Bait.level);
			const totalBaitPopNext = baitTime * (2 + perks.Bait.level);
			const baitPop = (totalBaitPopNext + props.trappaStartPop) / (totalBaitPopBase + props.trappaStartPop);
			perks.Bait.efficiency = lwv(1, 1, 1, Math.pow(baitPop, 0.0001), 1, 1, baitPop) / cost1('Bait');
		}

		// Expansion: all expected Tauntimps for the target zone count
		const expandobase = 1 + 1 / (10030 + perks.Expansion.level);
		const expandogain = Math.pow(expandobase, props.impsExpected);

		const carpPop = perks.Carpentry.effect;
		if (sc === 'trappa' || (sc === 'combat' && props.runningTrappa)) {
			perks.Carpentry.efficiency = lwv(1, 1, 1, carpPop, 1, 1, 1) / cost1('Carpentry');
			perks.Expansion.efficiency = lwv(1, 1, 1, expandogain, 1, 1, 1) / cost1('Expansion');
		} else {
			perks.Carpentry.efficiency = lwv(1, 1, 1, carpPop, 1, 1, carpPop) / cost1('Carpentry');
			perks.Expansion.efficiency = lwv(1, 1, 1, expandogain, 1, 1, expandogain) / cost1('Expansion');
		}

		if (sc === 'downsize') {
			const buildPop = (props.hubsEnabled ? 13 + props.collectHubs : 7) * props.housingCount;
			const baseTrumPop = 2 * props.targetZone * (5 + perks.Trumps.level);
			const trumPop = (buildPop + baseTrumPop + 2 * props.targetZone) / (buildPop + baseTrumPop);
			perks.Trumps.efficiency = lwv(1, 1, 1, trumPop, 1, 1, trumPop) / cost1('Trumps');
		}

		const CD = 1 + props.shieldCD / 100 + perks.Criticality.level * perks.Criticality.effect;
		const CC = sc === 'duel' ? 0.5 : 1;
		const critGain = (1 - CC + CC * (CD + perks.Criticality.effect)) / (1 - CC + CC * CD);
		perks.Criticality.efficiency = lwv(critGain, 1, 1, 1, 1, 1) / cost1('Criticality');

		perks.Equality.efficiency = lwv(1, 1, 1, 1, 1, perks.Equality.effect) / cost1('Equality');

		const champ = 1.01 + 0.005 * (autoBattle.maxEnemyLevel - 1);
		perks.Championism.efficiency = lwv(champ, champ, 1, 1, 1, 1) / cost1('Championism');

		if (sc !== 'berserk') {
			let frenzyHits = 300;
			const isDeathless = sc === 'resplus' || sc === 'resminus' || sc === 'trappa' || (sc === 'combat' && props.runningTrappa);
			if (!isDeathless && props.clearWeight > 0) frenzyHits = 5;
			const frenzyGain = surkyFrenzyAvgAtk(perks.Frenzy.level + 1, frenzyHits, perks) / surkyFrenzyAvgAtk(perks.Frenzy.level, frenzyHits, perks);
			perks.Frenzy.efficiency = lwv(frenzyGain, 1, 1, 1, 1, 1) / cost1('Frenzy');
		}

		const greedGain = surkyGreedEffect(props.tributes);
		perks.Greed.efficiency = lwv(1, 1, 1, greedGain, greedGain, 1) / cost1('Greed');

		const loot = 1 + perks.Looting.level * perks.Looting.effect;
		const lootGain = (loot + perks.Looting.effect) / loot;
		perks.Looting.efficiency = lwv(1, 1, 1, lootGain, lootGain, 1) / cost1('Looting');

		perks.Motivation.efficiency = lwv(1, 1, 1, motivGain, 1, 1) / motivCost;

		const storeTax = 0.125 / (1 + perks.Packrat.level * perks.Packrat.effect) / 2;
		const storeTaxNext = 0.125 / (1 + (perks.Packrat.level + 1) * perks.Packrat.effect) / 2;
		perks.Packrat.efficiency = lwv(1, 1, 1, (1 - storeTaxNext) / (1 - storeTax), 1, 1) / cost1('Packrat');

		if (sc === 'trappa' || (sc === 'combat' && props.runningTrappa)) {
			perks.Pheromones.efficiency = 0;
		} else {
			const breedSpeed = 1 + props.potency * (1 + perks.Pheromones.level * perks.Pheromones.effect);
			const breedUptime = 3 / Math.max(3, Math.log(2) / Math.log(breedSpeed));
			const breedSpeedNext = 1 + props.potency * (1 + (perks.Pheromones.level + 1) * perks.Pheromones.effect);
			// 3, not 3.001: at the breed cap another level is worth nothing (as on the Surky site).
			const breedUptimeNext = 3 / Math.max(3, Math.log(2) / Math.log(breedSpeedNext));
			perks.Pheromones.efficiency = lwv(breedUptimeNext / breedUptime, 1, 1, 1, 1, 1) / cost1('Pheromones');
		}

		perks.Power.efficiency = lwv(powGain, 1, 1, 1, 1, 1) / powCost;

		let prismLayers = 1;
		let basePrismal = props.shieldPrismal + 100;
		if (props.scruffyLevel >= 1) basePrismal += 25;
		if (props.scruffyLevel >= 10) prismLayers = 2;
		if (props.scruffyLevel >= 16) prismLayers = 3;
		const prismHP = 1 + (basePrismal / 100 + perks.Prismal.level * perks.Prismal.effect) * prismLayers;
		const prismGain = (prismHP + perks.Prismal.effect * prismLayers) / prismHP;
		perks.Prismal.efficiency = lwv(sc === 'combat' && props.runningTrappa ? prismGain : 1, prismGain, 1, 1, 1, 1) / cost1('Prismal');

		perks.Resilience.efficiency = lwv(1, perks.Resilience.effect, 1, 1, 1, 1) / cost1('Resilience');
		perks.Tenacity.efficiency = lwv(perks.Tenacity.effect, 1, 1, 1, 1, 1) / cost1('Tenacity');
		perks.Toughness.efficiency = lwv(1, toughGain, 1, 1, 1, 1) / toughCost;

		// Observation: +1 and +2 levels (even levels give an extra free trinket drop)
		const obs1 = surkyObservationGains(1, props, perks);
		perks.Observation.efficiency = Math.min(lwv(obs1[0], obs1[0], 1, obs1[0], 1, 1, 1, obs1[1], 1), obs1[2] < Infinity ? lwv(obs1[2], obs1[2], 1, obs1[2], 1, 1, 1, 0, 1) : Infinity) / cost1('Observation');
		if (surkyCouldBuyPerk('Observation', false, 2, props, perks)) {
			const obs2 = surkyObservationGains(2, props, perks);
			perks.Observation.efficiency2 = Math.min(lwv(obs2[0], obs2[0], 1, obs2[0], 1, 1, 1, obs2[1], 2), obs2[2] < Infinity ? lwv(obs2[2], obs2[2], 1, obs2[2], 1, 1, 1, 0, 2) : Infinity) / surkyPerkCost('Observation', 2, false, perks);
		} else {
			perks.Observation.efficiency2 = 0;
		}

		perks.Masterfulness.efficiency = lwv(perks.Tenacity.effect, 1, 1, greedGain, greedGain, 1) / cost1('Masterfulness');

		const smithobase = 1 + 1 / (125 + perks.Smithology.level);
		const smithogain = Math.pow(smithobase, props.smithyCount);
		perks.Smithology.efficiency = lwv(smithogain, smithogain, 1, 1, 1) / cost1('Smithology');

		// rough values, as in Surky
		perks.Agility.efficiency = lwv(1.05, 1.05, 1, 1.05, 1.05, 1) / cost1('Agility');
		perks.Range.efficiency = lwv(1.01, 1, 1, 1, 1, 1) / cost1('Range');
		perks.Hunger.efficiency = lwv(1.03, 1, 1, 1, 1, 1) / cost1('Hunger');
		return props;
	}

	function surkyAutobuy(props, perks) {
		const sc = props.specialChallenge;
		props = surkyEfficiencyFlag(props, perks);
		props.radonSpent = surkyTotalPerksCost(perks);
		props = surkyPerkEfficiencies(props, perks);
		perks.Bait.optimize = sc === 'trappa' || (sc === 'combat' && props.runningTrappa);
		perks.Pheromones.optimize = game.stats.highestRadLevel.valueTotal() >= 60 && sc !== 'trappa' && !(sc === 'combat' && props.runningTrappa);
		if (sc === 'trappa' || (sc === 'combat' && props.runningTrappa)) {
			const maxCarpLevels = Math.log((props.perksRadon / perks.Carpentry.priceBase) * (perks.Carpentry.priceFact - 1) + 1) / Math.log(perks.Carpentry.priceFact);
			props.trappaStartPop = 10 * Math.pow(1.1, maxCarpLevels) * props.scaffMult * props.mutationMult;
		}
		perks.Trumps.optimize = sc === 'downsize';
		props = surkyEfficiencyFlag(props, perks);

		let guard = 0;
		while (props.bestPerk !== '' && guard++ < 1e6) {
			const bestObj = perks[props.bestPerk];
			const buy2 = bestObj.hasOwnProperty('efficiency2') && bestObj.efficiency2 > bestObj.efficiency;
			surkyCouldBuyPerk(props.bestPerk, true, buy2 ? 2 : 1, props, perks);
			props.radonSpent = surkyTotalPerksCost(perks);
			props = surkyPerkEfficiencies(props, perks);
			props = surkyEfficiencyFlag(props, perks);
		}
		// dump perks: Trumps, then Pheromones (no Bait dump, as on the Surky site)
		if (sc !== 'combat' && sc !== 'combatRadon') while (surkyCouldBuyPerk('Trumps', true, 1, props, perks));
		if (sc !== 'trappa' && !(sc === 'combat' && props.runningTrappa) && game.global.highestRadonLevelCleared >= 59) {
			while (surkyCouldBuyPerk('Pheromones', true, 1, props, perks));
		}
		return perks;
	}

	function surkyOptimize(preset) {
		let loaded = surkyInitialLoad(preset, false);
		let props = loaded[0];
		let perks = loaded[1];
		// without a respec, only add levels to what is there
		if (!noRespec() && props.perksRadon > 0) {
			const origExpand = game.portal.Expansion.radLevel;
			let carpWanted = 0;
			if (props.specialChallenge === 'combat' || props.specialChallenge === 'combatRadon') {
				const maxTrimps = isChallenge('Downsize') ? game.global.totalGifts + game.unlocks.impCount.TauntimpAdded + 10 + countTotalHousingBuildings() : game.resources.trimps.max;
				// enough Carpentry for the current army (Trappa: 10 more coords after the last army)
				const wantedArmySize = (props.runningTrappa ? Math.pow(1.25, 10) : 1) * game.resources.trimps.maxSoldiers;
				const tauntBase = 1.003 + 0.0001 * origExpand;
				const tauntMult = game.global.expandingTauntimp ? Math.pow(tauntBase, game.unlocks.impCount.Tauntimp) : 1;
				carpWanted = Math.max(0, Math.ceil(Math.log((2.4 * wantedArmySize) / (tauntMult * (maxTrimps * game.resources.trimps.maxMod * props.scaffMult * props.mutationMult))) / Math.log(1.1)));
			}
			loaded = surkyInitialLoad(preset, true); // all levels from zero
			props = loaded[0];
			perks = loaded[1];
			if (!portalWindowOpen) {
				perks.Carpentry.level = carpWanted;
				perks.Expansion.level = origExpand;
			}
			if (props.specialChallenge === 'trappacarp') {
				perks.Carpentry.level = 0;
				while (surkyCouldBuyPerk('Carpentry', true, 1, props, perks));
				props.radonSpent = surkyTotalPerksCost(perks);
				props = surkyPerkEfficiencies(props, perks);
			}
		}
		perks = surkyAutobuy(props, perks);
		const levels = {};
		Object.keys(perks).forEach(function (name) {
			if (typeof perks[name] === 'object' && perks[name].hasOwnProperty('optimize')) levels[name] = perks[name].level;
		});
		return levels;
	}

	/* ------------------------------------------------------------------ Game function checks */
	// FNV-1a hash of a function's source (line endings ignored), as 8 hex digits.
	function fingerprint(fn) {
		while (typeof fn === 'function' && typeof fn.__original === 'function') fn = fn.__original;
		if (typeof fn !== 'function') return 'missing';
		const text = Function.prototype.toString.call(fn).replace(/\r\n?/g, '\n');
		let h = 0x811c9dc5;
		for (let i = 0; i < text.length; i++) {
			h ^= text.charCodeAt(i);
			h = Math.imul(h, 0x01000193);
		}
		return (h >>> 0).toString(16).padStart(8, '0');
	}

	let changedFns = null;
	function checkGameFunctions() {
		if (changedFns) return changedFns;
		changedFns = [];
		Object.keys(FINGERPRINTS).forEach(function (name) {
			const now = fingerprint(window[name]);
			if (now !== FINGERPRINTS[name]) {
				console.warn('[Perkalator] Game function ' + name + ' changed, fingerprint now ' + now);
				if (!IGNORE_VERSION_CHECK || now === 'missing') changedFns.push(name + ' (now ' + now + ')');
			}
		});
		return changedFns;
	}

	/* ------------------------------------------------------------------ Optimize */
	function showMessage(title, text) {
		tooltip(title, 'customText', 'lock', text, false, 'center');
		if (typeof verticalCenterTooltip === 'function') verticalCenterTooltip();
	}

	function applyLevels(levels) {
		const box = document.createElement('textarea');
		box.id = 'perkImportBox';
		box.style.display = 'none';
		box.value = LZString.compressToBase64(JSON.stringify(levels));
		document.body.appendChild(box);
		try {
			return importPerks();
		} finally {
			box.remove();
		}
	}

	function optimizeClicked() {
		const universe = portalUniverse;
		if (universe !== 1 && universe !== 2) return;
		const changed = checkGameFunctions();
		if (changed.length) {
			showMessage('Optimize is off', 'A Trimps update changed ' + changed.join(', ') + ', so Optimize stays off until Perkalator is updated. To use it anyway, set IGNORE_VERSION_CHECK = true in mods/perkalator.js.');
			return;
		}
		if (isChallenge('Hypothermia') && game.global.viewingUpgrades) {
			document.getElementById('portalStory').innerHTML = "<span style='color: red'>You cannot change your perks while on the Hypothermia Challenge!</span>";
			return;
		}
		const preset = chosenPreset(universe);
		if (!presetUsable(preset, universe)) {
			showMessage(preset.name, 'This preset needs zone ' + (preset.hze + 1) + ' reached in this universe first.');
			return;
		}
		if (preset.key === 'trapper' && game.global.selectedChallenge !== 'Trapper' && !isChallenge('Trapper')) {
			showMessage('Trapper²', 'This preset is for the Trapper² challenge. Start a new run with Trapper² (initial), then use this one.');
			return;
		}
		if (game.global.canRespecPerks && !game.global.respecActive) respecPerks();
		let levels;
		try {
			levels = universe === 2 ? surkyOptimize(preset) : perkyOptimize(preset);
		} catch (e) {
			console.error('[Perkalator]', e);
			showMessage('Optimize failed', calcName(universe) + ' could not work out the perks for this save (' + String(e && e.message || e) + '). Nothing was changed.');
			return;
		}
		const error = applyLevels(levels);
		if (error) showMessage('Optimize', calcName(universe) + ' worked out perks the game would not take: ' + error);
		else if (preset.key === 'spire' && portalWindowOpen) showMessage('Spire respec', 'This preset is meant for a mid-run respec, once you are done farming for the Spire.');
	}

	/* ------------------------------------------------------------------ Controls */
	const CSS = String.raw`
/* One split button: Optimize on the left, the preset list on the right. */
#nfPerkControls {
	display: inline-flex; align-items: stretch; vertical-align: middle; white-space: nowrap;
	margin-left: 4px; border: 1px solid #1d6580; border-radius: 4px; overflow: hidden;
}
#nfOptimizeBtn {
	margin: 0; border: 0; border-radius: 0; background-color: #23799a; color: #fff;
}
#nfOptimizeBtn:hover, #nfOptimizeBtn:focus { background-color: #1f6d8b; color: #fff; }
.nfPresetHalf { position: relative; display: flex; border-left: 1px solid #17526a; }
#nfPerkPreset {
	-webkit-appearance: none; appearance: none; margin: 0; border: 0; border-radius: 0; outline: 0;
	padding: 0 2.2vw 0 0.8vw; max-width: 22vw; cursor: pointer;
	font: inherit; font-size: 1.5vw; color: #fff; background-color: #1d6580;
}
#nfPerkPreset:hover, #nfPerkPreset:focus { background-color: #195a73; }
#nfPerkPreset option, #nfPerkPreset optgroup { font-size: 14px; color: #fff; background-color: #222; }
#nfPerkPreset option:disabled { color: #999; }
/* Perk level change: light green up, light red down; a thin dark outline keeps it readable on
   the grey cells of the light themes (on dark cells it does not show). */
.nfLvUp { color: #9ae6b4; }
.nfLvDown { color: #feb2b2; }
.perkColorOff .nfLvChange, .perkColorMaxed .nfLvChange {
	text-shadow: -1px 0 #000, 1px 0 #000, 0 -1px #000, 0 1px #000;
}
.nfPresetCaret {
	position: absolute; right: 0.8vw; top: 50%; margin-top: -0.15vw; pointer-events: none;
	border: 0.4vw solid transparent; border-top-color: #fff; border-bottom-width: 0;
}
`;

	function escapeHtml(text) {
		return String(text).replace(/[&<>"']/g, function (c) {
			return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
		});
	}

	function round(n) { return Math.round(n * 1000) / 1000; }

	function presetTip(universe) {
		const p = chosenPreset(universe);
		const w = p.w;
		const weights = universe === 2
			? 'Weights: attack ' + round(w[0]) + ', health ' + round(w[1]) + ', Radon ' + round(w[2]) + '.'
			: 'Weights: helium ' + round(w[0]) + ', attack ' + round(w[1]) + ', health ' + round(w[2]) + ', Fluffy ' + round(w[3]) + '.';
		let text = escapeHtml(p.text) + '<br>'
			+ 'Target zone ' + prettify(targetZone(universe)) + '. ' + escapeHtml(weights);
		if (universe === 2) {
			const run = surkyRunValues();
			text += '<br>From ' + (game.global.universe === 2 ? 'this run' : 'defaults (you are in Universe 1)') + ': ' + prettify(run.tributes) + ' Tributes, '
				+ prettify(run.meteorologists) + ' Meteorologists, ' + prettify(run.smithyCount) + ' Smithies, ' + prettify(run.housingCount) + ' Collectors, '
				+ prettify(run.radonPerRun) + ' Radon per run.';
		}
		if (!presetUsable(p, universe)) text += '<br>Needs zone ' + (p.hze + 1) + ' reached first.';
		text += '<br><br>Optimize uses your respec if you have one, then fills in the perks. Nothing changes until you press Confirm'
			+ (portalWindowOpen ? ' or Activate Portal' : '') + '; Cancel undoes it.';
		return text;
	}

	function showTip(event) {
		const universe = portalUniverse;
		if (universe !== 1 && universe !== 2) return;
		tooltip(calcName(universe) + ': ' + chosenPreset(universe).name, 'customText', event, presetTip(universe));
	}

	function buildOptions(select, universe) {
		const chosen = chosenPreset(universe);
		let html = '';
		let group = '';
		presetsFor(universe).forEach(function (p) {
			if (!presetShown(p, universe)) return;
			if (p.group !== group) {
				if (group) html += '</optgroup>';
				group = p.group;
				html += '<optgroup label="' + escapeHtml(group) + '">';
			}
			html += '<option value="' + p.key + '"' + (p.key === chosen.key ? ' selected' : '') + (presetUsable(p, universe) ? '' : ' disabled') + '>' + escapeHtml(p.name) + '</option>';
		});
		if (group) html += '</optgroup>';
		select.innerHTML = html;
		select.setAttribute('data-universe', String(universe));
		select.setAttribute('aria-label', calcName(universe) + ' preset');
		fitSelect(select);
	}

	// A select is as wide as its longest option; make it fit the chosen one instead.
	function fitSelect(select) {
		const option = select.options[select.selectedIndex];
		if (!option) return;
		const style = getComputedStyle(select);
		const probe = document.createElement('span');
		probe.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap;';
		probe.style.font = style.font;
		probe.textContent = option.textContent;
		document.body.appendChild(probe);
		const width = probe.getBoundingClientRect().width;
		probe.remove();
		select.style.width = Math.ceil(width + parseFloat(style.paddingLeft) + parseFloat(style.paddingRight) + 2) + 'px';
	}

	function makeControls() {
		const wrap = document.createElement('span');
		wrap.id = 'nfPerkControls';
		const select = document.createElement('select');
		select.id = 'nfPerkPreset';
		select.addEventListener('change', function () {
			const universe = portalUniverse;
			setPreset(universe, select.value);
			fitSelect(select);
			tooltip('hide');
		});
		select.addEventListener('mouseover', showTip);
		select.addEventListener('mouseout', function () { tooltip('hide'); });
		select.addEventListener('mousedown', function () { tooltip('hide'); });
		const btn = document.createElement('div');
		btn.id = 'nfOptimizeBtn';
		btn.className = 'btn inPortalBtn';
		btn.setAttribute('role', 'button');
		btn.setAttribute('tabindex', '0');
		btn.textContent = 'Optimize';
		btn.addEventListener('click', function () { tooltip('hide'); optimizeClicked(); });
		btn.addEventListener('keydown', function (e) {
			if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); optimizeClicked(); }
		});
		btn.addEventListener('mouseover', showTip);
		btn.addEventListener('mouseout', function () { tooltip('hide'); });
		const half = document.createElement('span');
		half.className = 'nfPresetHalf';
		const caret = document.createElement('span');
		caret.className = 'nfPresetCaret';
		caret.setAttribute('aria-hidden', 'true');
		half.appendChild(select);
		half.appendChild(caret);
		wrap.appendChild(btn);
		wrap.appendChild(half);
		return wrap;
	}

	function enabled() { return TrimpsModLoader.value('nfPerkOptimize') === 1; }

	function updateControls() {
		const container = document.getElementById('portalBtnContainer');
		let controls = document.getElementById('nfPerkControls');
		const open = container && container.offsetParent !== null && (portalUniverse === 1 || portalUniverse === 2);
		const show = open && enabled() && !game.global.kongBonusMode;
		if (!show) {
			if (controls) controls.style.display = 'none';
			return;
		}
		if (!controls) {
			controls = makeControls();
			const after = document.getElementById('respecPortalBtn');
			container.insertBefore(controls, after ? after.nextSibling : null);
		}
		controls.style.display = '';
		const select = document.getElementById('nfPerkPreset');
		if (select.getAttribute('data-universe') !== String(portalUniverse) || select.value !== chosenPreset(portalUniverse).key) {
			if (document.activeElement !== select) buildOptions(select, portalUniverse);
		}
	}

	/* ------------------------------------------------------------------ Change colours */
	// Colours the (+n) / (-n) the game writes after a changed perk level: green up, red down.
	// The game writes that text in updatePerkLevel, so that is wrapped (after a fingerprint check).
	const WRAP_FINGERPRINTS = { updatePerkLevel: 'e1ab1663' };

	function colorsOn() { return TrimpsModLoader.value('nfPerkColors') === 1; }

	function markChange(what) {
		const perk = game.portal[what];
		const elem = document.getElementById(what + 'Owned');
		if (!perk || !elem || !perk.levelTemp || !colorsOn()) return;
		const html = elem.innerHTML;
		const i = html.lastIndexOf('(');
		if (i < 0 || html.charAt(html.length - 1) !== ')') return;
		const cls = perk.levelTemp > 0 ? 'nfLvUp' : 'nfLvDown';
		elem.innerHTML = html.slice(0, i) + '<span class="nfLvChange ' + cls + '">' + html.slice(i) + '</span>';
	}

	// Redraws every perk level (after the setting is switched).
	function refreshLevels() {
		if (typeof updatePerkLevel !== 'function') return;
		Object.keys(game.portal).forEach(function (what) {
			if (document.getElementById(what + 'Owned')) updatePerkLevel(what);
		});
	}

	const wrapProblems = [];
	function wrapUpdatePerkLevel() {
		const original = window.updatePerkLevel;
		const now = fingerprint(original);
		if (now !== WRAP_FINGERPRINTS.updatePerkLevel) {
			console.warn('[Perkalator] Game function updatePerkLevel changed, fingerprint now ' + now);
			if (!IGNORE_VERSION_CHECK || now === 'missing') {
				wrapProblems.push('updatePerkLevel (now ' + now + ')');
				return;
			}
		}
		const wrapper = function (what) {
			const result = original.apply(this, arguments);
			try { markChange(what); } catch (e) { console.error('[Perkalator]', e); }
			return result;
		};
		wrapper.__original = original;
		window.updatePerkLevel = wrapper;
	}

	function warnWrapProblems() {
		if (!wrapProblems.length) return;
		const bar = document.createElement('div');
		bar.id = 'nfPerkWarning';
		bar.style.cssText = 'position:fixed;bottom:0;left:50%;transform:translateX(-50%);z-index:100000;max-width:90vw;'
			+ 'padding:0.5em 2.2em 0.5em 1em;background:#7f1d1d;color:#fff;border:1px solid #fca5a5;border-bottom:0;';
		bar.textContent = 'Perkalator: a Trimps update changed ' + wrapProblems.join(', ') + ', so perk changes are not coloured. '
			+ 'The mod needs an update; to run it anyway, set IGNORE_VERSION_CHECK = true in mods/perkalator.js.';
		const close = document.createElement('span');
		close.textContent = '×';
		close.title = 'Close';
		close.style.cssText = 'position:absolute;right:0.6em;top:0.4em;cursor:pointer;';
		close.onclick = function () { bar.remove(); };
		bar.appendChild(close);
		document.body.appendChild(bar);
	}

	/* ------------------------------------------------------------------ Start */
	function start() {
		if (typeof TrimpsModLoader === 'undefined') {
			console.warn('[Perkalator] needs Trimps Mod Loader (mods/mods.js)');
			return;
		}
		const style = document.createElement('style');
		style.id = 'nfPerkStyle';
		style.textContent = CSS;
		document.head.appendChild(style);

		TrimpsModLoader.register({
			name: 'Perkalator',
			options: [
				{
					key: 'nfPerkOptimize',
					titles: ['Perk Optimizer: Off', 'Perk Optimizer: On'],
					fallback: 1,
					description: 'Adds a Perky or Surky preset list and an Optimize button next to Cancel and Respec in the Portal and View Perks. Optimize uses your respec if you have one and fills in the perks for the chosen preset. Nothing changes until you press Confirm.',
					onToggle: updateControls,
				},
				{
					key: 'nfPerkColors',
					titles: ['Perk Change Colors: Off', 'Perk Change Colors: On'],
					fallback: 1,
					description: 'While you change perks in the Portal or View Perks, the change after a perk level shows in green when it goes up and in red when it goes down.',
					onToggle: refreshLevels,
				},
				{ key: PRESET_KEYS[1], hidden: true, titles: ['auto'].concat(PERKY_PRESETS.map(function (p) { return p.key; })), fallback: 0 },
				{ key: PRESET_KEYS[2], hidden: true, titles: ['auto'].concat(SURKY_PRESETS.map(function (p) { return p.key; })), fallback: 0 },
			],
		});

		wrapUpdatePerkLevel();
		warnWrapProblems();

		setInterval(function () {
			try { updateControls(); } catch (e) { console.error('[Perkalator]', e); }
		}, 200);
		window.addEventListener('resize', function () {
			const select = document.getElementById('nfPerkPreset');
			if (select) fitSelect(select);
		});
		console.log('[Perkalator] ' + VERSION + ' loaded');
	}

	window.Perkalator = {
		version: VERSION,
		optimize: function (universe, key) {
			// For testing: the levels a preset gives, without changing anything.
			const list = presetsFor(universe);
			const preset = list.find(function (p) { return p.key === key; }) || chosenPreset(universe);
			return universe === 2 ? surkyOptimize(preset) : perkyOptimize(preset);
		},
		fingerprint: fingerprint,
	};

	try { start(); } catch (e) { console.error('[Perkalator]', e); }
})();
