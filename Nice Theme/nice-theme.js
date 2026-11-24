// Trimps – Nice Theme 2.2.1 (Steam mod)
// Adds "Nice Theme" to Settings > General > Theme. Click the Theme button until it shows Nice Theme.
//
// Install: copy this file into  <Steam>\steamapps\common\Trimps\mods\  and make sure
// 'nice-theme.js' is in the list in mods\mods.js (the mod loader). Restart Trimps.
// Uninstall: switch to one of the game's own themes first, then remove 'nice-theme.js' from the list
// in mods.js and restart.

(function () {
	'use strict';

	// The CSS below plus this colour palette make the theme. The style element id becomes
	// "<name>Theme", matching Trimps' convention.
	const THEMES = [
		{
			title: 'Nice Theme', name: 'nice',
			palette: {
				// Page and panel colours from the unfinished "modern" Trimps theme (Tailwind's
				// grey-blue scale: 900 #1A202C, 800 #2D3748, 700 #4A5568, 600 #718096), with the
				// main panels partly see-through so the horizon band shows behind them.
				'bg': '#1a202c', 'bg-2': '#232a38', 'panel': 'rgba(45, 55, 72, 0.78)', 'panel-2': '#2d3748',
				'panel-3': '#4a5568', 'border': '#4a5568', 'border-2': '#718096', 'noafford': '#353f52',
				'afford': '#4f5db5', 'afford-2': '#5d6bc8', 'tip': '#2d3748',
				'muted': '#cbd5e0', 'dim': '#a0aec0', 'disabled': '#8a96aa',
				// Page background: horizon band, darker edges and a lighter middle.
				'edge': '#10141c', 'band': '#4a5568',
			},
		},
	];

	// Down-arrow icons for <select>, from the modern theme (light arrow for dark selects).
	const SELECT_ARROW = 'url("data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTgiIGhlaWdodD0iMTEiIAogICAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICAgIDxwYXRoIGQ9Ik03Ljg3NSA5LjlMOSAxMWw5LTguOEwxNS43NSAwIDkgNi42IDIuMjUgMCAwIDIuMnoiIGZpbGw9IiNGN0ZBRkMiIGZpbGwtcnVsZT0ibm9uemVybyIvPgo8L3N2Zz4=")';

	// The theme keeps the game's own font on purpose: Trimps' layout is sized for it, and wider fonts make
	// button labels wrap (e.g. "Standard Formatting"). It also means nothing is downloaded from the internet.

	const CSS = String.raw`

/* =====================================================================
   Palette
   ===================================================================== */
:root {
	--nt-bg:        #283044;
	--nt-bg-2:      #30384e;
	--nt-edge:      #1d2335;
	--nt-band:      #56648e;
	--nt-panel:     rgba(52, 60, 82, 0.95);
	--nt-panel-2:   #3a4259;
	--nt-panel-3:   #48526f;
	--nt-border:    #58637f;
	--nt-border-2:  #7783a8;
	--nt-text:      #f3f5fb;
	--nt-muted:     #b9c1d4;
	--nt-dim:       #9ba3b7;
	--nt-tip:       #252c3e;
	--nt-disabled:  #878fa4;

	--nt-accent:    #8d9bff;
	--nt-accent-2:  #5a6cf2;
	--nt-afford:    #4552a0;
	--nt-afford-2:  #5363bd;
	--nt-noafford:  #2b3248;

	--nt-success:   #23955f;
	--nt-success-2: #1c7c4f;
	--nt-success-l: #68d391;
	--nt-danger:    #d43f4f;
	--nt-danger-2:  #b83443;
	--nt-danger-l:  #fc8181;
	--nt-warning:   #e8b53f;
	--nt-warning-2: #cf9d2b;
	--nt-orange:    #dd6b20;
	--nt-info:      #3bb3c9;
	--nt-info-2:    #2c97ab;
	--nt-purple:    #805ad5;
	--nt-void:      #3a2a6e;
	--nt-pink:      #b83280;
	--nt-pink-l:    #f9a8d4;

	--nt-radius:    10px;
	--nt-radius-sm: 6px;
	--nt-shadow:    0 8px 22px rgba(0, 0, 0, 0.3);
	--nt-shadow-sm: 0 2px 5px rgba(0, 0, 0, 0.25);
}

/* =====================================================================
   Base
   ===================================================================== */
body {
	background: var(--nt-bg) !important;
	color: var(--nt-text);
}
/* Horizon band, like the Default theme's background: darker at the top and bottom, lighter
   across the middle. After you break the planet the game turns Default's band sideways
   (#wrapper gets .wrapperBroken), and this follows. */
#wrapper {
	background: linear-gradient(to bottom, var(--nt-edge) 0%, var(--nt-bg) 30%, var(--nt-band) 50%, var(--nt-bg) 70%, var(--nt-edge) 100%) !important;
}
#wrapper.wrapperBroken {
	background: linear-gradient(to right, var(--nt-edge) 0%, var(--nt-bg) 30%, var(--nt-band) 50%, var(--nt-bg) 70%, var(--nt-edge) 100%) !important;
}
#innerWrapper { background: transparent !important; color: var(--nt-text); }
hr { border-color: var(--nt-border); }
a { color: var(--nt-accent); }
.btn:active { box-shadow: none; }

/* Scrollbars */
* { scrollbar-width: thin; scrollbar-color: var(--nt-border-2) transparent; }
::-webkit-scrollbar { width: 9px; height: 9px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--nt-border-2); border-radius: 9px; }
::-webkit-scrollbar-thumb:hover { background: var(--nt-accent-2); }


/* =====================================================================
   Panels
   ===================================================================== */
#battleContainer,
#logContainer,
#outerBuyContainer,
#queueContainer,
.playerGather {
	background: var(--nt-panel) !important;
	border: 1px solid var(--nt-border) !important;
	border-radius: var(--nt-radius);
	color: var(--nt-text);
	box-shadow: var(--nt-shadow);
}
#logContainer { overflow: hidden; }
#trapArea {
	background: transparent !important;
	border: 0 !important;
	border-top: 1px solid var(--nt-border) !important;
	border-radius: 0;
}
#resourceColumn .row, .resourceRow { color: var(--nt-text); }
.psText { color: var(--nt-muted); }
.psText:hover, .bdHover:hover { color: var(--nt-accent) !important; text-decoration: none; }
#unempHide, #empHide, #trimpsPs { color: var(--nt-muted); }

/* Turkimp / Fluffy */
#turkimpBuff, .turkimp { background: #975a16; color: #fbd38d; border-radius: var(--nt-radius-sm); }
#fluffyBox { background: #4a1450; color: #f39ac7; border: 0; border-radius: var(--nt-radius-sm); }
.fluffyIcon { text-shadow: -1px -1px 0 #ed64a6, 1px -1px 0 #ed64a6, -1px 1px 0 #ed64a6, 1px 1px 0 #ed64a6; }
#fluffyExp { background-color: #f687b3; }

/* =====================================================================
   Build queue
   ===================================================================== */
#noQueue { color: var(--nt-muted); }
.queueItem {
	border: 0 !important;
	border-radius: var(--nt-radius-sm);
	background: var(--nt-panel-3);
	color: var(--nt-text);
	margin-right: 3px;
}
#queueItemsHere > :nth-child(1) { background: var(--nt-afford); color: #fff; border: 0; }

/* =====================================================================
   Message log
   ===================================================================== */
#logBtnGroup div button {
	border: 0 !important;
	border-right: 1px solid var(--nt-panel-2) !important;
	border-radius: 0;
	background: var(--nt-panel-3);
	color: var(--nt-muted);
}
#logBtnGroup div button:focus { outline: none; }
#logBtnGroup .btn-success { background-color: var(--nt-success); color: #fff; }
#logBtnGroup .btn-default { background-color: var(--nt-panel-3); color: var(--nt-dim); }
.message { color: var(--nt-text); }
.StoryMessage { color: #7cc4f5; }
.NoticeMessage, .NoticesMessage { background: var(--nt-bg-2); }
.pauseMsg {
	background: var(--nt-panel-2) !important;
	color: var(--nt-text) !important;
	border: 1px solid var(--nt-warning) !important;
	border-left-width: 4px !important;
	border-radius: var(--nt-radius-sm);
}

/* =====================================================================
   Buy area: tabs, buttons (buildings, jobs, upgrades, equipment)
   ===================================================================== */
#buyContainer { background: transparent; }
.buyTabsUl { border-bottom-color: var(--nt-border) !important; }
.buyTabsUl > li > a,
#buyTabs > ul > li a {
	border: 0 !important;
	border-radius: var(--nt-radius-sm) var(--nt-radius-sm) 0 0 !important;
	color: var(--nt-muted);
	background: transparent;
}
#buyTabs .tabNotSelected { background: transparent; }
#buyTabs .tabSelected, #buyTabs .tabSelected.buyTab { background: transparent !important; }
#buyTabs .tabSelected a { background: var(--nt-panel-3) !important; color: var(--nt-text) !important; }
.tabSelected { background: var(--nt-panel-3) !important; }
.tabSelected a { color: var(--nt-text) !important; }
.tabNotSelected { background: rgba(255, 255, 255, 0.03); }
.tabNotSelected:hover { background: rgba(141, 155, 255, 0.14); }
.tabNotEnabled { background: var(--nt-panel-2); color: var(--nt-disabled); }
.nav-tabs { border-bottom-color: var(--nt-border); }
.nav-tabs.nav-justified > li > a { border: 0; color: var(--nt-muted); }
.nav-tabs.nav-justified > li > a:hover, .nav-tabs > li > a:hover {
	background: rgba(141, 155, 255, 0.16);
	color: var(--nt-text);
	border-color: transparent;
}

/* +1/+10/+25/Max row */
#numTabs .nav-tabs { background: var(--nt-panel-2); border-radius: var(--nt-radius-sm); padding: 3px; border: 0; }
#numTabs .tabNotSelected, #numTabs .nav-tabs.nav-justified > li.tabSelected { background: transparent !important; }
#numTabs .nav-tabs.nav-justified > li.tabSelected > a { background: var(--nt-afford); color: #fff !important; border-radius: var(--nt-radius-sm); }

.titleSpan { color: var(--nt-muted); }

.thing {
	border: 1px solid var(--nt-border) !important;
	border-radius: var(--nt-radius-sm);
	color: var(--nt-text);
	margin-bottom: 0.35vh;
	position: relative;
	transition: background-color .12s ease, border-color .12s ease;
}
/* Press feedback is a colour change, not a transform: animating a transform lifts the button onto its own
   layer while the mouse is down, and the tooltip on top of it gets redrawn (seen as a flash in the cost text). */
.thing:active { border-color: var(--nt-accent) !important; }
.thing.thingColorCanAfford:active { background: var(--nt-afford-2); }

.thingColorCanAfford {
	background: var(--nt-afford);
	border-color: var(--nt-accent) !important;
	color: #fff !important;
	box-shadow: inset 3px 0 0 #b6c0ff, var(--nt-shadow-sm);
}
.thing.thingColorCanAfford:hover { background: var(--nt-afford-2); border-color: #b6c0ff !important; }
.thingColorCanNotAfford {
	background: var(--nt-noafford);
	border-color: #56617f !important;
	color: #a7afc3 !important;
}
.thingColorDone { background: #1f5a3d; }
.thingColorFiringJob { background: #6a2530; box-shadow: inset 3px 0 0 #ff7a86; color: #fff; }
.thingColorGoldenUpgrade {
	background: linear-gradient(135deg, #f5d36b, #d8a632);
	border-color: #f5d36b !important;
	color: #2a1f00 !important;
}
.thing.thingColorGoldenUpgrade:hover { background: linear-gradient(135deg, #f9df8a, #e4b443); }
.thingColorCtrl { background: radial-gradient(#6a7cff 10%, var(--nt-afford) 60%); }
.thingColorCtrl:hover { background: radial-gradient(#8d9bff 10%, var(--nt-afford-2) 60%); }
.thingColorSquared { background-color: #8a2d96 !important; color: #fbe9fd !important; }
.thingColorInfinite { background-color: #2b55b0 !important; }

/* Geneticistassist */
#GeneticistassistContainer { background: transparent; }
#Geneticistassist.stateHappy                 { background: #2a4365; }
#Geneticistassist.stateHappy.thingColorCtrl  { background: radial-gradient(#3182ce 10%, #2c5282 45%, #2a4365 70%); }
#Geneticistassist.stateHiring                { background: #22543d; }
#Geneticistassist.stateHiring.thingColorCtrl { background: radial-gradient(#38a169 10%, #276749 45%, #22543d 70%); }
#Geneticistassist.stateFiring                { background: #742a2a; }
#Geneticistassist.stateFiring.thingColorCtrl { background: radial-gradient(#e53e3e 10%, #9b2c2c 45%, #742a2a 70%); }
#Geneticistassist.stateDanger                { background: #c53030; }
#Geneticistassist.stateDanger.thingColorCtrl { background: radial-gradient(#fc8181 10%, #f56565 45%, #c53030 70%); }

/* =====================================================================
   Generic buttons and status colours
   ===================================================================== */
/* Hover uses fixed colours, never a brightness filter: fading a filter makes Chromium (and the Steam app)
   redraw the button as a separate layer for a frame, which shows as a flash when the mouse enters or leaves.
   The :focus / :active / .active states are listed so Bootstrap's own colours never show through after a click. */
.btn {
	border-radius: var(--nt-radius-sm);
	transition: background-color .12s ease, border-color .12s ease;
}
.btn-default  { background: var(--nt-panel-3); color: var(--nt-text); border-color: var(--nt-border-2); }
.btn-primary  { background: var(--nt-accent-2); border-color: var(--nt-accent-2); color: #fff; }
.btn-success  { background: var(--nt-success); border-color: var(--nt-success); color: #fff; }
.btn-info     { background: var(--nt-info); border-color: var(--nt-info); color: #06212a; }
.btn-warning  { background: var(--nt-warning); border-color: var(--nt-warning); color: #2a1f00; }
.btn-danger   { background: var(--nt-danger); border-color: var(--nt-danger); color: #fff; }
.btn-default:hover, .btn-default:focus, .btn-default:active, .btn-default.active, .btn-default:active:hover, .btn-default:active:focus {
	background: var(--nt-afford-2); border-color: var(--nt-accent); color: #fff; }
.btn-primary:hover, .btn-primary:focus, .btn-primary:active, .btn-primary.active, .btn-primary:active:hover, .btn-primary:active:focus {
	background: #4a5be0; border-color: #4a5be0; color: #fff; }
.btn-success:hover, .btn-success:focus, .btn-success:active, .btn-success.active, .btn-success:active:hover, .btn-success:active:focus {
	background: var(--nt-success-2); border-color: var(--nt-success-2); color: #fff; }
.btn-info:hover, .btn-info:focus, .btn-info:active, .btn-info.active, .btn-info:active:hover, .btn-info:active:focus {
	background: var(--nt-info-2); border-color: var(--nt-info-2); color: #06212a; }
.btn-warning:hover, .btn-warning:focus, .btn-warning:active, .btn-warning.active, .btn-warning:active:hover, .btn-warning:active:focus {
	background: var(--nt-warning-2); border-color: var(--nt-warning-2); color: #2a1f00; }
.btn-danger:hover, .btn-danger:focus, .btn-danger:active, .btn-danger.active, .btn-danger:active:hover, .btn-danger:active:focus {
	background: var(--nt-danger-2); border-color: var(--nt-danger-2); color: #fff; }

.workBtn {
	border: 1px solid var(--nt-border-2) !important;
	border-radius: var(--nt-radius-sm);
	background: var(--nt-panel-3);
	color: var(--nt-text);
	box-shadow: var(--nt-shadow-sm);
}
.workColorOff { background: var(--nt-panel-3); }
.workColorOn  { background: var(--nt-afford); border-color: var(--nt-accent) !important; color: #fff; }
.workColorTurkimp { background-color: #975a16; color: #fffaf0; }
.workBtn.workColorOff:hover { background: var(--nt-afford-2); color: #fff; }

.successColor, .colorSuccess { background-color: var(--nt-success); color: #fff; }
.successColor:hover, .colorSuccess:hover { background-color: var(--nt-success-2); border-color: var(--nt-success-2); }
.dangerColor, .colorDanger, .stateDanger { background-color: var(--nt-danger); color: #fff; }
.dangerColor:hover, .colorDanger:hover { background-color: var(--nt-danger-2); border-color: var(--nt-danger-2); }
.infoColor, .colorInfo { background-color: var(--nt-info); color: #06212a; }
.infoColor:hover, .colorInfo:hover { background-color: var(--nt-info-2); border-color: var(--nt-info-2); }
.warningColor, .colorWarning { background-color: var(--nt-warning); color: #2a1f00; }
.primaryColor, .colorPrimary { background-color: var(--nt-accent-2); color: #fff; }
.colorPrimary.hoverColor:hover, .workBtn.primaryColor:hover { background-color: var(--nt-accent); }
.colorGrey { background-color: var(--nt-panel-3); color: var(--nt-text); }
.tealColor { background-color: var(--nt-info-2); color: #fff; border: 1px solid transparent !important; }
.tealColor:hover { background-color: var(--nt-info); }
.btn-disabled, .btn-disabled:hover, .colorDisabled, .colorDisabled:hover {
	background-color: var(--nt-noafford); color: var(--nt-dim); border-color: #3a4259;
}
.green { color: var(--nt-success-l); }
.greenText { color: var(--nt-success-l) !important; }
.red, .redText { color: var(--nt-danger-l) !important; }
.orange { color: #f6ad55; }

/* AutoUpgrade / AutoJobs / AutoStructure / AutoEquip / Fire */
.autoUpgradeBtn, #fireBtn {
	border: 0 !important;
	border-radius: var(--nt-radius-sm);
	color: #fff;
	box-shadow: var(--nt-shadow-sm);
}
.autoUpgradeBtn.colorSuccess, .autoUpgradeBtn.colorSuccess:hover { background: var(--nt-success); }
.autoUpgradeBtn.colorDanger, .autoUpgradeBtn.colorDanger:hover { background: var(--nt-panel-3); color: var(--nt-muted); }
.autoUpgradeBtn.colorWarning, .autoUpgradeBtn.colorWarning:hover { background: var(--nt-warning); color: #2a1f00; }
.fireBtnNotFiring { background: var(--nt-panel-3); color: var(--nt-text); }
.fireBtnNotFiring:hover { background: var(--nt-afford-2); }
.fireBtnFiring, .fireBtnFiring:hover { background: var(--nt-danger); color: #fff; }
.toggleAllBtn { background-color: var(--nt-accent-2); color: #fff; border: 0;}
.toggleAllBtn:hover { background-color: var(--nt-accent); color: #fff; }

/* =====================================================================
   Inputs
   ===================================================================== */
#searchSettings, input, textarea {
	background: var(--nt-bg-2);
	color: var(--nt-text);
	border: 1px solid var(--nt-border-2);
	border-radius: var(--nt-radius-sm);
}
select {
	-webkit-appearance: none;
	-moz-appearance: none;
	appearance: none;
	color: var(--nt-text);
	border: 1px solid var(--nt-border-2);
	border-radius: var(--nt-radius-sm);
	padding-right: 1.6em;
	background-color: var(--nt-panel-3);
	background-image: ${SELECT_ARROW};
	background-repeat: no-repeat;
	background-position: right .45em top 50%;
	background-size: .65em auto;
}
select option { background: var(--nt-panel-2); color: var(--nt-text); }
input:focus, select:focus, textarea:focus, #searchSettings:focus {
	outline: none;
	border-color: var(--nt-accent);
	box-shadow: 0 0 0 2px rgba(141, 155, 255, 0.3);
}
[type='range'] { -webkit-appearance: none; background: transparent; border: 0; }
[type='range']::-webkit-slider-runnable-track { height: 6px; background: var(--nt-panel-3); border-radius: 6px; }
[type='range']::-webkit-slider-thumb { -webkit-appearance: none; width: 16px; height: 16px; margin-top: -5px; border-radius: 50%; background: var(--nt-accent); box-shadow: var(--nt-shadow-sm); }
[type='range']::-moz-range-track { height: 6px; background: var(--nt-panel-3); border-radius: 6px; }
[type='range']::-moz-range-thumb { width: 16px; height: 16px; border: 0; border-radius: 50%; background: var(--nt-accent); }
.niceCheckbox { color: var(--nt-accent); }
.niceCheckbox.icon-checkbox-unchecked { color: var(--nt-dim); }

/* =====================================================================
   Progress bars
   ===================================================================== */
.progress {
	background: var(--nt-bg-2);
	border-radius: 999px;
	box-shadow: inset 0 0 0 1px var(--nt-border);
	overflow: hidden;
}
.progress-bar { box-shadow: none; border: 0 !important; }
/* The game draws black text on its light bars; on dark bars it needs to be light with an outline. */
.progress span, .progress-bar, .innerFightBar, [id$="TimeToFill"],
#goodGuyHealth, #goodGuyHealthMax, #badGuyHealth, #badGuyHealthMax {
	color: #fff !important;
	text-shadow: 0 0 2px #000, 0 1px 2px #000;
}
.percentColorBlue   { background-color: var(--nt-accent-2); }
.percentColorYellow { background-color: var(--nt-warning); }
.percentColorOrange { background-color: #e5853a; }
.percentColorRed    { background-color: var(--nt-danger); }

/* =====================================================================
   Settings drawer and bottom bar
   ===================================================================== */
#settingsRow {
	background: var(--nt-bg-2) !important;
	border-top: 1px solid var(--nt-border);
	box-shadow: 0 -8px 24px rgba(0, 0, 0, 0.4);
	color: var(--nt-text);
}
#settingsTable > tbody > tr > td { border-color: var(--nt-bg-2); }
#settingsTable .btn { border-radius: var(--nt-radius-sm) var(--nt-radius-sm) 0 0;}
#settingsTable .btn-info { background-color: var(--nt-panel-3); color: var(--nt-text); }
#settingsTable .btn-info:hover { background-color: var(--nt-afford-2); color: #fff; }
#settingsTable .btn.tealColor { background-color: var(--nt-accent-2) !important; color: #fff; }
#settingsTable .btn.tealColor:hover { background-color: #4a5be0 !important; color: #fff; }
#settingsTable .btn-default { background-color: #cbd5e0; color: #1a202c; }
#settingsTable .btn-default:hover { background-color: #a9b5c7; color: #1a202c; }
#settingsTable #portalTimer.timerPaused { color: var(--nt-danger); }
.autosaving { background-color: var(--nt-success); }
#settingSearchResults, #allSettingsHere { background: var(--nt-panel-2); border-radius: var(--nt-radius); }
.settingTab.tabNotSelected { background: var(--nt-bg-2); }
.settingTab.tabSelected { background: var(--nt-panel-2) !important; }

.settingsBtn { border-radius: var(--nt-radius-sm); }
.settingBtn0, .settingBtn1, .settingBtn2, .settingBtn3, .settingBtn4, .settingBtn5,
.settingBtntrue, .settingBtnfalse {
	border-radius: var(--nt-radius-sm) !important;
	border: 1px solid transparent !important;
	box-shadow: var(--nt-shadow-sm);
}
.settingBtntrue, .settingBtn1         { background-color: var(--nt-success); color: #fff; }
.settingBtntrue:hover, .settingBtn1:hover { background-color: var(--nt-success-2); }
.settingBtnfalse, .settingBtn0        { background-color: var(--nt-danger); color: #fff; }
.settingBtnfalse:hover, .settingBtn0:hover { background-color: var(--nt-danger-2); }
.settingBtn2, .btn-yellow, .colorYellow { background-color: var(--nt-warning); color: #2a1f00; }
.settingBtn2:hover, .btn-yellow:hover, .colorYellow:hover { background-color: var(--nt-warning-2); color: #2a1f00; }
.settingBtn3          { background-color: var(--nt-info); color: #fff; }
.settingBtn3:hover    { background-color: var(--nt-info-2); }
.settingBtn4          { background-color: var(--nt-purple); color: #fff; }
.settingBtn4:hover    { background-color: #6b46c1; }
.settingBtn5          { background-color: #7a6312; color: #fff; }
.settingBtn5:hover    { background-color: #66520f; }
#toggleusePlayFab.settingBtn0, .pFabEnable { background-color: #434ea8 !important; color: #fff; }
#toggleusePlayFab.settingBtn0:hover, .pFabEnable:hover { background-color: #39439a !important; }
#togglesaveAndExit.settingBtn0 { background: var(--nt-panel-2); color: var(--nt-danger-l); border-color: var(--nt-danger) !important; }

/* =====================================================================
   Tooltips (dark, with header / footer bands from the modern theme)
   ===================================================================== */
/* The game rebuilds open tooltips about 4 times a second, so keep them cheap to redraw: fully opaque,
   no overflow clipping (rounded clipping makes Chromium use a mask layer) and a light shadow.
   The header and cost bands round their own corners instead. */
#tooltipDiv, #tooltipDiv2 {
	background: var(--nt-tip);
	color: var(--nt-text);
	border: 1px solid var(--nt-border-2);
	border-radius: var(--nt-radius);
	box-shadow: 0 6px 16px rgba(0, 0, 0, 0.45);
	padding: 0;
}
#tooltipDiv > hr, #tooltipDiv2 > hr { display: none; }
#tipTitle, #tipTitle2 {
	background: var(--nt-panel-3);
	color: var(--nt-text);
	padding: 8px 14px;
	border-radius: calc(var(--nt-radius) - 1px) calc(var(--nt-radius) - 1px) 0 0;
}
#tipText, #tipText2 { padding: 12px 14px; }
#tipCost, #tipCost2 {
	background: var(--nt-panel-2);
	padding: 8px 14px;
	border-radius: 0 0 calc(var(--nt-radius) - 1px) calc(var(--nt-radius) - 1px);
}
#tipCost:empty, #tipCost2:empty { display: none; }
#tooltipDiv .green, #tooltipDiv2 .green { color: var(--nt-success-l); }
#tooltipDiv .red, #tooltipDiv2 .red { color: var(--nt-danger-l); }
#tooltipDiv .orange, #tooltipDiv2 .orange { color: #f6ad55; }
#tooltipDiv.tooltipExtraHeirloom { background: transparent; border: 0; box-shadow: none; }
#tooltipDiv.tooltipExtraHeirloom #tipTitle, #tooltipDiv.tooltipExtraHeirloom #tipCost { display: none; }
#tooltipDiv.tooltipExtraHeirloom #tipText { padding: 0; }
.table-striped > tbody > tr:nth-of-type(2n+1) { background: rgba(255, 255, 255, 0.03); }
.table > thead > tr > th, .table > tbody > tr > th,
.table > thead > tr > td, .table > tbody > tr > td { border-color: var(--nt-border); }

/* Loot breakdown tables */
.bdTable, .bdTableSm { background: var(--nt-panel-2); border-radius: var(--nt-radius-sm); overflow: hidden; }
.bdTable > tbody > tr > td, .bdTableSm > tbody > tr > td { border: 0; border-bottom: 1px solid var(--nt-border); padding: 4px; }
.bdTitle { text-decoration: none;}
.critRow { background: var(--nt-panel-3) !important; }
#buyMaxUl li { border: 0; background: var(--nt-panel-3); color: var(--nt-text); }
#buyMaxUl li:hover { background: var(--nt-afford-2); }

/* Fluffy tooltip */
.fluffyThird { color: var(--nt-text); }
#fluffyLevelBreakdownContainer { background: var(--nt-panel-2); border-radius: var(--nt-radius-sm); }
#fluffyLevelBreakdown { border: 0; }
#fluffyLevelBreakdown > tbody > tr > td { border: 0; }
#fluffyLevelBreakdown > tbody > tr:nth-child(even) { background: rgba(255, 255, 255, 0.04); }
#fluffyLevelBreakdown > tbody > tr.fluffyRowComplete { background: #1f5a3d; color: #c6f6d5; }

/* =====================================================================
   Battle panel, grid, formations
   ===================================================================== */
#grid, #mapGrid {
	background: rgba(255, 255, 255, 0.05);
	border-radius: var(--nt-radius-sm);
	padding: 2px;
}
.battleCell { border: 1px solid var(--nt-bg) !important; border-radius: 3px; }
/* .battleCell.* so killed and current cells also win over the empowerment colours below, as in the
   game's own themes. The game's Living and Darkness map rules are more specific and still win. */
.cellColorBeaten, .battleCell.cellColorBeaten     { background: #38a169 !important; color: #0b1f15 !important; }
.cellColorOverkill, .battleCell.cellColorOverkill { background: #68d391 !important; color: #0b1f15 !important; }
.cellColorCurrent, .battleCell.cellColorCurrent   {
	background: var(--nt-warning) !important;
	color: #2a1f00 !important;
	box-shadow: 0 0 10px rgba(232, 181, 63, 0.6);
}
.battleCell.Corruption, .badge.Corruption { background: #3a2a6e; color: #e9d8fd; }
.badNameMutation.Corruption { background: transparent; color: #b794f4; }
.battleCell.Magma, .badge.Magma, .message.Magma { background-color: #9b2c2c; color: #fed7d7; }
.badNameMutation.Magma { background: none; color: var(--nt-danger-l); }
.voidMessage, .voidBadge { background: var(--nt-void); color: #faf5ff; }
.voidCell.cellColorNotBeaten { background: var(--nt-void); }

#battleSideTitle { background: var(--nt-bg-2); color: var(--nt-text); border: 0 !important; border-radius: var(--nt-radius-sm); }
#lootBdBtn { color: var(--nt-accent); text-shadow: none; }
#lootBdBtn:hover { color: #b6c0ff; }

.battleSideBtnContainer .fightBtn {
	border: 0 !important;
	border-radius: var(--nt-radius-sm);
	box-shadow: var(--nt-shadow-sm);
}
.battleSideBtnContainer .btn-default { background: #e2e8f0; color: #1a202c; }
.battleSideBtnContainer .btn-primary { background: #3182ce; color: #fff; }
.battleSideBtnContainer .btn-danger  { background: #e53e3e; color: #fff; }
.battleSideBtnContainer .btn-success { background: #38a169; color: #fff; }
.battleSideBtnContainer .btn-warning { background: #dd6b20; color: #fff; }
.battleSideBtnContainer .btn-info    { background: #5a67d8; color: #fff; }
.battleSideBtnContainer #boneBtnMain { color: #1a202c; }
.battleSideBtnContainer .heirloomsBtnColor { background: var(--nt-pink); color: #fff5f7; }
#voidMapsBtn:hover { background: var(--nt-void); color: #faf5ff; }
#mapsBtn .alert { background: var(--nt-void); color: #faf5ff; }

.badge { background-color: var(--nt-panel-3); border-radius: 999px; vertical-align: middle; }
.antiBadge, .badBadge { background: var(--nt-panel-3); }
.alert { background-color: var(--nt-warning); color: #2a1f00; }
#settingsAlert.alert { background-color: var(--nt-danger); color: #fff; }

.formationBtn {
	border: 1px solid var(--nt-border) !important;
	border-radius: var(--nt-radius-sm);
}
.formationStateDisabled { background: var(--nt-panel-2) !important; color: var(--nt-muted); }
.formationStateEnabled  { background: var(--nt-accent-2) !important; color: #fff; border-color: var(--nt-accent) !important; }
.formationBtn.formationStateDisabled:hover { background: var(--nt-panel-3) !important; color: var(--nt-text); }
.formationBtn.formationStateEnabled:hover  { background: #6b7cf5 !important; }
#chainHolder { border: 0; color: #fff;border-radius: var(--nt-radius-sm); }
.shriekStateDisabled { background: var(--nt-danger) !important; }
.shriekStateEnabled  { background: var(--nt-success) !important; }
.shriekStateCooldown, #goldConfig { background-color: var(--nt-panel-2) !important; }
#boneShrineBtn { border-radius: 0 0 var(--nt-radius-sm) 0; }
#boneShrineBtn.isFull  { background-color: #c99a14; color: #1f1700; }
#boneShrineBtn.isEmpty { background-color: var(--nt-panel-3); color: var(--nt-muted); }
#talentRespecBtn { border: 0 !important; border-radius: var(--nt-radius-sm);}

/* Spire / Liquification grids */
.spire ul li.spireCell.cellColorNotBeaten { background: #718096; }
.spire ul li.spireCell.cellColorNotBeaten.Corruption { background: var(--nt-void); }
.spireMetals, .spireMetalsMsg { color: var(--nt-warning); }
#grid.liquid { border: 0; border-radius: var(--nt-radius-sm); overflow: hidden; color: #744210; }
/* Same strength as the game's own .liquid rule, so Corrupted, Healthy, Magma and mutated cells keep
   their colours in a liquified Zone (the Spire too). The current cell blends in, as in the game. */
.liquid ul li { background: #f6e05e; }
.liquid ul li.cellColorCurrent { background: #f6e05e !important; }

/* Empowerments (Poison / Wind / Ice) */
.tabColPoison, .tabColWind, .tabColIce { box-shadow: none; border: 2px solid var(--nt-panel-2); border-radius: var(--nt-radius-sm); }
.tabColPoison { background: #2f855a !important; color: #f0fff4; }
.tabColWind   { background: #2b6cb0 !important; color: #ebf8ff; }
.tabColIce    { background: #1f7a99 !important; color: #ebf8ff; }
/* Poison is a darker green than killed cells (#38a169), so a killed Poison cell still shows as killed. */
.empoweredCellPoison, .badNamePoison, #poisonEmpowermentIcon { background: #276749 !important; }
.empoweredCellWind,   .badNameWind,   #windEmpowermentIcon   { background: #2b6cb0 !important; }
.empoweredCellIce,    .badNameIce,    #iceEmpowermentIcon    { background: #90cdf4 !important; }
#iceEmpowermentIcon, #iceEmpowermentText { color: #0b2e4a !important; }
.empowerTabPoison a { background: var(--nt-bg-2) !important; color: var(--nt-success-l) !important; }
.empowerTabWind a   { background: var(--nt-bg-2) !important; color: #63b3ed !important; }
.empowerTabIce a    { background: var(--nt-bg-2) !important; color: #90cdf4 !important; }
.empowerTabPoison.tabSelected a, .empowerTabPoison a:hover,
.empowerTabWind.tabSelected a,   .empowerTabWind a:hover,
.empowerTabIce.tabSelected a,    .empowerTabIce a:hover { background: var(--nt-panel-3) !important; }
.natureTop { text-shadow: none; background: none; }
.natureBuyIcon { border: 0; border-radius: var(--nt-radius-sm); background-color: rgba(0, 0, 0, 0.2); }
.natureBuyIcon:hover { background-color: rgba(255, 255, 255, 0.12); }
.natureUpgradeCost .green { text-shadow: none; }

/* =====================================================================
   Maps
   ===================================================================== */
#mapsCreateRow { background: var(--nt-panel-2); border-radius: var(--nt-radius-sm) var(--nt-radius-sm) 0 0; color: var(--nt-text); }
#advMapsRow, #advMapsRow2 { background: var(--nt-panel-2); border-radius: 0 0 var(--nt-radius-sm) var(--nt-radius-sm); }
.advMapsTitle { color: var(--nt-muted); }
#mapCreateBtn { background: var(--nt-accent-2); color: #fff; }
.incrementBtn { background: var(--nt-panel-3); color: var(--nt-text); border: 1px solid var(--nt-border) !important; border-radius: var(--nt-radius-sm); }
.incrementBtn:hover { background: var(--nt-afford-2); }
#mapLevelInput { background: var(--nt-bg-2); color: var(--nt-text); text-align: center; }
.advSelect { color: var(--nt-text); }
.mapPreset { color: var(--nt-muted); border-radius: 4px; padding: 0 4px; }
.mapPreset:hover { color: var(--nt-text); }
.presetSelectionOn { color: #fff; background: var(--nt-afford); text-decoration: none; text-shadow: none; }
.iconStateBad { color: var(--nt-danger-l); }
#selectedMapName { text-decoration: none;}
.mapStatsTitle { color: var(--nt-muted); }
.mapStatsValue { color: var(--nt-text);}
#selectedMapContainer .infoColor { background-color: #3182ce; color: #fff; }
#selectedMapContainer .dangerColor { background-color: #9b2c2c; color: #fff5f5; }

.mapThing { border-radius: var(--nt-radius-sm); }
.mapElementNotSelected { border: 1px solid var(--nt-border) !important; }
#mapsHere .thing { background: var(--nt-panel-3); }
.mapElementSelected, #mapsHere .mapElementSelected {
	background: var(--nt-afford) !important;
	box-shadow: inset 0 0 0 2px var(--nt-accent) !important;
}
#mapsHere .noRecycle { background: #276749; }
#mapsHere .noRecycle.mapElementSelected { background: #38a169 !important; }
#mapsHere .noRecycleDone { background: #9b2c2c; }
#mapsHere .noRecycleDone.mapElementSelected { background: #e53e3e !important; }
#mapsHere .goldMap { background: #8a6d12; }
#voidMapsHere { color: #faf5ff !important; }
#voidMapsHere .thing { background: var(--nt-void); }
#voidMapsHere .mapElementSelected { background: #6b46c1 !important; }

/* Map at Zone */
.mazRow.titles div {color: var(--nt-muted); }
#mazAddRowBtn, #mazSwapPresetBtn { background: transparent; border: 0;}
#mazAddRowBtn { color: var(--nt-success-l); }
#mazSwapPresetBtn { color: var(--nt-accent); }

/* =====================================================================
   Full-screen windows
   ===================================================================== */
#portalWrapper, #statsWrapper, #achievementWrapper, #heirloomWrapper, #mutTreeWrapper,
#achievementsHere {
	background-color: var(--nt-bg) !important;
	color: var(--nt-text);
}

/* ---------- Portal ---------- */
#portalWrapper .btn-primary { background-color: #3182ce; border-color: #3182ce; color: #fff; }
#portalWrapper .btn-danger  { background-color: #e53e3e; border-color: #e53e3e; color: #fff; }
#portalWrapper .btn-warning { background-color: #d69e2e; border-color: #d69e2e; color: #fffff0; }
#portalPresets, #portalTabs { background: transparent; border: 0 !important; }
#portalPresetsTabs.nav-tabs.nav-justified > li > a,
#portalTabs.nav-tabs.nav-justified > li > a { margin: 2px; border-radius: var(--nt-radius-sm); }
#portalPresetsTabs .tabNotSelected, #portalTabs .tabNotSelected,
#portalPresetsTabs .tabSelected,    #portalTabs .tabSelected,
#portalPresetsTabs .tabNotEnabled,  #portalTabs .tabNotEnabled { background: transparent !important; }
#portalPresetsTabs .tabNotSelected a, #portalTabs .tabNotSelected a { background: var(--nt-panel-3); color: var(--nt-text); }
#portalPresetsTabs .tabSelected a,    #portalTabs .tabSelected a    { background: var(--nt-accent-2); color: #fff !important; }
#portalPresetsTabs .tabNotEnabled a,  #portalTabs .tabNotEnabled a  { background: var(--nt-bg-2); color: var(--nt-disabled); }
#ptabRemove { background: transparent !important; }
#ptabRemove a { background: var(--nt-danger) !important; color: #fff !important; }

.portalThing, .challengeThing { border-radius: var(--nt-radius-sm); }
.portalThing.perkColorOn { background-color: var(--nt-afford); color: #fff; }
.portalThing.perkColorOff, .portalThing.colorBuyOff { background-color: var(--nt-noafford); color: var(--nt-dim); }
.portalThing.perkColorMaxed { background-color: #553c9a; color: #e9d8fd; border-color: #805ad5 !important; }
#swapPortalUniverseBtn {
	background: var(--nt-panel-3) !important;
	color: var(--nt-text);
	border: 1px solid var(--nt-border-2) !important;
	border-radius: var(--nt-radius-sm);
}
#swapPortalUniverseBtn:hover { background: var(--nt-afford-2) !important; }
.portalThing.additive.perkColorOn { background-color: #276749; }
.portalThing.additive.perkColorOff { background-color: var(--nt-noafford); }

.challengeThing { background-color: #2b6cb0; color: #fff; }
.challengeThing:hover { background-color: #3182ce; }
.challengeThing[style*="border-color: black"] { color: #1a202c !important; }
.nextChallenge { background-color: var(--nt-bg-2) !important; color: var(--nt-dim); }
.finishedChallenge { background-color: #718096; color: #1a202c; }
#challengeDaily { background-color: var(--nt-orange); border-color: var(--nt-orange); }
#challengeDaily:hover { background-color: #ed8936; }
#specificChallengeDescription, #viewChallenge {
	background: var(--nt-panel-2);
	color: var(--nt-text);
	border: 1px solid var(--nt-border);
	border-radius: var(--nt-radius);
	box-shadow: var(--nt-shadow);
	padding: 14px;
}
.dailyTopRow { overflow: hidden; border-radius: var(--nt-radius-sm);}
.dailyTop.colorGrey { background: #718096; color: #f7fafc; }
.dailyTop.colorInfo { background: #2b6cb0; color: #fff; }
.dailyTop.colorSuccess { background: #38a169; color: #fff; }
.portalMk1 { background: #276749; color: #f0fff4 !important; }
.portalMk2 { background: #319795; color: #e6fffa !important; }
.portalMkPreview { background: #07090c; }
.activatePortalBtn { border-radius: var(--nt-radius-sm); }

/* ---------- Heirlooms ---------- */
#heirloomTitleBar { background: var(--nt-panel-2); border: 0; border-radius: var(--nt-radius); }
#nullifiumContainer { color: var(--nt-pink-l); }
#equippedHeirlooms, #carriedHeirlooms, #extraHeirlooms {
	background: var(--nt-panel);
	border: 1px solid var(--nt-border) !important;
	border-radius: var(--nt-radius);
	overflow: hidden;
}
#ShieldEquipped, #StaffEquipped, #CoreEquipped {
	background: var(--nt-bg-2);
	border: 0 !important;
	border-radius: var(--nt-radius);
	box-shadow: var(--nt-shadow);
}
.heirBtn { border: 0 !important; border-radius: var(--nt-radius-sm); }
.heirBtn .colorPrimary { background-color: #2b6cb0; color: #fff; }
.heirBtn .colorDanger { background-color: #c53030; color: #fff; }
.heirloomBtnGroup { background: var(--nt-panel-3); border: 0; }
.heirloomBtnInactive { background: var(--nt-panel-3); color: var(--nt-muted); }
.heirloomBtnActive, .heirloomRecycleWarning { background-color: #702459; color: #fff5f7; }
.heirBtn.heirloomBtnActive:hover { background: #97266d; opacity: 1; }
#heirRare { background: var(--nt-panel-3); color: var(--nt-text); border-radius: var(--nt-radius); }
.rarityBdBox { border: 0 !important; border-radius: var(--nt-radius-sm);}
.heirloomMod { background: var(--nt-panel-3); border: 0 !important; border-radius: var(--nt-radius-sm); }
.heirloomMod:hover { background: var(--nt-afford); }
#heirloomNameInput { background: var(--nt-bg-2); color: var(--nt-text); border-radius: var(--nt-radius-sm); }
.renameHeirloomBtn { background: var(--nt-panel-3); color: var(--nt-text); border: 0; border-radius: var(--nt-radius-sm); }
.heirloomEquipped { color: var(--nt-pink-l); text-shadow: none; }
#modReplaceBox, #modUpgradeBox { background: var(--nt-panel-2); border: 0 !important; }
#modReplaceBox { border-radius: var(--nt-radius) 0 0 var(--nt-radius); }
#modUpgradeBox { border-radius: 0 var(--nt-radius) var(--nt-radius) 0; }
#modReplaceSelect { border: 0; background-color: var(--nt-panel-3); }
.selectedHeirloomItem { background-color: var(--nt-bg-2); border: 0 !important; border-radius: var(--nt-radius); }
#heirloomsPopup {
	background: var(--nt-bg-2);
	color: var(--nt-text);
	border: 1px solid var(--nt-border) !important;
	border-radius: var(--nt-radius);
	box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.6);
	overflow: hidden;
}
#heirloomsPopupBtns { background: var(--nt-panel-3); color: var(--nt-text); }
#heirloomsPopupBtns .icon-close { color: var(--nt-danger-l); }
#heirloomsPopupBtns .icon-archive { color: var(--nt-pink-l); }
#heirloomHelp { background: var(--nt-panel-2); border-radius: var(--nt-radius); box-shadow: var(--nt-shadow); }

/* Rarity colours (kept readable on dark backgrounds) */
.heirloomRare0 { color: #f7fafc; }
.heirloomRare1 { color: #48bb78; }
.heirloomRare2 { color: #4299e1; }
.heirloomRare3 { color: #c461d1; }
.heirloomRare4 { color: #ed8936; }
.heirloomRare5 { color: #f56565; }
.heirloomRare6 { color: #7f8cf0; }
.heirloomRare7 { color: #feebc8; }
.heirloomRare0.rarityBdBox { background: #f7fafc; color: #1a202c; }
.heirloomRare1.rarityBdBox { background: #38a169; color: #f0fff4; }
.heirloomRare2.rarityBdBox { background: #3182ce; color: #ebf8ff; }
.heirloomRare3.rarityBdBox { background: #a23dad; color: #f5e1f7; }
.heirloomRare4.rarityBdBox { background: #dd6b20; color: #fffaf0; }
.heirloomRare5.rarityBdBox { background: #e53e3e; color: #fff5f5; }
.heirloomRare6.rarityBdBox { background: #5a67d8; color: #ebf4ff; }
.heirloomRare7.rarityBdBox { background: linear-gradient(135deg, #000 0%, #400000 50%, #100000 100%); color: #feebc8; }

/* ---------- Achievements ---------- */
#achievementPopup, #achievementHover {
	background: var(--nt-bg-2);
	color: var(--nt-text);
	border: 1px solid var(--nt-border-2) !important;
	border-radius: var(--nt-radius);
	box-shadow: 0 16px 40px rgba(0, 0, 0, 0.55);
}
#achievementPopupDescription, #achievementHoverDescription,
#achievementPopupReward, #achievementHoverReward, #achievementHoverProgress { color: var(--nt-muted); }
.achievementBtnGo { color: var(--nt-success-l); }
.achievementBtnClose, #achievementMainClose, #achievementClose2 { color: var(--nt-danger-l); }
.achievementTitle {
	background: var(--nt-panel-2);
	border-color: var(--nt-panel-2) !important;
	border-radius: var(--nt-radius-sm);
	color: var(--nt-text);
}
.achievementContainer { border-radius: 0 0 var(--nt-radius-sm) var(--nt-radius-sm); }
.achieveColorGreen  { background-color: #38a169; }
.achieveColorYellow { background: repeating-linear-gradient(45deg, #d69e2e, #d69e2e 10px, #b7791f 10px, #b7791f 20px); }
.achieveColorRed    { background: repeating-linear-gradient(45deg, #c53030, #c53030 10px, #9b2c2c 10px, #9b2c2c 20px); }
.achieveColorGrey   { background-color: var(--nt-panel-3); }
.achievementMainTitle, #achievementTotalPercent { color: var(--nt-text); }
.achievementTotals, #achievementHelpContainer { color: var(--nt-muted); }
#achievementHelp { color: var(--nt-accent); }

/* ---------- Stats ---------- */
#statsWrapper .btn-info   { background-color: #3182ce; border-color: #3182ce; color: #fff; }
#statsWrapper .btn-danger { background-color: #e53e3e; border-color: #e53e3e; color: #fff; }
#statsWrapper .statToggleBtn { border: 0 !important; color: var(--nt-text); background: var(--nt-panel-3); border-radius: var(--nt-radius-sm);}
#statsWrapper .statToggleBtn:hover { background: var(--nt-afford-2); }
#statsWrapper .statToggleBtn[style*="border: 5px solid yellow"] { background: var(--nt-accent-2); }
.statContainer { background: var(--nt-panel); border: 1px solid var(--nt-border); border-radius: var(--nt-radius); }
.statTitle { color: var(--nt-muted); }
.statValue { color: #fff;}
#statsTitle { color: var(--nt-text);}

/* ---------- Bone trader ---------- */
#boneWrapper {
	background: var(--nt-bg-2);
	color: var(--nt-text);
	border: 1px solid var(--nt-border-2) !important;
	border-radius: var(--nt-radius);
	box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.6);
}
#boneTitleContainer, #mainBoneHowTo, #boneFlavorRow { color: var(--nt-text); }
#boneOwnedContainer { background: var(--nt-panel-3); color: var(--nt-text); border-radius: var(--nt-radius); padding: 6px 14px; }
#bonesOwned { color: #fff;}
.boneBuyColumn {
	background: var(--nt-panel-2);
	border: 1px solid var(--nt-border) !important;
	border-radius: var(--nt-radius);
	overflow: hidden;
}
.boneBuyDesc, .miscDesc { background: none; color: var(--nt-muted); }
.boneBtn, .thingSmall {
	border: 0 !important;
	border-radius: var(--nt-radius-sm);
	background: var(--nt-panel-3);
	color: #fff;
}
.boneBtn.dangerColor { background-color: var(--nt-danger); }
.boneBtn.successColor { background-color: var(--nt-success); color: #fff; }
.boneBtnStateOn, .boneBtnStateTeal { background: #3182ce; color: #fff; }
.importsTable > tbody > tr { background-color: var(--nt-panel-3); }
.importsTable > tbody > tr:hover { background-color: var(--nt-afford-2); }
.importsTable > tbody > tr.tealColor { background-color: #3182ce !important; }
.importsTable > tbody > tr.importOwned { background-color: #38a169 !important; }
.importsTable > tbody > tr > td { border-top: 2px solid var(--nt-panel-2); }
.singleBonusBox { border: 0; }
.singleBonusBox:hover { background: var(--nt-panel-3); }
#boostPreviewContainer { background-color: var(--nt-panel-2); }
#boostPreviewContainer .table > tbody > tr > td { border-color: var(--nt-border); }

/* ---------- Offline progress (time warp) ---------- */
/* Only swap the colours; the game's own background-size and animation keep it moving. */
#offlineWrapper {
	background-image: linear-gradient(270deg, #1b2030, #2b2f5c, #1b2030, #1d4250, #1b2030, #3a2a6e, #1b2030) !important;
}
#offlineMapBtns, #offlineZoneBtns, #offlineExtraBtnsContainer {
	background: var(--nt-panel);
	border: 1px solid var(--nt-border) !important;
	border-radius: var(--nt-radius);
}

/* ---------- Talents (Mastery) ---------- */
.talentItem { border: 0 !important; border-radius: var(--nt-radius-sm); }
.talentPurchased { background: #2f855a; color: #f0fff4; }
.talentNotPurchased { background: var(--nt-bg-2); color: var(--nt-text); }
.talentRowLocked .talentNotPurchased { background: var(--nt-panel-3); color: var(--nt-muted); }
.talentRowUnlocked .talentNotPurchased.talentReqNeeded { background-color: #9b2c2c; color: #fff; }
.talentNotPurchased.talentCanBuyRow, .talentReqNeeded.talentCanBuyRow { background-color: #975a16 !important; color: #fffff0; }
.talentNotPurchased.talentIdealRow, .talentReqNeeded.talentIdealRow { background-color: #2b6cb0 !important; color: #ebf8ff; }
.talentPurchased.talentCanBuyRow { background-color: #22543d !important; }
.talentPurchased.talentIdealRow { background-color: #276749 !important; }

/* ---------- Dimensional Generator ---------- */
#generatorWindow { border-radius: var(--nt-radius); border: 0 !important; }
#generatorTitle { color: #fff; }
.dgChangeBtn { border: 0 !important; border-radius: var(--nt-radius-sm);}
#generatorUpgradeBtn { background: var(--nt-bg-2); color: #fff; border-radius: var(--nt-radius-sm);}
#fuelContainer { border: 0 !important; border-radius: var(--nt-radius-sm); overflow: hidden; }
#fuelOwnedText { color: #1a202c; }
#fuelBar { background: #ecc94b; }
#fuelStorageBar { background: #744210; }
#generatorNextTick { text-shadow: none; color: #fff; }
.generatorStateActive { background: #9b2c2c; }
.generatorStatePassive { background: #2c5282; }
.generatorStateHybridActive { background: linear-gradient(to right, #2c7a7b 30%, #9b2c2c 75%); }
.generatorStateHybridPassive { background: linear-gradient(to right, #2c7a7b 30%, #2c5282 75%); }
.radial-progress { border: 0; background: #2c7a7b; }
.generatorStateActive .radial-progress, .generatorStateHybridActive .radial-progress { background: #c53030; }
.generatorStatePassive .radial-progress, .generatorStateHybridPassive .radial-progress { background: #2b6cb0; }
.radial-progress .radial-progress-knob { border: 0; }
#magmiteCost, #magmiteOwned, #generatorUpgradeTitle, #generatorUpgradeDescription { color: var(--nt-text); }
.permGenUpgrade { border-radius: var(--nt-radius-sm); }

/* ---------- Player Spire (Spire TD) ---------- */
#playerSpireTab a { background-color: var(--nt-bg-2); color: var(--nt-warning); }
#playerSpireTab a:hover { background-color: var(--nt-panel-3); }
#playerSpireSpirePanel, #playerSpireInfoPanel, #playerSpireSmallPanel {
	background: var(--nt-bg-2);
	border: 1px solid var(--nt-border) !important;
	box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.6);
}
#playerSpireSpirePanel { border-radius: var(--nt-radius) 0 0 var(--nt-radius); }
#playerSpireInfoPanel, #playerSpireSmallPanel { border-radius: 0 var(--nt-radius) var(--nt-radius) 0; }
#playerSpireInfoPanel hr, #playerSpireSmallPanel hr { border-color: var(--nt-border); }
.playerSpireCell { border-color: var(--nt-bg-2); border-radius: 4px; }
.playerSpireEnemy { border: 0; border-radius: 4px; }
.spireQuest { border: 0; border-radius: var(--nt-radius); background: var(--nt-panel-2); }
.spireControlBoxDbl div, .spireControlBox, .spireControlBoxSmall {
	border: 0;
	border-radius: var(--nt-radius-sm);
	background: var(--nt-panel-3);
	color: var(--nt-text);
}
.spireControlBoxDbl div:hover, .spireControlBox:hover, .spireControlBoxSmall:hover { background: var(--nt-afford-2); }
.spireTrapBox, .spireTrapBoxSmall { border-color: transparent; border-radius: var(--nt-radius-sm); }
.spireTrapBox[style*="background-color: grey"],
.spireTrapBoxSmall[style*="background-color: grey"],
.spireControlBoxSmall[style*="background-color: grey"] { background-color: var(--nt-panel-2) !important; color: var(--nt-dim); opacity: 0.7; }
.spireTrapBox.selected, .spireTrapBoxSmall.selected, .spireControlBox.selected { border-color: #f6e05e !important; }
.spireTrapIcon, .spireTrapBox .icomoon, .spireTrapBoxSmall .icomoon { text-shadow: none; }

/* ---------- Spire Assault ---------- */
#autoItemsDiv { background-color: var(--nt-bg-2); border-radius: var(--nt-radius-sm); }
.autoItemNotEquipped { background-color: var(--nt-panel-2); border-color: var(--nt-border) !important; color: var(--nt-text); }
.autoItemNotEquipped:hover { background-color: var(--nt-panel-3); border-color: var(--nt-border-2) !important; }
.autoItemEquipped { background-color: var(--nt-success); border-color: var(--nt-success-l) !important; }
.autoItemEquipped:hover { background-color: var(--nt-success-2); }
.autoBattleBarHolder { background-color: var(--nt-bg-2); border-radius: 999px; overflow: hidden; }
.autoItemUpgrade { background-color: var(--nt-afford); border-color: var(--nt-accent) !important; color: #fff; }
.autoItemUpgrade:hover { background-color: var(--nt-afford-2); }

/* ---------- Mutators (U2) ---------- */
#mutSeedCounter { background-color: var(--nt-panel-2) !important; border: 1px solid var(--nt-border); border-radius: var(--nt-radius-sm); }
.mutatorBox { border-color: var(--nt-border-2) !important; border-radius: var(--nt-radius-sm); }
.mutatorBoxavailable { background-color: var(--nt-panel-3); border-color: var(--nt-accent) !important; box-shadow: 0 0 8px rgba(141, 155, 255, 0.35); }
.mutatorBoxrequirement { background-color: var(--nt-noafford); }
.mutatorBoxpurchased { background-color: var(--nt-success); border-color: var(--nt-success-l) !important; }

/* ---------- Fixes from the full-screen contrast sweep ---------- */
/* Small labels and generator */
#fuelOwnedText, #generatorFuelOwned, #generatorFuelMax { color: #fff !important; text-shadow: 0 0 2px #000, 0 1px 2px #000; }
.colorDefault, #generatorStateConfigBtn { background-color: var(--nt-panel-3); color: var(--nt-text); }
.colorDefault:hover { background-color: var(--nt-afford-2); }
.badge.antiBadge { background-color: #14182a !important; }
/* Cog half of AutoStructure / AutoJobs / AutoGold / AutoEquip and Maps buttons (the label half
   is the first child and also has an onclick, so match the second child only) */
.toggleConfigBtn > div:nth-child(2), #mapsBtn > div:nth-child(2) { background-color: rgba(0, 0, 0, 0.25) !important; }
.toggleConfigBtn > div:nth-child(2):hover, #mapsBtn > div:nth-child(2):hover { background-color: rgba(0, 0, 0, 0.4) !important; }
/* Fluffy crit preview: the game puts coloured text on mid-grey; a dark chip reads better */
#tooltipDiv .critSpan[style*="#5f5f5f"] { background-color: var(--nt-bg) !important; border-radius: 4px; }
/* Most-efficient equipment highlight (teal, so it stays distinct from normal buy buttons) */
.efficientYes.thingColorCanAfford    { background-color: #1d6b78 !important; border-color: #5fd0e3 !important; box-shadow: inset 3px 0 0 #9be7f3, var(--nt-shadow-sm); }
.efficientYes.thingColorCanNotAfford { background-color: #1d3340 !important; border-color: #3a7d8c !important; }
/* Archaeology relics: same idea as the game's, on theme colours */
.thingColorCanAffordRelicOff               { background: linear-gradient(to right, var(--nt-afford) 45%, #a3253a 60%); }
.thingColorCanNotAffordRelicOff            { background: linear-gradient(to right, var(--nt-noafford) 45%, #5a2230 60%); }
.thingColorCanAffordRelicSatisfied         { background: linear-gradient(to right, var(--nt-afford) 45%, #1f7a4a 60%); }
.thingColorCanNotAffordRelicSatisfied      { background: linear-gradient(to right, var(--nt-noafford) 45%, #1d4a35 60%); }
.thingColorCanAffordRelicNextWaiting       { background: linear-gradient(to right, var(--nt-afford) 45%, #8a7414 60%); }
.thingColorCanNotAffordRelicNextWaiting    { background: linear-gradient(to right, var(--nt-noafford) 45%, #4d4318 60%); }
.thingColorCanAffordRelicBuying            { background: linear-gradient(to right, var(--nt-afford) 45%, #3340b0 60%); }
.thingColorCanNotAffordRelicBuying         { background: linear-gradient(to right, var(--nt-noafford) 45%, #26306e 60%); }
/* Settings drawer */
#NewTab.tabNotSelected { background: rgba(232, 181, 63, 0.22); }
#NewTab a { color: var(--nt-warning) !important; }
.settingBtn3 { background-color: #217a8c; }
.settingBtn3:hover { background-color: #1b6676; }
/* Only the small gear buttons beside some settings (they have no class); the coloured toggles keep their own colours */
#settingsRow button[aria-label^="Configure"]:not(.settingsBtn) {
	background: var(--nt-panel-3);
	color: var(--nt-text);
	border: 1px solid var(--nt-border-2);
	border-radius: var(--nt-radius-sm);
}
#settingsRow button[aria-label^="Configure"]:not(.settingsBtn):hover { background: var(--nt-afford-2); }
/* Portal */
#portalPresetsTabs .tabNotEnabled a, #portalTabs .tabNotEnabled a { color: var(--nt-disabled); }
#portalWrapper .btn-warning, #clearPerksBtn { color: #2a1f00; }
.dailyTopRow { background: transparent !important; }
/* Loot breakdown tabs */
#lootBdTabs { background: transparent !important; }
/* Eggs, Spire Assault notes */
.eggMessage { background-color: var(--nt-bg-2); }
#autoBattleNotes { background-color: var(--nt-bg-2); border-radius: var(--nt-radius-sm); }
/* Spire defence: lightning trap is gold, so use dark text */
#LightningTrapBox { color: #1f1700 !important; }
/* Fluffy / Scruffy text colours meant for the light tooltip */
#tooltipDiv span[style*="#740774"] { color: #e27fe2 !important; }
.fluffFormZone        { color: #8fa2ff !important; }
.fluffFormKnowledge   { color: #b794f4 !important; }
.fluffFormBattlescruff{ color: #7f9cf5 !important; }
.fluffFormFrigid      { color: #90cdf4 !important; }
/* Quest and Mayhem (U2 challenges) */
.questMessage { background-color: var(--nt-bg-2); border-left: 3px solid var(--nt-warning); }
.questNew     { color: #8fa2ff; }
.questSuccess { color: var(--nt-success-l); }
#mayhemPoisonStacks span { background-color: var(--nt-bg-2); color: var(--nt-success-l); }
/* Achievement titles in the hover / popup card (lighter versions of the same hues) */
#achievementHover .achieveTier1, #achievementPopup .achieveTier1 { color: #68d391; }
#achievementHover .achieveTier2, #achievementPopup .achieveTier2 { color: #8fa2ff; }
#achievementHover .achieveTier3, #achievementPopup .achieveTier3 { color: #d6a5f0; }
#achievementHover .achieveTier4, #achievementPopup .achieveTier4 { color: #f6ad55; }
#achievementHover .achieveTier5, #achievementPopup .achieveTier5 { color: #fc8181; }
#achievementHover .achieveTier6, #achievementPopup .achieveTier6 { color: #f687b3; }

/* ---------- Alchemy, auto-battle, misc U2 ---------- */
/* Alchemy: the game's pastel cards were meant for dark text; tint them instead so light text reads */
.alchemyPopupCraft { border-color: var(--nt-border) !important; color: var(--nt-text); }
.alchemyPopupCraft.brew   { background-color: #233a5c; }
.alchemyPopupCraft.potion { background-color: #4a4320; }
.alchemyPopupCraft.brew:nth-child(2) { border-right-color: var(--nt-bg) !important; }
.alchemyPopupCraft .btn { border-color: var(--nt-border-2) !important; }
.alchemyCraftCost { background-color: rgba(0, 0, 0, 0.3); }
.autoRingSelect { background-color: var(--nt-panel-3); color: var(--nt-text); }
.equalityTabScalingOff a { background: var(--nt-panel-3) !important; color: var(--nt-muted) !important; }
.equalityTabScalingOn a { background: var(--nt-success) !important; color: #fff !important; }
#energyShield { color: #63b3ed; }
`;

	function paletteCss(palette) {
		return ':root {' + Object.keys(palette).map(function (k) { return ' --nt-' + k + ': ' + palette[k] + ';'; }).join('') + ' }';
	}

	function injectStyle(theme) {
		const id = theme.name + 'Theme';
		if (document.getElementById(id)) return;
		const style = document.createElement('style');
		style.id = id;
		style.textContent = CSS + '\n' + paletteCss(theme.palette) + (theme.css || '');
		// Trimps' removeStyles() removes theme elements via document.head.removeChild, so it must live in <head>.
		document.head.appendChild(style);
	}

	function patch() {
		const opt = window.game && game.options && game.options.menu && game.options.menu.darkTheme;
		if (!opt || opt.__niceThemePatched) return;

		const indexes = {};
		THEMES.forEach(function (theme) {
			if (!opt.titles.includes(theme.title)) opt.titles.push(theme.title);
			indexes[opt.titles.indexOf(theme.title)] = theme;
			// removeStyles() walks styleNames and removes "<name>Theme" elements, so registering here makes switching away work.
			if (!opt.styleNames.includes(theme.name)) opt.styleNames.push(theme.name);
		});

		const origApply = opt.applyStyle;
		opt.applyStyle = function (titleIndex) {
			if (indexes[titleIndex]) return injectStyle(indexes[titleIndex]);
			return origApply.call(this, titleIndex);
		};

		opt.description = opt.description.replace(/\.$/, '') + ', and the modern Nice Theme.';
		opt.__niceThemePatched = true;

		// Version 2.1 also had "Nice Theme Light" right after it. A save that had Light selected points past
		// the end of the list now, so move it to Nice Theme.
		if (opt.enabled >= opt.titles.length) opt.enabled = opt.titles.indexOf(THEMES[0].title);

		// Before this patch the game tried to apply our index itself, which adds a link to the missing
		// css/undefined.css. Remove those.
		document.querySelectorAll('link#undefinedTheme').forEach(function (el) { el.remove(); });

		// If the save already had a Nice Theme selected, the game applied a fallback before we patched. Re-apply now.
		if (indexes[opt.enabled]) opt.onToggle();

		// Refresh the settings button label in case it rendered before the title existed.
		if (typeof toggleSetting === 'function' && document.getElementById('toggledarkTheme')) {
			toggleSetting('darkTheme', null, false, true);
		}
	}

	// The game rebuilds its settings object on a hard reset and after offline progress, which drops the patch.
	// When that happens it re-applies a theme by adding a stylesheet to <head>, so watch for that and re-patch
	// straight away (no flash of the default theme). The interval is only a fallback; patch() is a no-op once applied.
	// Never let a theme problem interrupt the game itself.
	function safePatch() {
		try { patch(); } catch (e) { console.error('[Nice Theme]', e); }
	}
	safePatch();
	new MutationObserver(safePatch).observe(document.head, { childList: true });
	setInterval(safePatch, 1000);
})();
