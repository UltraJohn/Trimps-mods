// Trimps – Nice Features 1.8.2 (Steam mod)
//
// Steam port of the old "Trimps Visual Overhaul" userscript:
//  * Icons on the enemy grid showing where exotic imps (Magnimp, Goblimp, Chronoimp…) and
//    bone drops (Skeletimps) are in the current Zone or map. Hover a cell to see its enemy.
//  * A small panel under the battle buttons with your exotic imp bonuses, Blacksmithery zone,
//    Radortle (Universe 2) and Void Maps. Each row is the grid icon + value; hover it for details.
//  * A strip under the grid with:
//      - the coming Nature empowerments (Universe 1 from Z236), with "More" for the next 100 Zones
//      - your carried Shields and Staffs: click one to equip it, hover for its mods
//      - "Story so far": every story message up to your highest Zone, newest first
//  * Map preset hotkeys: Q, W, E, R pick presets 1–4 while the map screen is open. (In that screen
//    they replace the game's own E shortcut.) Follows the game's Hotkeys setting.
//  * Shift for Max and Alt for Custom (Settings > Mods, on by default): while Shift is held, the
//    buy amount is Max, while the left Alt key is held your Custom amount (buy tabs, and the perk
//    tabs in the portal and View Perks); the key pressed last wins, letting go switches back.
//  * Colored item icons on the grid, with a "Grid Icons" button in Settings > Mods that cycles:
//      - Vanilla: the game's own icons
//      - Bright: every drop in its own color
//      - Dimmed (default): one-time unlocks (equipment, books, unique maps, buildings) bright,
//        repeating drops (food, wood, metal, gems, fragments, Battle Territory Bonus) faded
//      - Unlocks: only the one-time unlocks are colored
//  * Prestige warnings (Settings > Mods, on by default) on equipment prestige upgrades you can
//    afford, when the next tier's level 1 is weaker than your current item:
//      - orange outline: you have the metal (wood for Supershield) to buy back past it right away
//      - orange fill: you can't buy back past it yet
//    A corner number shows the levels the next tier needs to pass the current item, and the
//    upgrade's tooltip gets a line with the total cost. Upgrades stronger even at level 1 are unchanged.
//  * Settings > Mods also has an on/off toggle for the grid imp icons, the bonus panel, each part of
//    the strip under the grid (Nature, heirlooms, story) and the hotkeys (all on by default).
//  * The settings are in the Nice Features box of Settings > Mods, which the Nice Mod Loader
//    (mods.js) adds, and are kept in your save like the game's own settings.
//
// Works with any theme (matches the Nice Theme when it's on).
//
// The game files are never changed. At runtime four game functions are wrapped (the wrapper
// calls the game's original, then adds one step): drawGrid (put the grid icons back after each
// redraw), mapsSwitch (hide the strip while the map chooser is open), updateButtonColor (mark
// prestige upgrades after the game colours them) and tooltip (the extra prestige line). Before wrapping, each
// is compared with a fingerprint of the version this mod was made for. If a Trimps update
// changed one, that part stays off and a warning names the function and its new fingerprint;
// set IGNORE_VERSION_CHECK = true below to wrap it anyway. (Without the mapsSwitch wrapper the
// strip still hides, from the once-a-second update.) The panel and strip values update once a
// second: they change in too many places in the game to hook each one.
//
// Other mods may wrap the same functions. Each wrapper here keeps the function it wrapped in
// `__original`, and the fingerprint check follows that chain back to the game's own function.
//
// Install: copy into  <Steam>\steamapps\common\Trimps\mods\  and add 'nice-features.js' to the
// list in mods\mods.js. Restart Trimps. Uninstall: remove the line from mods.js and restart.

(function () {
	'use strict';
	const PREFIX = 'nf';

	// true = wrap the game functions even if a Trimps update changed them (at your own risk).
	const IGNORE_VERSION_CHECK = false;

	// Fingerprints of the wrapped game functions (Trimps 5.10.1).
	const FINGERPRINTS = {
		drawGrid: 'f59b109d',
		mapsSwitch: 'd1e6c1bd',
		updateButtonColor: '76eac7c6',
		tooltip: '6a625f44',
	};

	/* ------------------------------------------------------------------ Styles */
	// Colours fall back to plain values when the Nice Theme isn't active.
	const CSS = String.raw`
.battleCell { position: relative; }
.nfCellIcon {
	position: absolute; top: 2px; right: 3px;
	font-size: 0.6em; line-height: 1; pointer-events: none;
	text-shadow: 0 0 2px #000, 0 0 3px #000;
}
.nfCellIcon.nfLasting { color: #68d391; }
.nfCellIcon.nfLoot    { color: #f6c445; }
.nfCellIcon.nfBones   { color: #ffffff; }
.cellColorBeaten .nfCellIcon { opacity: 0.35; }

#nfPanel {
	margin: 0.4vh 2px 0;
	padding: 0.2vh 0.4vw 0.4vh;
	line-height: 1.2;
	background: var(--nt-panel-2, rgba(0, 0, 0, 0.35));
	border: 1px solid var(--nt-border, rgba(255, 255, 255, 0.15));
	border-radius: var(--nt-radius-sm, 4px);
	color: var(--nt-text, #fff);
	text-align: left;
}
.nfRow {
	display: flex; align-items: center;
	padding: 0.1vh 0; white-space: nowrap; cursor: default;
}
.nfRow > * + * { margin-left: 0.35vw; }
.nfRow + .nfRow { border-top: 1px solid var(--nt-border, rgba(255, 255, 255, 0.1)); }
.nfRow[hidden] { display: none; }
.nfIcon { width: 1.3em; text-align: center; flex: none; }
.nfValue { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; }
.nfRow .nfIcon.nfLasting { color: #68d391; }
.nfRow .nfIcon.nfOther   { color: var(--nt-accent, #8d9bff); }

/* Strip under the grid. No flex gap anywhere: the Steam build runs Chromium 69 (NW.js 0.33), which only
   supports gap in grid layouts, so flex spacing uses margins. */
#nfStrip {
	display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 0.5vh 0.6vw;
	margin: 0.6vh 0.4vw 0; color: var(--nt-text, #fff);
}
/* Nature and heirlooms take the first free rows of column 1, so without Nature the heirlooms sit
   next to the Story button instead of leaving an empty row. */
#nfNature { grid-column: 1; }
#nfHeirlooms { grid-column: 1; flex-direction: column; align-items: flex-start; }
#nfStoryBtn { grid-row: 1; grid-column: 2; align-self: start; }
#nfStrip[hidden], #nfStrip [hidden] { display: none !important; }
.nfStripRow { display: flex; align-items: center; flex-wrap: wrap; }
#nfStrip .btn { padding: 0.2vh 0.7vw; margin: 0; font-size: inherit; line-height: 1.3; }
#nfStrip .nfStripRow > * { margin: 0.2vh 0.4vw 0.2vh 0; }
.nfStripLabel { color: var(--nt-muted, #ccc); }
.nfStoryPill {
	display: inline-flex; align-items: center; padding: 0.1vh 0.7vw;
	border-radius: 999px; border: 1px solid #b4a7f5; background: rgba(180, 167, 245, 0.16);
	color: #ece8ff; white-space: nowrap; cursor: pointer;
	transition: background-color .12s ease;
}
.nfStoryPill:hover { background: rgba(180, 167, 245, 0.30); }
.nfStoryPill .glyphicon { color: #b4a7f5; margin-right: 0.35em; }
.nfArrow { color: var(--nt-dim, #999); }

.nfNat {
	display: inline-block; padding: 0.1vh 0.6vw; border-radius: 999px;
	color: #fff; text-shadow: 0 0 2px rgba(0, 0, 0, 0.6); white-space: nowrap;
}
.nfNatPoison { background: #2f855a; }
.nfNatWind   { background: #2b6cb0; }
.nfNatIce    { background: #90cdf4; color: #1a202c; text-shadow: none; }
.nfNat.nfNow { box-shadow: 0 0 0 2px var(--nt-text, #fff); }
.nfNatList { display: flex; flex-wrap: wrap; margin-top: 4px; }
.nfNatList > * { margin: 0 6px 6px 0; }

/* Heirlooms: one pill per type, like the Nature chips. The pill has its own dark fill, so it reads the
   same on every theme; the equipped heirloom gets a white ring. */
.nfHeirGroup {
	display: inline-flex; align-items: center; padding: 0.1vh 0.3vw 0.1vh 0.7vw;
	border-radius: 999px; border: 1px solid rgba(255, 255, 255, 0.15); background: rgba(0, 0, 0, 0.45);
	white-space: nowrap;
}
.nfHeirGroup > * + * { margin-left: 0.15vw; }
/* Every label holds all label words stacked in one grid cell (only its own visible), so all labels
   are as wide as the longest word and the heirlooms after them line up. */
.nfHeirLabel { display: inline-grid; color: #e6e6e6; margin-right: 0.3vw; }
.nfHeirLabel > span { grid-area: 1 / 1; }
.nfHeirLabel > .nfHeirLabelGhost { visibility: hidden; }
.nfHeir {
	display: inline-flex; align-items: center; justify-content: center;
	width: 1.5em; height: 1.5em; cursor: pointer; border-radius: 50%;
	transition: background-color .12s ease;
}
.nfHeir:hover { background: rgba(255, 255, 255, 0.14); }
.nfHeir.nfEquipped { cursor: default; background: rgba(255, 255, 255, 0.16); box-shadow: 0 0 0 1px #fff; }
/* Lighter versions of the darker rarity colors, so they stay readable on the dark pill. */
.nfHeir.heirloomRare1 { color: #5fcf5f; }
.nfHeir.heirloomRare2 { color: #8c8cff; }
.nfHeir.heirloomRare3 { color: #d77ad7; }
.nfHeir.heirloomRare5 { color: #ff7a7a; }
.nfHeir.heirloomRare7 { color: #ff7043; }
.nfHeir.heirloomRare8 { color: #4cc94c; }
.nfHeir.heirloomRare9 { color: #9d86ff; }
.nfHeir.heirloomRare11 { color: #4fb3f0; }

/* Mods tab on/off settings */
body.nfNoImpIcons .nfCellIcon, body.nfNoPanel #nfPanel,
body.nfNoNature #nfNature, body.nfNoHeirSwap #nfHeirlooms, body.nfNoStory #nfStoryBtn,
body.nfNoNature.nfNoHeirSwap.nfNoStory #nfStrip { display: none !important; }

/* Prestige warnings. --nt-shadow-sm only exists in the Nice Theme; elsewhere the fallback is no shadow. */
.upgradeThing.nfPrestigeFill, .upgradeThing.nfPrestigeLine { position: relative; }
.nfPrestigeFill.thingColorCanAfford {
	background: #8a4210 !important; border-color: #f6a25a !important; color: #fff !important;
	box-shadow: inset 3px 0 0 #ffc08a, var(--nt-shadow-sm, 0 0 0 transparent);
}
.thing.nfPrestigeFill.thingColorCanAfford:hover, .thing.nfPrestigeFill.thingColorCanAfford:active { background: #9c4d16 !important; }
.nfPrestigeLine.thingColorCanAfford {
	border-color: #f6a25a !important;
	box-shadow: inset 3px 0 0 #f6a25a, inset 0 0 0 1px #f6a25a, var(--nt-shadow-sm, 0 0 0 transparent);
}
.nfNeed {
	position: absolute; top: 2px; right: 3px; pointer-events: none;
	padding: 0 5px; border-radius: 8px; line-height: 1.3;
	background: #f6a25a; color: #1a1a1a;
}
.nfTipLine { margin-top: 0.5em; }

/* Story popup */
.nfStory { text-align: left; }
.nfStoryBar { display: flex; align-items: center; margin-bottom: 6px; color: var(--nt-muted, #ccc); }
.nfStoryCount { flex: 1 1 auto; margin-right: 0.6em; }
.nfStorySeg { display: inline-flex; border: 1px solid #b4a7f5; border-radius: 999px; overflow: hidden; }
.nfStorySeg span { padding: 0 0.8em; cursor: pointer; color: #ece8ff; }
.nfStorySeg span:hover { background: rgba(180, 167, 245, 0.18); }
.nfStorySeg span.nfOn { background: rgba(180, 167, 245, 0.35); }
.nfStoryList { max-height: 50vh; overflow-y: auto; padding-right: 6px; }
.nfStoryGroup {
	position: sticky; top: 0; z-index: 1; padding: 3px 0; margin-top: 4px;
	background: var(--nt-tip, #222); color: #b4a7f5; border-bottom: 1px solid rgba(180, 167, 245, 0.45);
}
.nfStoryEntry {
	display: grid; grid-template-columns: 4.2em 1fr; gap: 0.8em; padding: 6px 2px;
	border-bottom: 1px solid var(--nt-border, rgba(255, 255, 255, 0.12));
}
.nfStoryEntry:last-child { border-bottom: 0; }
.nfStoryZone {
	justify-self: start; align-self: start; padding: 0 0.5em; white-space: nowrap;
	border-radius: 999px; border: 1px solid rgba(180, 167, 245, 0.6); background: rgba(180, 167, 245, 0.16); color: #ece8ff;
}
.nfStoryText { line-height: 1.4; }

/* Light variants for the game's own themes (classes set by applyThemeClasses). */
body.nfLightStrip .nfStripLabel { color: #1a202c; }
body.nfLightStrip .nfStoryPill { background: #5b4bc4; border-color: #4535a8; color: #fff; }
body.nfLightStrip .nfStoryPill:hover { background: #4c3db3; }
body.nfLightStrip .nfStoryPill .glyphicon { color: #e4defd; }
body.nfLightTip .nfStoryBar { color: inherit; }
body.nfLightTip .nfStorySeg { border-color: #5b4bc4; }
body.nfLightTip .nfStorySeg span { color: #2d2370; }
body.nfLightTip .nfStorySeg span:hover { background: rgba(91, 75, 196, 0.15); }
body.nfLightTip .nfStorySeg span.nfOn { background: #5b4bc4; color: #fff; }
body.nfLightTip .nfStoryGroup { color: #3b2d99; border-bottom-color: rgba(69, 53, 168, 0.5); }
body.nfLightTip .nfStoryEntry { border-bottom-color: rgba(0, 0, 0, 0.15); }
body.nfLightTip .nfStoryZone { background: rgba(91, 75, 196, 0.14); border-color: rgba(69, 53, 168, 0.6); color: #2d2370; }
`;

	function injectStyle() {
		if (document.getElementById(PREFIX + 'Style')) return;
		const style = document.createElement('style');
		style.id = PREFIX + 'Style';
		style.textContent = CSS + iconColorCss();
		document.head.appendChild(style);
	}

	/* ------------------------------------------------------------------ Grid item icon colors */
	// The game draws item drops on the grid as plain icons. Resources are common, unlocks are one-time.
	const RESOURCE_ICONS = {
		'.glyphicon-apple': '#fc8181',               // Food
		'.glyphicon-tree-deciduous': '#d6a35c',      // Wood
		'.icon-cubes': '#a0c4e8',                    // Metal
		'.icon-leaf2': '#9ae6b4',                    // Food/Wood/Metal
		'.icon-diamond:not(.nfCellIcon)': '#f687b3', // Gems (Feyimp uses the same icon, but as our own corner icon)
		'.glyphicon-th': '#f6ad55',                  // Map Fragments
		'.glyphicon-gift': '#d4f56a',                // Battle Territory Bonus (more max Trimps, drops again like resources)
	};
	// Every icon in the game's worldUnlocks and mapUnlocks (Trimps 5.10.1) is in one of these groups,
	// except the Spire Metal and Colored Egg, which the game colors itself.
	const UNLOCK_ICONS = {
		'[title="New Weapon"]': '#ff8a65',
		'[title="New Armor"]': '#63b3ed',
		// Upgrades: books, plus Foreman, Meteorologists, Worshipper, Relentlessness, the Prismatic
		// shield upgrades and Coordination's Magma-zone archive.
		'.glyphicon-book, .glyphicon-user, .icon-radio2, .icon-library, .glyphicon-compressed, .icon-shield2, .icon-archive2': '#b4a7f5',
		// Unique maps: The Block, The Wall, Bionic Wonderland, Melting Point, Prismatic Palace, Dimension of Anger…
		'.glyphicon-th-large, .icon-map, .glyphicon-certificate, .glyphicon-eye-open': '#4fd1c5',
		// Buildings (and SmithFree, a free Smithy).
		'.icon-home4, .icon-home5, .icon-office, .icon-building, .glyphicon-home, .glyphicon-cog, .glyphicon-link, .glyphicon-dashboard': '#f7e7c4',
		// Bonuses and automation: Ancient Treasure, Heirloom, Keys, Egg, Portal, RoboTrimp,
		// Geneticistassist, Auspicious Presence.
		'.glyphicon-piggy-bank, .icon-archive, .icon-key4, .glyphicon-record, .glyphicon-repeat, .icon-chain, .icon-clipboard, .icon-eye4': '#f6e05e',
		// The game marks Mega/Giga upgrades purple (books, Geneticist, Gigastation, Warpstation, Formations).
		// Magenta keeps them apart from normal books. Last, so it wins over the groups above.
		'.brokenUpgrade': '#ff4fd8',
	};
	const OUTLINE = 'text-shadow: -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000;';

	// Setting values: 0 Vanilla, 1 Bright, 2 Dimmed, 3 Unlocks. Each is a class on <body>.
	function iconColorCss() {
		function sel(modes, icons, extra) {
			const out = [];
			modes.forEach(function (m) {
				icons.split(', ').forEach(function (icon) { out.push('body.nfIcons' + m + ' .battleCell' + (extra || '') + ' ' + icon); });
			});
			return out.join(',\n');
		}
		let css = '';
		Object.keys(UNLOCK_ICONS).forEach(function (icon) {
			css += sel([1, 2, 3], icon) + ' { color: ' + UNLOCK_ICONS[icon] + '; ' + OUTLINE + ' }\n';
		});
		Object.keys(RESOURCE_ICONS).forEach(function (icon) {
			css += sel([1, 2], icon) + ' { color: ' + RESOURCE_ICONS[icon] + '; ' + OUTLINE + ' }\n';
		});
		// Dimmed: resources faded and without the outline, except on the cell you're fighting (bright yellow).
		const res = Object.keys(RESOURCE_ICONS).join(', ');
		css += sel([2], res) + ' { opacity: 0.55; text-shadow: none; }\n';
		css += sel([2], res, '.cellColorCurrent') + ' { opacity: 1; ' + OUTLINE + ' }\n';
		return css;
	}

	/* ------------------------------------------------------------------ Settings (Mods tab) */
	// Titles are short enough to stay on one line on the settings button. Descriptions have no words
	// that match another settings tab's name (the game finds a tab's settings by text search: general,
	// layout, alerts, qol, performance, other), and no quotes or apostrophes (the game puts them inside
	// a quoted HTML attribute).
	const OPTIONS = [
		{
			key: 'nfGridIcons',
			titles: ['Grid Icons: Vanilla', 'Grid Icons: Bright', 'Grid Icons: Dimmed', 'Grid Icons: Unlocks'],
			fallback: 2,
			description: 'Colors for the item icons on the grid (Nice Features mod). '
				+ 'Vanilla: icons as the game draws them. '
				+ 'Bright: every drop in its own color. '
				+ 'Dimmed: one-time unlocks (equipment, books, unique maps, buildings) bright, and repeating drops (food, wood, metal, gems, fragments, territory bonus) faded. '
				+ 'Unlocks: only the one-time unlocks are colored.',
			onToggle: function () { applyBodyClasses(); },
		},
		{
			key: 'nfImpIcons',
			titles: ['Grid Imp Icons: Off', 'Grid Imp Icons: On'],
			fallback: 1,
			description: 'Small corner icons on the grid for exotic imps (Magnimp, Goblimp, Chronoimp and more) and Skeletimps, '
				+ 'so you can see where they are in the Zone or map (Nice Features mod).',
			onToggle: function () { applyBodyClasses(); },
		},
		{
			key: 'nfPanel',
			titles: ['Bonus Panel: Off', 'Bonus Panel: On'],
			fallback: 1,
			description: 'The panel under the battle buttons with your exotic imp bonuses, Blacksmithery Zone, Radortle and Void Maps (Nice Features mod).',
			onToggle: function () { applyBodyClasses(); },
		},
		{
			key: 'nfNature',
			titles: ['Nature Forecast: Off', 'Nature Forecast: On'],
			fallback: 1,
			description: 'The coming Nature empowerments under the grid (Universe 1 from Zone 236), '
				+ 'with a More button for the next 100 Zones (Nice Features mod).',
			onToggle: function () { applyBodyClasses(); },
		},
		{
			key: 'nfHeirSwap',
			titles: ['Heirloom Swap: Off', 'Heirloom Swap: On'],
			fallback: 1,
			description: 'Your carried Shields and Staffs under the grid: click one to equip it, hover it to see its mods (Nice Features mod).',
			onToggle: function () { applyBodyClasses(); },
		},
		{
			key: 'nfStory',
			titles: ['Story Button: Off', 'Story Button: On'],
			fallback: 1,
			description: 'A Story so far button under the grid that lists every story message up to your highest Zone, newest first (Nice Features mod).',
			onToggle: function () { applyBodyClasses(); },
		},
		{
			key: 'nfHotkeys',
			titles: ['Mod Hotkeys: Off', 'Mod Hotkeys: On'],
			fallback: 1,
			description: 'Q, W, E and R pick map presets 1 to 4 while the map screen is open (Nice Features mod). '
				+ 'Only while the game Hotkeys setting is on too.',
			onToggle: function () {},
		},
		{
			key: 'nfPrestigeWarn',
			titles: ['Prestige Warnings: Off', 'Prestige Warnings: On'],
			fallback: 1,
			description: 'Marks equipment prestige upgrades you can afford when the next tier starts weaker than your current item (Nice Features mod). '
				+ 'Orange outline: you have the metal (wood for Supershield) to buy back past your current item right away. '
				+ 'Orange fill: you can not buy back past it yet. '
				+ 'The number in the corner is how many levels the next tier needs to pass your current item. '
				+ 'Upgrades that are stronger even at level 1 keep their usual color.',
			onToggle: function () { refreshPrestigeWarnings(); },
		},
		{
			key: 'nfShiftMax',
			titles: ['Shift for Max: Off', 'Shift for Max: On'],
			fallback: 1,
			description: 'While you hold Shift, the buy amount switches to Max, on the buy tabs and in the portal perks, '
				+ 'so costs and amounts show what a click buys (Nice Features mod). Letting go of Shift switches back to your previous amount. '
				+ 'Max uses your Max split, the same as clicking the Max button.',
			onToggle: function () { if (optionValue('nfShiftMax') !== 1) keyUp('shift'); },
		},
		{
			key: 'nfAltCustom',
			titles: ['Alt for Custom: Off', 'Alt for Custom: On'],
			fallback: 1,
			description: 'While you hold the left Alt key, the buy amount switches to your Custom amount, on the buy tabs and in the portal perks (Nice Features mod). '
				+ 'Letting go switches back to your previous amount. With Shift held as well, the key you pressed last wins.',
			onToggle: function () { if (optionValue('nfAltCustom') !== 1) { keyUp('alt'); altTooltipOff(false); } },
		},
	];

	function optionValue(key) {
		const opt = OPTIONS.find(function (o) { return o.key === key; });
		const item = game.options.menu[key];
		return item ? item.enabled : opt.fallback;
	}

	// Settings that only show or hide something work through classes on <body> (see the CSS).
	function setBodyClass(name, want) {
		if (document.body.classList.contains(name) !== want) document.body.classList.toggle(name, want);
	}
	function applyBodyClasses() {
		const mode = optionValue('nfGridIcons');
		for (let i = 0; i < 4; i++) setBodyClass('nfIcons' + i, i === mode);
		setBodyClass('nfNoImpIcons', optionValue('nfImpIcons') !== 1);
		setBodyClass('nfNoPanel', optionValue('nfPanel') !== 1);
		setBodyClass('nfNoNature', optionValue('nfNature') !== 1);
		setBodyClass('nfNoHeirSwap', optionValue('nfHeirSwap') !== 1);
		setBodyClass('nfNoStory', optionValue('nfStory') !== 1);
		applyThemeClasses();
	}

	// The game's own themes differ: Black Background, Default and Gradient have light grey popups
	// and a light area under the grid (see-through grey over the background picture); only the
	// Dark theme and the Nice Theme are dark there. The mod's purple designs get a darker variant there (CSS: nfLightTip,
	// nfLightStrip). Runs once a second, so a theme change is picked up within a second.
	function isLight(color) {
		const m = /rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?/.exec(color || '');
		if (!m || (m[4] !== undefined && Number(m[4]) < 0.5)) return false;
		return (0.299 * m[1] + 0.587 * m[2] + 0.114 * m[3]) / 255 > 0.6;
	}
	function applyThemeClasses() {
		const tip = document.getElementById('tooltipDiv');
		setBodyClass('nfLightTip', !!tip && isLight(getComputedStyle(tip).backgroundColor));
		const theme = game.options.menu.darkTheme && game.options.menu.darkTheme.enabled;
		// Default and Gradient have a light grey battle area; Black Background's is dark grey.
		setBodyClass('nfLightStrip', theme === 1 || theme === 3);
	}

	// Settings > Mods comes from the Nice Mod Loader (mods.js). Without it the settings keep their
	// fallback values.
	function registerOptions() {
		if (!window.NiceModLoader) {
			console.warn('[Nice Features] Nice Mod Loader (mods.js) not found, so the settings are not in Settings > Mods.');
			return;
		}
		NiceModLoader.register({ name: 'Nice Features', options: OPTIONS });
	}

	/* ------------------------------------------------------------------ Prestige warnings */
	// An equipment prestige resets the item to level 1 of the next tier. When that level is weaker than
	// the item's current total, the button gets an orange outline (you can buy back past it right away)
	// or an orange fill (you can't yet), plus a corner badge with the levels needed. Same numbers as
	// the game: the next tier's stat (as in getNextPrestigeValue), its cost (getNextPrestigeCost, which
	// is also the upgrade's own metal/wood cost) and the price multiplier (getEquipPriceMult).
	function prestigeCheck(what) {
		const upgrade = game.upgrades[what];
		const equip = upgrade && upgrade.prestiges && game.equipment[upgrade.prestiges];
		if (!equip || equip.locked) return null;
		const stat = equip.blockNow ? 'block' : (typeof equip.health !== 'undefined' ? 'health' : 'attack');
		const current = equip[stat + 'Calculated'] * equip.level;
		const perLevel = Math.round(equip[stat] * Math.pow(1.19, equip.prestige * game.global.prestige[stat] + 1));
		if (!(perLevel > 0) || perLevel >= current) return null; // stronger even at level 1
		const levels = Math.floor(current / perLevel) + 1;       // first level that passes the current total
		const res = what === 'Supershield' ? 'wood' : 'metal';
		const base = getNextPrestigeCost(what);
		const ratio = equip.cost[res][1];
		const mult = getEquipPriceMult();
		// The prestige gives level 1 for free; buy levels 2..levels, like the game prices them.
		const n = levels - 1;
		const levelCost = Math.ceil(Math.floor(base * ratio * (Math.pow(ratio, n) - 1) / (ratio - 1)) * mult);
		const total = base * mult + levelCost;
		const owned = game.resources[res].owned;
		return { item: upgrade.prestiges, levels: levels, res: res, total: total, short: total - owned, enough: owned >= total };
	}

	// Runs after the game colours an upgrade button, so it sees the game's own "can afford" class.
	function markPrestige(what) {
		const elem = document.getElementById(what);
		if (!elem) return;
		const info = optionValue('nfPrestigeWarn') === 1 && elem.classList.contains('thingColorCanAfford') ? prestigeCheck(what) : null;
		const fill = !!info && !info.enough;
		const line = !!info && info.enough;
		if (elem.classList.contains('nfPrestigeFill') !== fill) elem.classList.toggle('nfPrestigeFill', fill);
		if (elem.classList.contains('nfPrestigeLine') !== line) elem.classList.toggle('nfPrestigeLine', line);
		let badge = elem.querySelector('.nfNeed');
		if (!info) { if (badge) badge.remove(); return; }
		if (!badge) {
			badge = document.createElement('span');
			badge.className = 'nfNeed';
			elem.appendChild(badge);
		}
		const text = info.levels > 999 ? prettify(info.levels) : String(info.levels);
		if (badge.textContent !== text) badge.textContent = text;
	}

	function refreshPrestigeWarnings() {
		Object.keys(game.upgrades).forEach(function (name) {
			const u = game.upgrades[name];
			if (u.prestiges && !u.locked) markPrestige(name);
		});
	}

	// Extra line in the upgrade's tooltip, under the game's "Your next X will grant ..." line.
	function prestigeTipLine(what) {
		// The game ignores hovers while a popup is locked open; don't add the line to that popup.
		if (optionValue('nfPrestigeWarn') !== 1 || game.global.lockTooltip) return;
		const info = prestigeCheck(what);
		const tip = document.getElementById('tipText');
		if (!info || !tip) return;
		const line = document.createElement('div');
		line.className = 'nfTipLine';
		line.textContent = 'Nice Features: the next ' + info.item + ' needs ' + prettify(info.levels) + ' levels to pass your current one, '
			+ prettify(info.total) + ' ' + info.res + ' including this upgrade'
			+ (info.enough ? ' (you have it).' : ' (' + prettify(info.short) + ' more than you have).');
		tip.appendChild(line);
	}

	/* ------------------------------------------------------------------ Grid icons */
	// kind: lasting = permanent bonus for this run, loot = temporary/loot bonus, bones = bone drop.
	const CELL_ICONS = {
		Magnimp:       { icon: 'glyphicon glyphicon-magnet',        kind: 'nfLasting' },
		Venimp:        { icon: 'glyphicon glyphicon-baby-formula',  kind: 'nfLasting' },
		Whipimp:       { icon: 'icomoon icon-area-graph',           kind: 'nfLasting' },
		Tauntimp:      { icon: 'glyphicon glyphicon-tent',          kind: 'nfLasting' },
		Goblimp:       { icon: 'icomoon icon-evil',                 kind: 'nfLoot' },
		Flutimp:       { icon: 'glyphicon glyphicon-globe',         kind: 'nfLoot' },
		Jestimp:       { icon: 'icomoon icon-mask',                 kind: 'nfLoot' },
		Titimp:        { icon: 'icomoon icon-hammer',               kind: 'nfLoot' },
		Chronoimp:     { icon: 'glyphicon glyphicon-hourglass',     kind: 'nfLoot' },
		Feyimp:        { icon: 'icomoon icon-diamond',              kind: 'nfLoot' },
		Turkimp:       { icon: 'icomoon icon-birthday-cake',        kind: 'nfLoot' },
		Skeletimp:     { icon: 'glyphicon glyphicon-italic',        kind: 'nfBones' },
		Megaskeletimp: { icon: 'glyphicon glyphicon-italic',        kind: 'nfBones' },
	};

	function cellTitle(cell) {
		let title = cell.name.replace(/_/g, ' ');
		if (cell.corrupted && cell.corrupted !== 'none' && window.mutationEffects && mutationEffects[cell.corrupted]) {
			title += ' – ' + mutationEffects[cell.corrupted].title;
		}
		return title;
	}

	function decorateGrid(maps) {
		const cells = maps ? game.global.mapGridArray : game.global.gridArray;
		if (!cells) return;
		const idText = maps ? 'mapCell' : 'cell';
		for (let i = 0; i < cells.length; i++) {
			const li = document.getElementById(idText + i);
			const cell = cells[i];
			if (!li || !cell || !cell.name) continue;
			// Hover text: the game's own title (Token of…, Colored Egg) plus the enemy name.
			if (li.dataset.nfName !== cell.name) {
				if (li.dataset.nfBase === undefined) li.dataset.nfBase = li.title || '';
				li.dataset.nfName = cell.name;
				li.title = (li.dataset.nfBase ? li.dataset.nfBase + '\n' : '') + cellTitle(cell);
			}
			const def = CELL_ICONS[cell.name];
			const existing = li.querySelector('.nfCellIcon');
			if (existing && (!def || existing.dataset.for !== cell.name)) existing.remove();
			if (def && (!existing || existing.dataset.for !== cell.name)) {
				const span = document.createElement('span');
				span.className = 'nfCellIcon ' + def.kind + ' ' + def.icon;
				span.dataset.for = cell.name;
				span.setAttribute('aria-hidden', 'true');
				li.appendChild(span);
			}
		}
	}

	// Runs right after each redraw (observer callbacks run before the next paint, so no flicker).
	// Adding the icons triggers the observer once more, which then finds nothing to change.
	function queueGrid() {
		try {
			decorateGrid(false);
			if (game.global.mapsActive) decorateGrid(true);
		} catch (e) { console.error('[Nice Features]', e); }
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

	// Wraps window[name] so after(result, args) runs once the game's original has. Returns false when
	// the function changed since this mod was made (unless IGNORE_VERSION_CHECK) or is missing.
	const changedFns = [];
	const EFFECT_WHEN_OFF = {
		drawGrid: 'grid icons are off',
		mapsSwitch: 'the strip hides up to a second late in the map screen',
		updateButtonColor: 'prestige warnings are off',
		tooltip: 'the prestige line in upgrade tooltips is off',
	};
	function wrap(name, after) {
		const original = window[name];
		const now = fingerprint(original);
		if (now !== FINGERPRINTS[name]) {
			changedFns.push({ name: name, now: now });
			console.warn('[Nice Features] Game function ' + name + ' changed, fingerprint now ' + now);
			if (!IGNORE_VERSION_CHECK || now === 'missing') return false;
		}
		const wrapper = function () {
			const result = original.apply(this, arguments);
			try { after.call(this, result, arguments); } catch (e) { console.error('[Nice Features]', e); }
			return result;
		};
		wrapper.__original = original;
		window[name] = wrapper;
		return true;
	}

	function warnChanged() {
		if (!changedFns.length) return;
		const list = changedFns.map(function (f) { return f.name + ' (now ' + f.now + ')'; }).join(', ');
		const effects = changedFns.map(function (f) { return EFFECT_WHEN_OFF[f.name]; }).join(', and ');
		const bar = document.createElement('div');
		bar.id = 'nfWarning';
		bar.style.cssText = 'position:fixed;top:0;left:50%;transform:translateX(-50%);z-index:100000;max-width:90vw;'
			+ 'padding:0.5em 2.2em 0.5em 1em;background:#7f1d1d;color:#fff;border:1px solid #fca5a5;border-top:0;';
		bar.textContent = IGNORE_VERSION_CHECK
			? 'Nice Features is running although a Trimps update changed ' + list + ' (IGNORE_VERSION_CHECK is on).'
			: 'Nice Features: a Trimps update changed ' + list + ', so ' + effects + '. '
				+ 'The mod needs an update; to run it anyway, set IGNORE_VERSION_CHECK = true in mods/nice-features.js.';
		const close = document.createElement('span');
		close.textContent = '×';
		close.title = 'Close';
		close.style.cssText = 'position:absolute;right:0.6em;top:0.4em;cursor:pointer;';
		close.onclick = function () { bar.remove(); };
		bar.appendChild(close);
		document.body.appendChild(bar);
	}

	function watchGrids() {
		// The game redraws a grid by replacing its HTML, so put the icons back after each redraw.
		if (wrap('drawGrid', function (result, args) {
			decorateGrid(!!args[0]);
		})) queueGrid();
	}

	/* ------------------------------------------------------------------ Side panel */
	function pct(mult) { return '+' + prettify((mult - 1) * 100) + '%'; }
	function impBonus(name) { return Math.pow(1.003, game.unlocks.impCount[name] || 0); }
	function smithTalent() {
		const t = game.talents;
		if (t.blacksmith3 && t.blacksmith3.purchased) return { name: 'Blacksmithery III', part: 0.9, words: '90%' };
		if (t.blacksmith2 && t.blacksmith2.purchased) return { name: 'Blacksmithery II', part: 0.75, words: '75%' };
		if (t.blacksmith && t.blacksmith.purchased) return { name: 'Blacksmithery I', part: 0.5, words: 'half' };
		return null;
	}
	function smithZone(s) { return Math.floor((getHighestLevelCleared(false, true) + 1) * s.part); }
	function radortleLevel() {
		return Fluffy.isRewardActive('radortle2') ? game.global.highestRadonLevelCleared + 1 : game.global.lastRadonPortal;
	}

	// Each row: when to show it, what to show, and the hover text.
	const ROWS = [
		{
			id: 'Magnimp', icon: 'glyphicon glyphicon-magnet', kind: 'nfLasting', label: 'Magnimp',
			value: function () { return pct(impBonus('Magnimp')); },
			tip: function () { return 'Each Magnimp you\'ve killed this run gives +0.3% loot from maps and Zones (compounding, not ' + heliumOrRadon() + ').<br>Magnimps killed: ' + prettify(game.unlocks.impCount.Magnimp); },
		},
		{
			id: 'Venimp', icon: 'glyphicon glyphicon-baby-formula', kind: 'nfLasting', label: 'Venimp',
			value: function () { return pct(impBonus('Venimp')); },
			tip: function () { return 'Each Venimp you\'ve killed this run gives +0.3% Trimp breed speed (compounding).<br>Venimps killed: ' + prettify(game.unlocks.impCount.Venimp); },
		},
		{
			id: 'Whipimp', icon: 'icomoon icon-area-graph', kind: 'nfLasting', label: 'Whipimp',
			value: function () { return pct(impBonus('Whipimp')); },
			tip: function () { return 'Each Whipimp you\'ve killed this run gives +0.3% Trimp resource production (compounding).<br>Whipimps killed: ' + prettify(game.unlocks.impCount.Whipimp); },
		},
		{
			id: 'Smithy', icon: 'icomoon icon-hammer', kind: 'nfOther', label: 'Prestige drops',
			show: function () { return !!smithTalent(); },
			value: function () { return 'Z' + smithZone(smithTalent()); },
			tip: function () { const s = smithTalent(); return s.name + ': each Zone you clear through Z' + smithZone(s) + ' (' + s.words + ' of your highest Zone) drops all available equipment prestiges.'; },
		},
		{
			id: 'Radortle', icon: 'icomoon icon-cloud3', kind: 'nfOther', label: 'Radortle',
			show: function () { return game.global.universe === 2 && Fluffy.isRewardActive('radortle'); },
			value: function () { return pct(Fluffy.getRadortleMult()); },
			tip: function () { return Fluffy.getName() + '\'s Radortle: +3% Radon (compounding) for each Zone up to Z' + radortleLevel() + (Fluffy.isRewardActive('radortle2') ? ' (your highest Zone + 1).' : ' (the Zone of your last Portal).'); },
		},
		{
			id: 'Voids', icon: 'glyphicon glyphicon-globe', kind: 'nfOther', label: 'Void Maps',
			value: function () {
				const stacks = Fluffy.isRewardActive('void') ? countStackedVoidMaps() : 0;
				return prettify(game.global.totalVoidMaps) + (stacks ? ' (' + stacks + ')' : '');
			},
			tip: function () {
				const stacks = Fluffy.isRewardActive('void') ? countStackedVoidMaps() : 0;
				return 'You have ' + prettify(game.global.totalVoidMaps) + ' Void Map' + (game.global.totalVoidMaps === 1 ? '' : 's') + (stacks ? ', in ' + stacks + ' stack' + (stacks === 1 ? '' : 's') : '') + '.';
			},
		},
	];

	function showTip(event, title, text) {
		tooltip(title, 'customText', event, text);
	}

	function buildPanel() {
		const column = document.getElementById('battleBtnsColumn');
		if (!column || document.getElementById('nfPanel')) return;
		const panel = document.createElement('div');
		panel.id = 'nfPanel';
		ROWS.forEach(function (row) {
			const el = document.createElement('div');
			el.className = 'nfRow';
			el.id = 'nfRow' + row.id;
			el.innerHTML = '<span class="nfIcon ' + row.kind + ' ' + row.icon + '" aria-hidden="true"></span>' +
				'<span class="nfValue"></span>';
			el.addEventListener('mouseover', function (e) { try { showTip(e, row.label, row.tip()); } catch (err) { /* game not ready */ } });
			el.addEventListener('mouseout', function () { tooltip('hide'); });
			panel.appendChild(el);
		});
		column.appendChild(panel);
		updatePanel();
	}

	function updatePanel() {
		if (!document.getElementById('nfPanel')) return;
		ROWS.forEach(function (row) {
			const el = document.getElementById('nfRow' + row.id);
			let shown = true, value = '';
			try {
				shown = row.show ? row.show() : true;
				if (shown) value = row.value();
			} catch (e) { shown = false; }
			if (el.hidden !== !shown) el.hidden = !shown;
			const v = el.lastChild;
			if (shown && v.textContent !== value) v.textContent = value;
		});
	}

	/* ------------------------------------------------------------------ Strip under the grid */
	function el(tag, cls, text) {
		const e = document.createElement(tag);
		if (cls) e.className = cls;
		if (text !== undefined) e.textContent = text;
		return e;
	}
	function hoverTip(elem, title, textFn) {
		elem.addEventListener('mouseover', function (e) { try { tooltip(title, 'customText', e, textFn()); } catch (err) { /* game not ready */ } });
		elem.addEventListener('mouseout', function () { tooltip('hide'); });
	}

	function buildStrip() {
		const container = document.getElementById('gridContainer');
		if (!container || document.getElementById('nfStrip')) return;
		const strip = el('div');
		strip.id = 'nfStrip';

		const nature = el('div', 'nfStripRow');
		nature.id = 'nfNature';
		strip.appendChild(nature);

		const heirs = el('div', 'nfStripRow');
		heirs.id = 'nfHeirlooms';
		strip.appendChild(heirs);
		// A pill like the Nature chips, in the purple the grid uses for books.
		const story = el('span', 'nfStoryPill');
		story.innerHTML = '<span class="glyphicon glyphicon-book" aria-hidden="true"></span>Story';
		story.id = 'nfStoryBtn';
		story.setAttribute('role', 'button');
		hoverTip(story, 'Story so far', function () { return 'Read every story message up to your highest Zone in this universe, newest first.'; });
		story.addEventListener('click', function () { tooltip('hide'); showStory(); story.blur(); });
		strip.appendChild(story);

		container.appendChild(strip);
		updateStrip();
	}

	// --- Nature
	// Empowerments change every 5 Zones; blocks start at the nature start zone (Z236, or Z1 in Eradicated).
	function natureChanges(count) {
		const world = game.global.world;
		const start = getNatureStartZone();
		const out = [{ zone: world, name: getEmpowerment(), now: true }];
		let next = world - ((world - start) % 5) + 5;
		for (let i = 0; i < count; i++, next += 5) out.push({ zone: next, name: getEmpowerment(next - world) });
		return out;
	}
	function natureChip(c) {
		const chip = el('span', 'nfNat nfNat' + c.name + (c.now ? ' nfNow' : ''), 'Z' + c.zone + ' ' + c.name);
		return chip;
	}
	let natureKey = '';
	function updateNature() {
		const row = document.getElementById('nfNature');
		const active = !!getEmpowerment();
		row.hidden = !active;
		if (!active) { natureKey = ''; return; }
		const key = game.global.universe + ':' + game.global.world + ':' + getNatureStartZone();
		if (key === natureKey) return;
		natureKey = key;
		row.textContent = '';
		row.appendChild(el('span', 'nfStripLabel', 'Nature'));
		natureChanges(3).forEach(function (c, i) {
			if (i) row.appendChild(el('span', 'nfArrow', '›'));
			row.appendChild(natureChip(c));
		});
		const more = el('span', 'btn btn-default', 'More');
		more.setAttribute('role', 'button');
		more.addEventListener('click', function () { tooltip('hide'); showNature(); more.blur(); });
		row.appendChild(more);
	}
	function showNature() {
		const list = el('div', 'nfNatList');
		natureChanges(20).forEach(function (c) { list.appendChild(natureChip(c)); });
		const wrap = el('div');
		wrap.appendChild(el('div', '', 'The empowerment for your current Zone, then each change over the next 100 Zones.'));
		wrap.appendChild(list);
		tooltip('Nature Zones', 'customText', 'lock', wrap.outerHTML);
	}

	// --- Heirlooms
	let heirKey = '';
	function updateHeirlooms() {
		const box = document.getElementById('nfHeirlooms');
		const unlocked = getComputedStyle(document.getElementById('heirloomBtnContainer')).display !== 'none';
		const carried = game.global.heirloomsCarried || [];
		const groups = ['Shield', 'Staff'].map(function (type) {
			const items = [];
			const eq = game.global[type + 'Equipped'];
			if (eq && eq.name !== undefined) items.push({ h: eq, index: -1, location: type + 'Equipped' });
			carried.forEach(function (h, i) { if (h.type === type) items.push({ h: h, index: i, location: 'heirloomsCarried' }); });
			// Oldest first: the game sets an heirloom's id to the number of heirlooms found so far, so
			// each one keeps its slot and equipping one only moves the ring.
			items.sort(function (a, b) { return a.h.id - b.h.id; });
			return { type: type, items: items };
		});
		const show = unlocked && groups.some(function (g) { return g.items.length > 1; });
		box.hidden = !show;
		if (!show) { heirKey = ''; return; }
		const key = groups.map(function (g) { return g.items.map(function (it) { return it.h.id + '.' + it.h.rarity + '.' + it.h.icon + '.' + it.h.name + '.' + it.index; }).join(','); }).join('|');
		if (key === heirKey) return;
		heirKey = key;
		box.textContent = '';
		groups.forEach(function (g) {
			if (!g.items.length) return;
			const group = el('div', 'nfHeirGroup');
			const label = el('span', 'nfHeirLabel');
			const text = g.type === 'Shield' ? 'Shields' : 'Staffs';
			['Shields', 'Staffs'].forEach(function (word) {
				label.appendChild(el('span', word === text ? '' : 'nfHeirLabelGhost', word));
			});
			group.appendChild(label);
			g.items.forEach(function (it) {
				const equipped = it.index === -1;
				const btn = el('span', 'nfHeir heirloomRare' + it.h.rarity + (equipped ? ' nfEquipped' : ''));
				btn.setAttribute('role', 'button');
				btn.setAttribute('aria-label', it.h.name + (equipped ? ' (equipped)' : ''));
				const icon = el('span', getHeirloomIcon(it.h));
				icon.setAttribute('aria-hidden', 'true');
				btn.appendChild(icon);
				// The game's own heirloom tooltip, with name and mods.
				btn.addEventListener('mouseover', function (e) { tooltip('Heirloom', null, e, null, it.index, it.location); });
				btn.addEventListener('mouseout', function () { tooltip('hide'); });
				if (!equipped) {
					btn.addEventListener('click', function () {
						tooltip('hide');
						equipHeirloomById(it.h.id, it.h.type);
						if (typeof heirloomsShown !== 'undefined' && heirloomsShown) populateHeirloomWindow();
						updateHeirlooms();
					});
				}
				group.appendChild(btn);
			});
			box.appendChild(group);
		});
	}

	// --- Story
	// Story popup: the game's wide popup size, Zone pills in their own column, entries grouped by
	// 100 Zones (the group header stays at the top while scrolling), and a newest/oldest switch.
	let storyNewestFirst = true;
	function showStory() {
		applyThemeClasses();
		const highest = game.global.universe === 2 ? game.global.highestRadonLevelCleared : game.global.highestLevelCleared;
		const entries = [];
		for (let z = 1; z <= highest + 1; z++) {
			let text = getWorldText(z);
			if (Array.isArray(text)) text = text[0];
			if (text) entries.push({ zone: z, text: text });
		}
		const wrap = el('div', 'nfStory');
		if (!entries.length) {
			wrap.textContent = 'No story yet.';
		} else {
			const bar = el('div', 'nfStoryBar');
			bar.appendChild(el('span', 'nfStoryCount', entries.length + ' story messages up to Zone ' + (highest + 1)));
			const seg = el('span', 'nfStorySeg');
			seg.appendChild(el('span', '', 'Newest first')).dataset.newest = '1';
			seg.appendChild(el('span', '', 'Oldest first')).dataset.newest = '0';
			bar.appendChild(seg);
			wrap.appendChild(bar);
			wrap.appendChild(el('div', 'nfStoryList'));
		}
		tooltip('The Story So Far' + (game.global.universe === 2 ? ' (Universe 2)' : ''), 'customText', 'lock', wrap.outerHTML);
		const tipDiv = document.getElementById('tooltipDiv');
		if (tipDiv) swapClass('tooltipExtra', 'tooltipExtraLg', tipDiv); // the game's own 50% wide popup
		const box = document.querySelector('#tipText .nfStory');
		if (!box || !entries.length) return;
		// Group headers need a solid background to cover the entries scrolling under them.
		const bg = tipDiv ? getComputedStyle(tipDiv).backgroundColor : '';
		box.querySelectorAll('.nfStorySeg span').forEach(function (s) {
			s.addEventListener('click', function () { storyNewestFirst = s.dataset.newest === '1'; render(); });
		});
		function render() {
			box.querySelectorAll('.nfStorySeg span').forEach(function (s) {
				s.classList.toggle('nfOn', (s.dataset.newest === '1') === storyNewestFirst);
			});
			const list = box.querySelector('.nfStoryList');
			list.textContent = '';
			const ordered = storyNewestFirst ? entries.slice().reverse() : entries;
			let group = null;
			ordered.forEach(function (e) {
				const g = Math.floor((e.zone - 1) / 100);
				if (g !== group) {
					group = g;
					const head = el('div', 'nfStoryGroup', 'Zones ' + (g * 100 + 1) + ' to ' + (g * 100 + 100));
					if (bg && bg !== 'rgba(0, 0, 0, 0)') head.style.backgroundColor = bg;
					list.appendChild(head);
				}
				const row = el('div', 'nfStoryEntry');
				row.appendChild(el('span', 'nfStoryZone', 'Z' + e.zone));
				row.appendChild(el('span', 'nfStoryText', e.text));
				list.appendChild(row);
			});
			list.scrollTop = 0;
		}
		render();
	}

	function updateStrip() {
		const strip = document.getElementById('nfStrip');
		if (!strip) return;
		updateNature();
		updateHeirlooms();
	}
	// The map chooser and the extra info under the grid need that space, so step aside for them.
	function updateStripVisibility() {
		const strip = document.getElementById('nfStrip');
		if (!strip) return;
		const hide = !!game.global.preMapsActive;
		if (strip.hidden !== hide) strip.hidden = hide;
	}

	/* ------------------------------------------------------------------ Hotkeys */
	function typingInField(e) {
		const t = e.target;
		return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
	}
	const PRESET_KEYS = { KeyQ: 1, KeyW: 2, KeyE: 3, KeyR: 4 };
	function onKeyDown(e) {
		try {
			if (e.ctrlKey || e.altKey || e.metaKey || typingInField(e)) return;
			if (!game.options.menu.hotkeys.enabled || optionValue('nfHotkeys') !== 1) return;
			if (game.global.lockTooltip || game.options.displayed) return;
			if (typeof portalWindowOpen !== 'undefined' && portalWindowOpen) return;
			const preset = PRESET_KEYS[e.code];
			if (preset && game.global.preMapsActive && !e.shiftKey) {
				selectAdvMapsPreset(preset);
				e.stopPropagation(); // keep the game's own E (Equality) from also firing here
				e.preventDefault();
			}
		} catch (err) { console.error('[Nice Features]', err); }
	}

	/* ------------------------------------------------------------------ Shift for Max, Alt for Custom */
	// Holding Shift selects the Max buy tab, holding the left Alt key the Custom one (main buy tabs, or
	// the perk tabs in the portal and View Perks), through the game's own numTab, so every cost and
	// amount the game shows matches what a click buys. With both held, the key pressed last wins.
	// Letting go of the last one selects the tab you had before, unless the tab or screen changed some
	// other way meanwhile. Alt waits a moment first, so a quick Alt+Tab does not flip the tab. The right
	// Alt key is left alone: on many keyboards it is AltGr, which also reports Ctrl.
	const HOLD_KEYS = {
		shift: { option: 'nfShiftMax', tab: 6, delay: 0 },
		alt: { option: 'nfAltCustom', tab: 5, delay: 150 },
	};
	let hold = null; // { tab, portal, expect, keys } from the first key press until the last release
	const holdTimers = {};

	// The perk tabs show both in the portal and in View Perks, and the buy tabs are hidden then.
	function portalOpen() {
		const ptab = document.getElementById('ptab6');
		return !!(ptab && ptab.offsetParent);
	}
	function holdKeyName(e) {
		if (e.key === 'Shift') return 'shift';
		if (e.key === 'Alt' && e.code === 'AltLeft') return 'alt';
		return null;
	}
	// The amount the game stores for a tab (savedBuyAmt holds amounts, not tab numbers).
	function tabAmount(tab) {
		return ({ 1: 1, 2: 10, 3: 25, 4: 100, 5: game.global.lastCustomAmt, 6: 'Max' })[tab];
	}

	// Selects the tab of the last key still held, or the saved one when none are.
	function showHeldTab() {
		const last = hold.keys[hold.keys.length - 1];
		const tab = last ? HOLD_KEYS[last].tab : hold.tab;
		// Never re-select a selected tab: a second click on Max opens the Max split popup.
		if (game.global.numTab !== tab) selectTab(tab, hold.portal);
		hold.expect = game.global.numTab;
	}
	// numTab(5) hides the tooltip (it is also what the Custom popup's Apply button calls), so put back
	// the tooltip of what you hover, and the one waiting for Shift.
	function selectTab(tab, portal) {
		if (tab !== 5) { numTab(tab, portal); return; }
		const update = window.tooltipUpdateFunction;
		const waiting = window.onShift;
		const tip = document.getElementById('tooltipDiv');
		const shown = !!tip && tip.style.display === 'block';
		numTab(5, portal);
		if (typeof waiting === 'function') window.onShift = waiting;
		if (shown && typeof update === 'function') {
			window.tooltipUpdateFunction = update;
			update();
		}
	}
	function holdIsOurs() {
		return game.global.numTab === hold.expect && portalOpen() === hold.portal;
	}

	function keyDown(name, e) {
		if (e.repeat || e.ctrlKey || e.metaKey || typingInField(e)) return;
		// A popup is open (its buttons may need the amount; numTab(5) would also unlock it).
		if (game.global.lockTooltip) return;
		if (optionValue(HOLD_KEYS[name].option) !== 1 || typeof numTab !== 'function') return;
		if ((hold && hold.keys.indexOf(name) !== -1) || holdTimers[name]) return;
		const delay = HOLD_KEYS[name].delay;
		if (!delay) { pressKey(name); return; }
		holdTimers[name] = setTimeout(function () {
			holdTimers[name] = null;
			try { pressKey(name); } catch (err) { console.error('[Nice Features]', err); }
		}, delay);
	}
	function pressKey(name) {
		if (hold && !holdIsOurs()) hold = null; // changed meanwhile: start over from what is selected now
		if (!hold) {
			const portal = portalOpen();
			const maxTab = document.getElementById(portal ? 'ptab6' : 'tab6');
			if (!maxTab || !maxTab.offsetParent) return; // not on screen (yet)
			hold = { tab: game.global.numTab, portal: portal, expect: game.global.numTab, keys: [] };
		}
		hold.keys.push(name);
		showHeldTab();
		if (name === 'alt') { altTooltipOn(); restoreHoverTip(); }
	}

	// On Windows a lone Alt key also goes to the window itself (menu mode), which counts as the mouse
	// leaving the page and closes the tooltip. The mod's key events cancel that default, and as a
	// fallback the tooltip of what you hover is put back if it closed while the mouse stayed still.
	let altHoverTip = null; // { update, waiting } saved when Alt went down
	const mouse = { x: -1, y: -1 }; // last mouse position
	function altKeyUsed(e) {
		return optionValue('nfAltCustom') === 1 && !e.ctrlKey && !e.metaKey && !typingInField(e);
	}
	function saveHoverTip() {
		const tip = document.getElementById('tooltipDiv');
		const shown = !!tip && tip.style.display === 'block' && !game.global.lockTooltip;
		const update = window.tooltipUpdateFunction;
		altHoverTip = {
			update: shown && typeof update === 'function' ? update : null,
			waiting: typeof window.onShift === 'function' ? window.onShift : null,
		};
		altHoverTip.x = mouse.x;
		altHoverTip.y = mouse.y;
	}
	function restoreHoverTip() {
		if (!altHoverTip || game.global.lockTooltip) return;
		// Moved away: the tooltip closed for real. (Chromium also sends mousemove without moving, after a redraw.)
		if (Math.abs(mouse.x - altHoverTip.x) > 3 || Math.abs(mouse.y - altHoverTip.y) > 3) return;
		if (!window.onShift && altHoverTip.waiting && !window.shiftPressed) window.onShift = altHoverTip.waiting;
		const tip = document.getElementById('tooltipDiv');
		if (!altHoverTip.update || !tip || tip.style.display === 'block') return;
		if (!game.options.menu.tooltips.enabled && !window.shiftPressed) return; // Shift for Tooltips: closed is right
		window.tooltipUpdateFunction = altHoverTip.update;
		altHoverTip.update();
	}

	// With the game's Tooltips setting off, holding Shift shows the tooltip of what you hover. Alt does
	// the same while it holds the Custom amount: it sets the game's shiftPressed flag and shows the
	// waiting tooltip, as the game's own Shift key-down does; letting go undoes it, as Shift's key-up.
	let altSetShift = false;
	function altTooltipOn() {
		if (game.options.menu.tooltips.enabled || window.shiftPressed) return;
		window.shiftPressed = true;
		altSetShift = true;
		const show = window.onShift;
		window.onShift = null;
		if (typeof show === 'function') show();
	}
	// Shift let go while Alt is still held: the game's own Shift key-up (after this one) clears the flag
	// and hides the tooltip, so put both back once it has run.
	function altTooltipKeep() {
		const update = window.tooltipUpdateFunction;
		setTimeout(function () {
			if (!altSetShift) return;
			window.shiftPressed = true;
			if (typeof update === 'function') {
				window.tooltipUpdateFunction = update;
				try { update(); } catch (e) { console.error('[Nice Features]', e); }
			}
		}, 0);
	}
	function altTooltipOff(shiftDown) {
		if (!altSetShift) return;
		altSetShift = false;
		if (shiftDown) return; // Shift is held for real: the game takes it from here
		window.shiftPressed = false;
		if (!game.options.menu.tooltips.enabled) tooltip('hide');
	}
	function keyUp(name) {
		if (holdTimers[name]) { clearTimeout(holdTimers[name]); holdTimers[name] = null; }
		if (!hold) return;
		const i = hold.keys.indexOf(name);
		if (i === -1) return;
		hold.keys.splice(i, 1);
		settleHold();
	}
	function releaseAll() {
		Object.keys(holdTimers).forEach(function (name) { clearTimeout(holdTimers[name]); holdTimers[name] = null; });
		if (!hold) return;
		hold.keys = [];
		settleHold();
	}
	function settleHold() {
		const portal = portalOpen();
		// The perks opened while a key was down: the game saved the held amount to put back on the
		// buy tabs when they close, so save the previous amount instead.
		if (!hold.portal && portal) {
			if (window.savedBuyAmt === tabAmount(hold.expect)) window.savedBuyAmt = tabAmount(hold.tab);
			hold = null;
			return;
		}
		if (!holdIsOurs()) { hold = null; return; } // the tab or screen changed some other way
		showHeldTab();
		if (!hold.keys.length) hold = null;
	}

	function watchHoldKeys() {
		window.addEventListener('keydown', function (e) {
			const name = holdKeyName(e);
			if (!name) return;
			try {
				if (name === 'alt' && altKeyUsed(e)) {
					e.preventDefault();
					if (!e.repeat) saveHoverTip();
				}
				keyDown(name, e);
			} catch (err) { console.error('[Nice Features]', err); }
		}, true);
		window.addEventListener('mousemove', function (e) { mouse.x = e.clientX; mouse.y = e.clientY; }, true);
		window.addEventListener('keyup', function (e) {
			const name = holdKeyName(e);
			if (!name) return;
			try {
				if (name === 'alt' && altKeyUsed(e)) e.preventDefault();
				keyUp(name);
				if (name === 'alt') {
					altTooltipOff(e.shiftKey);
					setTimeout(function () {
						try { restoreHoverTip(); altHoverTip = null; } catch (err) { console.error('[Nice Features]', err); }
					}, 50);
				}
				if (name === 'shift' && altSetShift) altTooltipKeep();
			} catch (err) { console.error('[Nice Features]', err); }
		}, true);
		// The key-up is missed when a key is let go in another window (Alt+Tab).
		window.addEventListener('blur', function () {
			try { releaseAll(); altTooltipOff(false); } catch (err) { console.error('[Nice Features]', err); }
		});
	}

	/* ------------------------------------------------------------------ Start */
	// The mod loader runs after the game's code and page, so everything is ready here.
	function start() {
		injectStyle();
		watchGrids();
		buildPanel();
		buildStrip();
		// Every switch between world, map chooser and map goes through mapsSwitch.
		wrap('mapsSwitch', function () { updateStripVisibility(); });
		// Prestige warnings: after the game colours an upgrade button, and in its tooltip.
		wrap('updateButtonColor', function (result, args) {
			if (usingRealTimeOffline) return;
			const u = game.upgrades[args[0]];
			if (u && u.prestiges) markPrestige(args[0]);
		});
		wrap('tooltip', function (result, args) {
			const u = args[1] === 'upgrades' && game.upgrades[args[0]];
			if (u && u.prestiges) prestigeTipLine(args[0]);
		});
		registerOptions();
		applyBodyClasses();
		warnChanged();
		// Capture phase on window runs before the game's own key handler on document.
		window.addEventListener('keydown', onKeyDown, true);
		watchHoldKeys();
		// Panel and strip values change in many places in the game, so refresh them once a
		// second. Visibility too, for a save loaded straight into the map chooser.
		setInterval(function () {
			try { updatePanel(); updateStrip(); updateStripVisibility(); applyBodyClasses(); } catch (e) { console.error('[Nice Features]', e); }
		}, 1000);
		updatePanel();
		updateStrip();
		updateStripVisibility();
	}

	try { start(); } catch (e) { console.error('[Nice Features]', e); }
})();
