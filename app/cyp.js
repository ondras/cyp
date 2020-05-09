class Range extends HTMLElement {
	static get observedAttributes() { return ["min", "max", "value", "step", "disabled"]; }

	constructor() {
		super();

		this._dom = {};

		this.addEventListener("mousedown", this);
		this.addEventListener("keydown", this);
	}

	get _valueAsNumber() {
		let raw = (this.hasAttribute("value") ? Number(this.getAttribute("value")) : 50);
		return this._constrain(raw);
	}
	get _minAsNumber() {
		return (this.hasAttribute("min") ? Number(this.getAttribute("min")) : 0);
	}
	get _maxAsNumber() {
		return (this.hasAttribute("max") ? Number(this.getAttribute("max")) : 100);
	}
	get _stepAsNumber() {
		return (this.hasAttribute("step") ? Number(this.getAttribute("step")) : 1);
	}

	get value() { return String(this._valueAsNumber); }
	get valueAsNumber() { return this._valueAsNumber; }
	get min() { return this.hasAttribute("min") ? this.getAttribute("min") : ""; }
	get max() { return this.hasAttribute("max") ? this.getAttribute("max") : ""; }
	get step() { return this.hasAttribute("step") ? this.getAttribute("step") : ""; }
	get disabled() { return this.hasAttribute("disabled"); }

	set _valueAsNumber(value) { this.value = String(value); }
	set min(min) { this.setAttribute("min", min); }
	set max(max) { this.setAttribute("max", max); }
	set value(value) { this.setAttribute("value", value); }
	set step(step) { this.setAttribute("step", step); }
	set disabled(disabled) {
		disabled ? this.setAttribute("disabled", "") : this.removeAttribute("disabled");
	}

	connectedCallback() {
		if (this.firstChild) { return; }

		this.innerHTML = `
			<span class="-track"></span>
			<span class="-elapsed"></span>
			<span class="-remaining"></span>
			<div class="-inner">
				<button class="-thumb"></button>
			</div>
		`;

		Array.from(this.querySelectorAll("[class^='-']")).forEach(node => {
			let name = node.className.substring(1);
			this._dom[name] = node;
		});

		this._update();
	}

	attributeChangedCallback(name, oldValue, newValue) {
		if (!this.firstChild) { return; }

		switch (name) {
			case "min":
			case "max":
			case "value":
			case "step":
				this._update();
			break;
		}
	}

	handleEvent(e) {
		switch (e.type) {
			case "mousedown":
				if (this.disabled) { return; }
				document.addEventListener("mousemove", this);
				document.addEventListener("mouseup", this);
				this._setToMouse(e);
			break;

			case "mousemove":
				this._setToMouse(e);
			break;

			case "mouseup":
				document.removeEventListener("mousemove", this);
				document.removeEventListener("mouseup", this);
				this.dispatchEvent(new CustomEvent("change"));
			break;

			case "keydown":
				if (this.disabled) { return; }
				this._handleKey(e.code);
				this.dispatchEvent(new CustomEvent("input"));
				this.dispatchEvent(new CustomEvent("change"));
			break;
		}
	}

	_handleKey(code) {
		let min = this._minAsNumber;
		let max = this._maxAsNumber;
		let range = max - min;
		let step = this._stepAsNumber;

		switch (code) {
			case "ArrowLeft":
			case "ArrowDown":
				this._valueAsNumber = this._constrain(this._valueAsNumber - step);
			break;

			case "ArrowRight":
			case "ArrowUp":
				this._valueAsNumber = this._constrain(this._valueAsNumber + step);
			break;

			case "Home": this._valueAsNumber = this._constrain(min); break;
			case "End": this._valueAsNumber = this._constrain(max); break;

			case "PageUp": this._valueAsNumber = this._constrain(this._valueAsNumber + range/10); break;
			case "PageDown": this._valueAsNumber = this._constrain(this._valueAsNumber - range/10); break;
		}
	}

	_constrain(value) {
		const min = this._minAsNumber;
		const max = this._maxAsNumber;
		const step = this._stepAsNumber;

		value = Math.max(value, min);
		value = Math.min(value, max);

		value -= min;
		value = Math.round(value / step) * step;
		value += min;
		if (value > max) { value -= step; }

		return value;
	}

	_update() {
		let min = this._minAsNumber;
		let max = this._maxAsNumber;
		let frac = (this._valueAsNumber-min) / (max-min);
		this._dom.thumb.style.left = `${frac * 100}%`;
		this._dom.remaining.style.left = `${frac * 100}%`;
		this._dom.elapsed.style.width = `${frac * 100}%`;
	}

	_setToMouse(e) {
		let rect = this._dom.inner.getBoundingClientRect();
		let x = e.clientX;
		x = Math.max(x, rect.left);
		x = Math.min(x, rect.right);

		let min = this._minAsNumber;
		let max = this._maxAsNumber;

		let frac = (x-rect.left) / (rect.right-rect.left);
		let value = this._constrain(min + frac * (max-min));
		if (value == this._valueAsNumber) { return; }

		this._valueAsNumber = value;
		this.dispatchEvent(new CustomEvent("input"));
	}
}

customElements.define('x-range', Range);

function linesToStruct(lines) {
	let result = {};
	lines.forEach(line => {
		let cindex = line.indexOf(":");
		if (cindex == -1) { throw new Error(`Malformed line "${line}"`); }
		let key = line.substring(0, cindex);
		let value = line.substring(cindex+2);
		if (key in result) {
			let old = result[key];
			if (old instanceof Array) {
				old.push(value);
			} else {
				result[key] = [old, value];
			}
		} else {
			result[key] = value;
		}
	});
	return result;
}

function songList(lines) {
	let songs = [];
	let batch = [];
	while (lines.length) {
		let line = lines[0];
		if (line.startsWith("file:") && batch.length) { 
			let song = linesToStruct(batch);
			songs.push(song);
			batch = [];
		}
		batch.push(lines.shift());
	}

	if (batch.length) {
		let song = linesToStruct(batch);
		songs.push(song);
	}

	return songs;
}

function pathContents(lines) {
	const prefixes = ["file", "directory", "playlist"];

	let batch = [];
	let result = {};
	let batchPrefix = null;
	prefixes.forEach(prefix => result[prefix] = []);

	while (lines.length) {
		let line = lines[0];
		let prefix = line.split(":")[0];
		if (prefixes.includes(prefix)) { // begin of a new batch
			if (batch.length) { result[batchPrefix].push(linesToStruct(batch)); }
			batchPrefix = prefix;
			batch = [];
		}
		batch.push(lines.shift());
	}

	if (batch.length) { result[batchPrefix].push(linesToStruct(batch)); }

	return result;
}

let ws, app;
let commandQueue = [];
let current;
let canTerminateIdle = false;

function onError(e) {
	console.error(e);
	current && current.reject(e);
	ws = null; // fixme
}

function onClose(e) {
	console.warn(e);
	current && current.reject(e);
	ws = null; // fixme
}

function onMessage(e) {
	if (!current) { return; }

	let lines = JSON.parse(e.data);
	let last = lines.pop();
	if (last.startsWith("OK")) {
		current.resolve(lines);
	} else {
		console.warn(last);
		current.reject(last);
	}
	current = null;

	if (commandQueue.length > 0) {
		advanceQueue();
	} else {
		setTimeout(idle, 0); // only after resolution callbacks
	}
}

function advanceQueue(){
	current = commandQueue.shift();
	ws.send(current.cmd);
}

async function idle() {
	if (current) { return; }

	canTerminateIdle = true;
	let lines = await command("idle stored_playlist playlist player options mixer");
	canTerminateIdle = false;
	let changed = linesToStruct(lines).changed || [];
	changed = [].concat(changed);
	(changed.length > 0) && app.dispatchEvent(new CustomEvent("idle-change", {detail:changed}));
}

async function command(cmd) {
	if (cmd instanceof Array) { cmd = ["command_list_begin", ...cmd, "command_list_end"].join("\n"); }

	return new Promise((resolve, reject) => {
		commandQueue.push({cmd, resolve, reject});

		if (!current) {
			advanceQueue();
		} else if (canTerminateIdle) {
			ws.send("noidle");
			canTerminateIdle = false;
		}
	});
}

async function status() {
	let lines = await command("status");
	return linesToStruct(lines);
}

async function currentSong() {
	let lines = await command("currentsong");
	return linesToStruct(lines);
}

async function listQueue() {
	let lines = await command("playlistinfo");
	return songList(lines);
}

async function listPlaylists() {
	let lines = await command("listplaylists");
	let parsed = linesToStruct(lines);

	let list = parsed["playlist"];
	if (!list) { return []; }
	return (list instanceof Array ? list : [list]);
}

async function listPath(path) {
	let lines = await command(`lsinfo "${escape(path)}"`);
	return pathContents(lines);
}

async function listTags(tag, filter = {}) {
	let tokens = ["list", tag];
	if (Object.keys(filter).length) {
		tokens.push(serializeFilter(filter));

		let fakeGroup = Object.keys(filter)[0]; // FIXME hack for MPD < 0.21.6
		tokens.push("group", fakeGroup);
	}
	let lines = await command(tokens.join(" "));
	let parsed = linesToStruct(lines);
	return [].concat(tag in parsed ? parsed[tag] : []);
}

async function listSongs(filter, window = null) {
	let tokens = ["find", serializeFilter(filter)];
	window && tokens.push("window", window.join(":"));
	let lines = await command(tokens.join(" "));
	return songList(lines);
}

async function searchSongs(filter) {
	let tokens = ["search", serializeFilter(filter, "contains")];
	let lines = await command(tokens.join(" "));
	return songList(lines);
}

async function albumArt(songUrl) {
	let data = [];
	let offset = 0;
	let params = ["albumart", `"${escape(songUrl)}"`, offset];

	while (1) {
		params[2] = offset;
		try {
			let lines = await command(params.join(" "));
			data = data.concat(lines[2]);
			let metadata = linesToStruct(lines.slice(0, 2));
			if (data.length >= Number(metadata["size"])) { return data; }
			offset += Number(metadata["binary"]);
		} catch (e) { return null; }
	}
	return null;
}

function serializeFilter(filter, operator = "==") {
	let tokens = ["("];
	Object.entries(filter).forEach(([key, value], index) => {
		index && tokens.push(" AND ");
		tokens.push(`(${key} ${operator} "${escape(value)}")`);
	});
	tokens.push(")");

	let filterStr = tokens.join("");
	return `"${escape(filterStr)}"`;
}

function escape(str) {
	return str.replace(/(['"\\])/g, "\\$1");
}

async function init(a) {
	app = a;
	let response = await fetch("/ticket", {method:"POST"});
	let ticket = (await response.json()).ticket;

	return new Promise((resolve, reject) => {
		current = {resolve, reject};

		try {
			let url = new URL(location.href);
			url.protocol = "ws";
			url.hash = "";
			url.searchParams.set("ticket", ticket);
			ws = new WebSocket(url.href);
		} catch (e) { reject(e); }

		ws.addEventListener("error", onError);
		ws.addEventListener("message", onMessage);
		ws.addEventListener("close", onClose);
	});
}

var mpd = /*#__PURE__*/Object.freeze({
	__proto__: null,
	command: command,
	status: status,
	currentSong: currentSong,
	listQueue: listQueue,
	listPlaylists: listPlaylists,
	listPath: listPath,
	listTags: listTags,
	listSongs: listSongs,
	searchSongs: searchSongs,
	albumArt: albumArt,
	serializeFilter: serializeFilter,
	escape: escape,
	init: init
});

function command$1(cmd) {
	console.warn(`mpd-mock does not know "${cmd}"`);
}

function status$1() {
	return {
		volume: 50,
		elapsed: 10,
		duration: 70,
		state: "play"
	}
}

function currentSong$1() {
	return {
		duration: 70,
		file: "name.mp3",
		Title: "Title of song",
		Artist: "Artist of song",
		Album: "Album of song",
		Track: "6",
		Id: 2
	}
}

function listQueue$1() {
	return [
		{Id:1, Track:"5", Title:"Title 1", Artist:"AAA", Album:"BBB", duration:30, file:"a.mp3"},
		currentSong$1(),
		{Id:3, Track:"7", Title:"Title 3", Artist:"CCC", Album:"DDD", duration:230, file:"c.mp3"},
	];
}

function listPlaylists$1() {
	return [
		"Playlist 1",
		"Playlist 2",
		"Playlist 3"
	];
}

function listPath$1(path) {
	return {
		"directory": [
			{"directory": "Dir 1"},
			{"directory": "Dir 2"},
			{"directory": "Dir 3"}
		],
		"file": [
			{"file": "File 1"},
			{"file": "File 2"},
			{"file": "File 3"}
		]
	}
}

function listTags$1(tag, filter = null) {
	switch (tag) {
		case "AlbumArtist": return ["Artist 1", "Artist 2", "Artist 3"];
		case "Album": return ["Album 1", "Album 2", "Album 3"];
	}
}

function listSongs$1(filter, window = null) {
	return listQueue$1();
}

function searchSongs$1(filter) {
	return listQueue$1();
}

function albumArt$1(songUrl) {
	return new Promise(resolve => setTimeout(resolve, 1000));
}

function init$1() {}

var mpdMock = /*#__PURE__*/Object.freeze({
	__proto__: null,
	command: command$1,
	status: status$1,
	currentSong: currentSong$1,
	listQueue: listQueue$1,
	listPlaylists: listPlaylists$1,
	listPath: listPath$1,
	listTags: listTags$1,
	listSongs: listSongs$1,
	searchSongs: searchSongs$1,
	albumArt: albumArt$1,
	init: init$1
});

let ICONS={};
ICONS["library-music"] = `<svg viewBox="0 0 24 24">
  <path d="M4,6H2V20A2,2 0 0,0 4,22H18V20H4M18,7H15V12.5A2.5,2.5 0 0,1 12.5,15A2.5,2.5 0 0,1 10,12.5A2.5,2.5 0 0,1 12.5,10C13.07,10 13.58,10.19 14,10.5V5H18M20,2H8A2,2 0 0,0 6,4V16A2,2 0 0,0 8,18H20A2,2 0 0,0 22,16V4A2,2 0 0,0 20,2Z"/>
</svg>`;
ICONS["plus"] = `<svg viewBox="0 0 24 24">
  <path d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z"/>
</svg>`;
ICONS["folder"] = `<svg viewBox="0 0 24 24">
  <path d="M10,4H4C2.89,4 2,4.89 2,6V18A2,2 0 0,0 4,20H20A2,2 0 0,0 22,18V8C22,6.89 21.1,6 20,6H12L10,4Z"/>
</svg>`;
ICONS["playlist-music"] = `<svg viewBox="0 0 24 24">
  <path d="M15,6H3V8H15V6M15,10H3V12H15V10M3,16H11V14H3V16M17,6V14.18C16.69,14.07 16.35,14 16,14A3,3 0 0,0 13,17A3,3 0 0,0 16,20A3,3 0 0,0 19,17V8H22V6H17Z"/>
</svg>`;
ICONS["settings"] = `<svg viewBox="0 0 24 24">
  <path d="M12,15.5A3.5,3.5 0 0,1 8.5,12A3.5,3.5 0 0,1 12,8.5A3.5,3.5 0 0,1 15.5,12A3.5,3.5 0 0,1 12,15.5M19.43,12.97C19.47,12.65 19.5,12.33 19.5,12C19.5,11.67 19.47,11.34 19.43,11L21.54,9.37C21.73,9.22 21.78,8.95 21.66,8.73L19.66,5.27C19.54,5.05 19.27,4.96 19.05,5.05L16.56,6.05C16.04,5.66 15.5,5.32 14.87,5.07L14.5,2.42C14.46,2.18 14.25,2 14,2H10C9.75,2 9.54,2.18 9.5,2.42L9.13,5.07C8.5,5.32 7.96,5.66 7.44,6.05L4.95,5.05C4.73,4.96 4.46,5.05 4.34,5.27L2.34,8.73C2.21,8.95 2.27,9.22 2.46,9.37L4.57,11C4.53,11.34 4.5,11.67 4.5,12C4.5,12.33 4.53,12.65 4.57,12.97L2.46,14.63C2.27,14.78 2.21,15.05 2.34,15.27L4.34,18.73C4.46,18.95 4.73,19.03 4.95,18.95L7.44,17.94C7.96,18.34 8.5,18.68 9.13,18.93L9.5,21.58C9.54,21.82 9.75,22 10,22H14C14.25,22 14.46,21.82 14.5,21.58L14.87,18.93C15.5,18.67 16.04,18.34 16.56,17.94L19.05,18.95C19.27,19.03 19.54,18.95 19.66,18.73L21.66,15.27C21.78,15.05 21.73,14.78 21.54,14.63L19.43,12.97Z"/>
</svg>`;
ICONS["pause"] = `<svg viewBox="0 0 24 24">
  <path d="M14,19H18V5H14M6,19H10V5H6V19Z"/>
</svg>`;
ICONS["artist"] = `<svg viewBox="0 0 24 24">
  <path d="M11,14C12,14 13.05,14.16 14.2,14.44C13.39,15.31 13,16.33 13,17.5C13,18.39 13.25,19.23 13.78,20H3V18C3,16.81 3.91,15.85 5.74,15.12C7.57,14.38 9.33,14 11,14M11,12C9.92,12 9,11.61 8.18,10.83C7.38,10.05 7,9.11 7,8C7,6.92 7.38,6 8.18,5.18C9,4.38 9.92,4 11,4C12.11,4 13.05,4.38 13.83,5.18C14.61,6 15,6.92 15,8C15,9.11 14.61,10.05 13.83,10.83C13.05,11.61 12.11,12 11,12M18.5,10H20L22,10V12H20V17.5A2.5,2.5 0 0,1 17.5,20A2.5,2.5 0 0,1 15,17.5A2.5,2.5 0 0,1 17.5,15C17.86,15 18.19,15.07 18.5,15.21V10Z"/>
</svg>`;
ICONS["volume-off"] = `<svg viewBox="0 0 24 24">
  <path d="M12,4L9.91,6.09L12,8.18M4.27,3L3,4.27L7.73,9H3V15H7L12,20V13.27L16.25,17.53C15.58,18.04 14.83,18.46 14,18.7V20.77C15.38,20.45 16.63,19.82 17.68,18.96L19.73,21L21,19.73L12,10.73M19,12C19,12.94 18.8,13.82 18.46,14.64L19.97,16.15C20.62,14.91 21,13.5 21,12C21,7.72 18,4.14 14,3.23V5.29C16.89,6.15 19,8.83 19,12M16.5,12C16.5,10.23 15.5,8.71 14,7.97V10.18L16.45,12.63C16.5,12.43 16.5,12.21 16.5,12Z"/>
</svg>`;
ICONS["keyboard-backspace"] = `<svg viewBox="0 0 24 24">
  <path d="M21,11H6.83L10.41,7.41L9,6L3,12L9,18L10.41,16.58L6.83,13H21V11Z"/>
</svg>`;
ICONS["cancel"] = `<svg viewBox="0 0 24 24">
  <path d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12,4A8,8 0 0,0 4,12C4,13.85 4.63,15.55 5.68,16.91L16.91,5.68C15.55,4.63 13.85,4 12,4M12,20A8,8 0 0,0 20,12C20,10.15 19.37,8.45 18.32,7.09L7.09,18.32C8.45,19.37 10.15,20 12,20Z"/>
</svg>`;
ICONS["fast-forward"] = `<svg viewBox="0 0 24 24">
  <path d="M13,6V18L21.5,12M4,18L12.5,12L4,6V18Z"/>
</svg>`;
ICONS["delete"] = `<svg viewBox="0 0 24 24">
  <path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z"/>
</svg>`;
ICONS["volume-high"] = `<svg viewBox="0 0 24 24">
  <path d="M14,3.23V5.29C16.89,6.15 19,8.83 19,12C19,15.17 16.89,17.84 14,18.7V20.77C18,19.86 21,16.28 21,12C21,7.72 18,4.14 14,3.23M16.5,12C16.5,10.23 15.5,8.71 14,7.97V16C15.5,15.29 16.5,13.76 16.5,12M3,9V15H7L12,20V4L7,9H3Z"/>
</svg>`;
ICONS["minus"] = `<svg viewBox="0 0 24 24">
  <path d="M19,13H5V11H19V13Z"/>
</svg>`;
ICONS["play"] = `<svg viewBox="0 0 24 24">
  <path d="M8,5.14V19.14L19,12.14L8,5.14Z"/>
</svg>`;
ICONS["magnify"] = `<svg viewBox="0 0 24 24">
  <path d="M9.5,3A6.5,6.5 0 0,1 16,9.5C16,11.11 15.41,12.59 14.44,13.73L14.71,14H15.5L20.5,19L19,20.5L14,15.5V14.71L13.73,14.44C12.59,15.41 11.11,16 9.5,16A6.5,6.5 0 0,1 3,9.5A6.5,6.5 0 0,1 9.5,3M9.5,5C7,5 5,7 5,9.5C5,12 7,14 9.5,14C12,14 14,12 14,9.5C14,7 12,5 9.5,5Z"/>
</svg>`;
ICONS["arrow-down-bold"] = `<svg viewBox="0 0 24 24">
  <path d="M9,4H15V12H19.84L12,19.84L4.16,12H9V4Z"/>
</svg>`;
ICONS["music"] = `<svg viewBox="0 0 24 24">
  <path d="M21,3V15.5A3.5,3.5 0 0,1 17.5,19A3.5,3.5 0 0,1 14,15.5A3.5,3.5 0 0,1 17.5,12C18.04,12 18.55,12.12 19,12.34V6.47L9,8.6V17.5A3.5,3.5 0 0,1 5.5,21A3.5,3.5 0 0,1 2,17.5A3.5,3.5 0 0,1 5.5,14C6.04,14 6.55,14.12 7,14.34V6L21,3Z"/>
</svg>`;
ICONS["rewind"] = `<svg viewBox="0 0 24 24">
  <path d="M11.5,12L20,18V6M11,18V6L2.5,12L11,18Z"/>
</svg>`;
ICONS["album"] = `<svg viewBox="0 0 24 24">
  <path d="M12,11A1,1 0 0,0 11,12A1,1 0 0,0 12,13A1,1 0 0,0 13,12A1,1 0 0,0 12,11M12,16.5C9.5,16.5 7.5,14.5 7.5,12C7.5,9.5 9.5,7.5 12,7.5C14.5,7.5 16.5,9.5 16.5,12C16.5,14.5 14.5,16.5 12,16.5M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z"/>
</svg>`;
ICONS["download"] = `<svg viewBox="0 0 24 24">
  <path d="M5,20H19V18H5M19,9H15V3H9V9H5L12,16L19,9Z"/>
</svg>`;
ICONS["account-multiple"] = `<svg viewBox="0 0 24 24">
  <path d="M16,13C15.71,13 15.38,13 15.03,13.05C16.19,13.89 17,15 17,16.5V19H23V16.5C23,14.17 18.33,13 16,13M8,13C5.67,13 1,14.17 1,16.5V19H15V16.5C15,14.17 10.33,13 8,13M8,11A3,3 0 0,0 11,8A3,3 0 0,0 8,5A3,3 0 0,0 5,8A3,3 0 0,0 8,11M16,11A3,3 0 0,0 19,8A3,3 0 0,0 16,5A3,3 0 0,0 13,8A3,3 0 0,0 16,11Z"/>
</svg>`;
ICONS["close"] = `<svg viewBox="0 0 24 24">
  <path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z"/>
</svg>`;
ICONS["content-save"] = `<svg viewBox="0 0 24 24">
  <path d="M15,9H5V5H15M12,19A3,3 0 0,1 9,16A3,3 0 0,1 12,13A3,3 0 0,1 15,16A3,3 0 0,1 12,19M17,3H5C3.89,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V7L17,3Z"/>
</svg>`;
ICONS["arrow-up-bold"] = `<svg viewBox="0 0 24 24">
  <path d="M15,20H9V12H4.16L12,4.16L19.84,12H15V20Z"/>
</svg>`;
ICONS["chevron-double-right"] = `<svg viewBox="0 0 24 24">
  <path d="M5.59,7.41L7,6L13,12L7,18L5.59,16.59L10.17,12L5.59,7.41M11.59,7.41L13,6L19,12L13,18L11.59,16.59L16.17,12L11.59,7.41Z"/>
</svg>`;
ICONS["shuffle"] = `<svg viewBox="0 0 24 24">
  <path d="M14.83,13.41L13.42,14.82L16.55,17.95L14.5,20H20V14.5L17.96,16.54L14.83,13.41M14.5,4L16.54,6.04L4,18.59L5.41,20L17.96,7.46L20,9.5V4M10.59,9.17L5.41,4L4,5.41L9.17,10.58L10.59,9.17Z"/>
</svg>`;
ICONS["checkbox-marked-outline"] = `<svg viewBox="0 0 24 24">
  <path d="M19,19H5V5H15V3H5C3.89,3 3,3.89 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V11H19M7.91,10.08L6.5,11.5L11,16L21,6L19.59,4.58L11,13.17L7.91,10.08Z"/>
</svg>`;
ICONS["repeat"] = `<svg viewBox="0 0 24 24">
  <path d="M17,17H7V14L3,18L7,22V19H19V13H17M7,7H17V10L21,6L17,2V5H5V11H7V7Z"/>
</svg>`;

function node(name, attrs, content, parent) {
	let n = document.createElement(name);
	Object.assign(n, attrs);

	if (attrs && attrs.title) { n.setAttribute("aria-label", attrs.title); }

	content && text(content, n);
	parent && parent.appendChild(n);
	return n;
}

function icon(type, parent) {
	let str = ICONS[type];
	if (!str) {
		console.error("Bad icon type '%s'", type);
		return node("span", {}, "‽");
	}

	let tmp = node("div");
	tmp.innerHTML = str;
	let s = tmp.querySelector("svg");
	if (!s) { throw new Error(`Bad icon source for type '${type}'`); }

	s.classList.add("icon");
	s.classList.add(`icon-${type}`);

	parent && parent.appendChild(s);
	return s;
}

function button(attrs, content, parent) {
	let result = node("button", attrs, content, parent);
	if (attrs && attrs.icon) {
		let i = icon(attrs.icon);
		result.insertBefore(i, result.firstChild);
	}
	return result;
}

function clear(node) {
	while (node.firstChild) { node.firstChild.parentNode.removeChild(node.firstChild); }
	return node;
}

function text(txt, parent) {
	let n = document.createTextNode(txt);
	parent && parent.appendChild(n);
	return n;
}

function initIcons() {
	Array.from(document.querySelectorAll("[data-icon]")).forEach(/** @param {HTMLElement} node */ node => {
		node.dataset.icon.split(" ").forEach(name => {
			let icon$1 = icon(name);
			node.insertBefore(icon$1, node.firstChild);
		});
	});
}

async function initMpd(app) {
	try {
		await init(app);
		return mpd;
	} catch (e) {
		return mpdMock;
	}
}

class App extends HTMLElement {
	static get observedAttributes() { return ["component"]; }

	constructor() {
		super();

		initIcons();
	}

	async connectedCallback() {
		this.mpd = await initMpd(this);

		const children = Array.from(this.querySelectorAll("*"));
		const names = children.map(node => node.nodeName.toLowerCase())
			.filter(name => name.startsWith("cyp-"));
		const unique = new Set(names);

		const promises = [...unique].map(name => customElements.whenDefined(name));
		await Promise.all(promises);

		this.dispatchEvent(new CustomEvent("load"));

		const onHashChange = () => {
			const component = location.hash.substring(1) || "queue";
			if (component != this.component) { this.component = component; }
		};
		window.addEventListener("hashchange", onHashChange);
		onHashChange();
	}

	attributeChangedCallback(name, oldValue, newValue) {
		switch (name) {
			case "component":
				location.hash = newValue;
				const e = new CustomEvent("component-change");
				this.dispatchEvent(e);
			break;
		}
	}

	get component() { return this.getAttribute("component"); }
	set component(component) { this.setAttribute("component", component); }
}

customElements.define("cyp-app", App);

const TAGS = ["cyp-song", "cyp-tag", "cyp-path"];

class Selection {
	constructor(component, mode) {
		this._component = component;
		/** @type {"single" | "multi"} */
		this._mode = mode;
		this._items = [];
		this._node = node("cyp-commands", {hidden:true});
	}

	appendTo(parent) { parent.appendChild(this._node); }

	clear() {
		while (this._items.length) { this.remove(this._items[0]); }
	}

	addCommand(cb, options) {
		const button$1 = button({icon:options.icon}, "", this._node);
		node("span", {}, options.label, button$1);
		button$1.addEventListener("click", _ => {
			const arg = (this._mode == "single" ? this._items[0] : this._items);
			cb(arg);
		});
		return button$1;
	}

	addCommandAll() {
		this.addCommand(_ => {
			Array.from(this._component.querySelectorAll(TAGS.join(", ")))
				.forEach(node => this.add(node));
		}, {label:"Select all", icon:"checkbox-marked-outline"});
	}

	addCommandCancel() {
		const button = this.addCommand(_ => this.clear(), {icon:"cancel", label:"Cancel"});
		button.classList.add("last");
		return button;
	}

	toggle(node) {
		if (this._items.includes(node)) {
			this.remove(node);
		} else {
			this.add(node);
		}
	}

	add(node) {
		if (this._items.includes(node)) { return; }
		const length = this._items.length;
		this._items.push(node);
		node.classList.add("selected");

		if (this._mode == "single" && length > 0) { this.remove(this._items[0]); }

		if (length == 0) { this._show(); }
	}

	remove(node) {
		const index = this._items.indexOf(node);
		this._items.splice(index, 1);
		node.classList.remove("selected");
		if (this._items.length == 0) { this._hide(); }
	}

	_show() {
		this._node.hidden = false;
	}

	_hide() {
		this._node.hidden = true;
	}
}

customElements.define("cyp-commands", class extends HTMLElement {});

class Component extends HTMLElement {
	constructor(options = {}) {
		super();
		if (options.selection) { this.selection = new Selection(this, options.selection); }
	}

	connectedCallback() {
		if (this.selection) {
			const parent = this._app.querySelector("footer");
			this.selection.appendTo(parent);
		}
		this._app.addEventListener("load", _ => this._onAppLoad());
		this._app.addEventListener("component-change", _ => {
			const component = this._app.component;
			const isThis = (this.nodeName.toLowerCase() == `cyp-${component}`);
			this._onComponentChange(component, isThis);
		});
	}

	get _app() { return this.closest("cyp-app"); }
	get _mpd() { return this._app.mpd; }

	_onAppLoad() {}
	_onComponentChange(_component, _isThis) {}
}

class Menu extends Component {
	_onAppLoad() {
		/** @type HTMLElement[] */
		this._tabs = Array.from(this.querySelectorAll("[data-for]"));

		this._tabs.forEach(tab => {
			tab.addEventListener("click", _ => this._app.setAttribute("component", tab.dataset.for));
		});

		this._app.addEventListener("queue-length-change", e => {
			this.querySelector(".queue-length").textContent = `(${e.detail})`;
		});

	}
	_onComponentChange(component) {
		this._tabs.forEach(tab => {
			tab.classList.toggle("active", tab.dataset.for == component);
		});
	}
}

customElements.define("cyp-menu", Menu);

const artSize = 96;
const ytPath = "_youtube";
let ytLimit = 3;

function setYtLimit(limit) { ytLimit = limit; }

const cache = {};
const MIME = "image/jpeg";
const STORAGE_PREFIX = `art-${artSize}` ;

function store(key, data) {
	localStorage.setItem(`${STORAGE_PREFIX}-${key}`, data);
}

function load(key) {
	return localStorage.getItem(`${STORAGE_PREFIX}-${key}`);
}

async function bytesToImage(bytes) {
	const blob = new Blob([bytes]);
	const src = URL.createObjectURL(blob);
	const image = node("img", {src});
	return new Promise(resolve => {
		image.onload = () => resolve(image);
	});
}

function resize(image) {
	const canvas = node("canvas", {width:artSize, height:artSize});
	const ctx = canvas.getContext("2d");
	ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
	return canvas;
}

async function get(mpd, artist, album, songUrl = null) {
	const key = `${artist}-${album}`;
	if (key in cache) { return cache[key]; }

	const loaded = await load(key);
	if (loaded) {
		cache[key] = loaded;
		return loaded;
	}

	if (!songUrl) { return null; }

	// promise to be returned in the meantime
	let resolve;
	const promise = new Promise(res => resolve = res);
	cache[key] = promise;

	const data = await mpd.albumArt(songUrl);
	if (data) {
		const bytes = new Uint8Array(data);
		const image = await bytesToImage(bytes);
		const url = resize(image).toDataURL(MIME);
		store(key, url);
		cache[key] = url;
		resolve(url);
	} else {
		cache[key] = null;
	}
	return cache[key];
}

const SEPARATOR = " · ";

function time(sec) {
	sec = Math.round(sec);
	let m = Math.floor(sec / 60);
	let s = sec % 60;
	return `${m}:${s.toString().padStart(2, "0")}`;
}

function subtitle(data, options = {duration:true}) {
	let tokens = [];
	data["Artist"] && tokens.push(data["Artist"]);
	data["Album"] && tokens.push(data["Album"]);
	options.duration && data["duration"] && tokens.push(time(Number(data["duration"])));
	return tokens.join(SEPARATOR);
}

function fileName(file) {
	return file.split("/").pop();
}

const ELAPSED_PERIOD = 500;

class Player extends Component {
	constructor() {
		super();
		this._current = {
			song: {},
			elapsed: 0,
			at: 0,
			volume: 0
		};
		this._toggleVolume = 0;

		const DOM = {};
		const all = this.querySelectorAll("[class]");
		[...all].forEach(node => DOM[node.className] = node);
		DOM.progress = DOM.timeline.querySelector("x-range");
		DOM.volume = DOM.volume.querySelector("x-range");

		this._dom = DOM;
	}

	handleEvent(e) {
		switch (e.type) {
			case "idle-change":
				let hasOptions = e.detail.includes("options");
				let hasPlayer = e.detail.includes("player");
				let hasMixer = e.detail.includes("mixer");
				(hasOptions || hasPlayer || hasMixer) && this._updateStatus();
				hasPlayer && this._updateCurrent();
			break;
		}
	}

	_onAppLoad() {
		this._addEvents();
		this._updateStatus();
		this._updateCurrent();
		this._app.addEventListener("idle-change", this);

		setInterval(() => this._updateElapsed(), ELAPSED_PERIOD);
	}

	async _updateStatus() {
		const data = await this._mpd.status();

		this._updateFlags(data);
		this._updateVolume(data);

		// rebase the time sync
		this._current.elapsed = Number(data["elapsed"] || 0);
		this._current.at = performance.now();
	}

	async _updateCurrent() {
		const data = await this._mpd.currentSong();
		const DOM = this._dom;

		if (data["file"] != this._current.song["file"]) { // changed song
			if (data["file"]) { // is there a song at all?
				DOM.title.textContent = data["Title"] || fileName(data["file"]);
				DOM.subtitle.textContent = subtitle(data, {duration:false});

				let duration = Number(data["duration"]);
				DOM.duration.textContent = time(duration);
				DOM.progress.max = duration;
				DOM.progress.disabled = false;
			} else {
				DOM.title.textContent = "";
				DOM.subtitle.textContent = "";
				DOM.progress.value = 0;
				DOM.progress.disabled = true;
			}

			this._dispatchSongChange(data);
		}

		let artistNew = data["AlbumArtist"] || data["Artist"];
		let artistOld = this._current.song["AlbumArtist"] || this._current.song["Artist"];
		let albumNew = data["Album"];
		let albumOld = this._current.song["Album"];

		Object.assign(this._current.song, data);

		if (artistNew != artistOld || albumNew != albumOld) { // changed album (art)
			clear(DOM.art);
			let src = await get(this._mpd, artistNew, data["Album"], data["file"]);
			if (src) {
				node("img", {src}, "", DOM.art);
			} else {
				icon("music", DOM.art);
			}
		}
	}

	_updateElapsed() {
		const DOM = this._dom;

		let elapsed = 0;
		if (this._current.song["file"]) {
			elapsed = this._current.elapsed;
			if (this.dataset.state == "play") { elapsed += (performance.now() - this._current.at)/1000; }
		}

		DOM.progress.value = elapsed;
		DOM.elapsed.textContent = time(elapsed);
		this._app.style.setProperty("--progress", DOM.progress.value/DOM.progress.max);
	}

	_updateFlags(data) {
		let flags = [];
		if (data["random"] == "1") { flags.push("random"); }
		if (data["repeat"] == "1") { flags.push("repeat"); }
		if (data["volume"] === "0") { flags.push("mute"); } // strict, because volume might be missing
		this.dataset.flags = flags.join(" ");
		this.dataset.state = data["state"];
	}

	_updateVolume(data) {
		const DOM = this._dom;

		if ("volume" in data) {
			let volume = Number(data["volume"]);

			DOM.mute.disabled = false;
			DOM.volume.disabled = false;
			DOM.volume.value = volume;

			if (volume == 0 && this._current.volume > 0) { this._toggleVolume = this._current.volume; } // muted
			if (volume > 0 && this._current.volume == 0) { this._toggleVolume = 0; } // restored
			this._current.volume = volume;
		} else {
			DOM.mute.disabled = true;
			DOM.volume.disabled = true;
			DOM.volume.value = 50;
		}
	}

	_addEvents() {
		const DOM = this._dom;

		DOM.play.addEventListener("click", _ => this._app.mpd.command("play"));
		DOM.pause.addEventListener("click", _ => this._app.mpd.command("pause 1"));
		DOM.prev.addEventListener("click", _ => this._app.mpd.command("previous"));
		DOM.next.addEventListener("click", _ => this._app.mpd.command("next"));

		DOM.random.addEventListener("click", _ => {
			let isRandom = this.dataset.flags.split(" ").includes("random");
			this._app.mpd.command(`random ${isRandom ? "0" : "1"}`);
		});
		DOM.repeat.addEventListener("click", _ => {
			let isRepeat = this.dataset.flags.split(" ").includes("repeat");
			this._app.mpd.command(`repeat ${isRepeat ? "0" : "1"}`);
		});

		DOM.progress.addEventListener("input", e => {
			let elapsed = e.target.valueAsNumber;
			this._current.elapsed = elapsed;
			this._current.at = performance.now();
			this._app.mpd.command(`seekcur ${elapsed}`);
		});

		DOM.volume.addEventListener("input", e => this._app.mpd.command(`setvol ${e.target.valueAsNumber}`));
		DOM.mute.addEventListener("click", _ => this._app.mpd.command(`setvol ${this._toggleVolume}`));
	}

	_dispatchSongChange(detail) {
		const e = new CustomEvent("song-change", {detail});
		this._app.dispatchEvent(e);
	}
}

customElements.define("cyp-player", Player);

class Item extends HTMLElement {
	constructor() {
		super();
		this.addEventListener("click", _ => this.onClick());
	}

	addButton(icon, cb) {
		button({icon}, "", this).addEventListener("click", e => {
			e.stopPropagation(); // do not select
			cb();
		});
	}

	onClick() { this.parentNode.selection.toggle(this); }

	_buildTitle(title) {
		return node("span", {className:"title"}, title, this);
	}
}

class Song extends Item {
	constructor(data) {
		super();
		this._data = data;
	}

	get file() { return this._data["file"]; }
	get songId() { return this._data["Id"]; }

	set playing(playing) {
		this.classList.toggle("playing", playing);
	}

	connectedCallback() {
		const data = this._data;

		icon("music", this);
		icon("play", this);

		const block = node("div", {className:"multiline"}, "", this);

		const title = this._buildTitle(data);
		block.appendChild(title);
		if (data["Track"]) {
			const track = node("span", {className:"track"}, data["Track"].padStart(2, "0"));
			title.insertBefore(text(" "), title.firstChild);
			title.insertBefore(track, title.firstChild);
		}

		if (data["Title"]) {
			const subtitle$1 = subtitle(data);
			node("span", {className:"subtitle"}, subtitle$1, block);
		}

		this.playing = false;
	}

	_buildTitle(data) {
		return super._buildTitle(data["Title"] || fileName(this.file));
	}
}

customElements.define("cyp-song", Song);

function generateMoveCommands(items, diff, all) {
	const COMPARE = (a, b) => all.indexOf(a) - all.indexOf(b);

	return items.sort(COMPARE)
		.map(item => {
			let index = all.indexOf(item) + diff;
			if (index < 0 || index >= all.length) { return null; } // this does not move
			return `moveid ${item.songId} ${index}`;
		})
		.filter(command => command);
}

class Queue extends Component {
	constructor() {
		super({selection:"multi"});
		this._currentId = null;
		this._initCommands();
	}

	handleEvent(e) {
		switch (e.type) {
			case "song-change":
				this._currentId = e.detail["Id"];
				this._updateCurrent();
			break;

			case "idle-change":
				e.detail.includes("playlist") && this._sync();
			break;
		}
	}

	_onAppLoad() {
		this._app.addEventListener("idle-change", this);
		this._app.addEventListener("song-change", this);
		this._sync();
	}

	_onComponentChange(c, isThis) {
		this.hidden = !isThis;
	}

	async _sync() {
		let songs = await this._mpd.listQueue();
		this._buildSongs(songs);

		let e = new CustomEvent("queue-length-change", {detail:songs.length});
		this._app.dispatchEvent(e);
	}

	_updateCurrent() {
		Array.from(this.children).forEach(/** @param {Song} node */ node => {
			node.playing = (node.songId == this._currentId);
		});
	}

	_buildSongs(songs) {
		clear(this);
		this.selection.clear();

		songs.forEach(song => {
			const node = new Song(song);
			this.appendChild(node);

			node.addButton("play", async _ => {
				await this._mpd.command(`playid ${node.songId}`);
			});
		});

		this._updateCurrent();
	}

	_initCommands() {
		const sel = this.selection;

		sel.addCommandAll();

		sel.addCommand(items => {
			const commands = generateMoveCommands(items, -1, Array.from(this.children));
			this._mpd.command(commands);
		}, {label:"Up", icon:"arrow-up-bold"});

		sel.addCommand(items => {
			const commands = generateMoveCommands(items, +1, Array.from(this.children));
			this._mpd.command(commands.reverse()); // move last first
		}, {label:"Down", icon:"arrow-down-bold"});

		sel.addCommand(items => {
			let name = prompt("Save selected songs as a playlist?", "name");
			if (name === null) { return; }

			name = escape(name);
			const commands = items.map(item => {
				return `playlistadd "${name}" "${escape(item.file)}"`;
			});

			this._mpd.command(commands); // FIXME notify?
		}, {label:"Save", icon:"content-save"});

		sel.addCommand(async items => {
			if (!confirm(`Remove these ${items.length} songs from the queue?`)) { return; }

			const commands = items.map(item => `deleteid ${item.songId}`);
			this._mpd.command(commands);
		}, {label:"Remove", icon:"delete"});

		sel.addCommandCancel();
	}
}

customElements.define("cyp-queue", Queue);

class Playlist extends Item {
	constructor(name) {
		super();
		this.name = name;
	}

	connectedCallback() {
		icon("playlist-music", this);
		this._buildTitle(this.name);
	}
}

customElements.define("cyp-playlist", Playlist);

class Playlists extends Component {
	constructor() {
		super({selection:"single"});
		this._initCommands();
	}

	handleEvent(e) {
		switch (e.type) {
			case "idle-change":
				e.detail.includes("stored_playlist") && this._sync();
			break;
		}
	}

	_onAppLoad() {
		this._app.addEventListener("idle-change", this);
		this._sync();
	}

	_onComponentChange(c, isThis) {
		this.hidden = !isThis;
	}

	async _sync() {
		let lists = await this._mpd.listPlaylists();
		this._buildLists(lists);
	}

	_buildLists(lists) {
		clear(this);
		this.selection.clear();

		lists.forEach(name => this.appendChild(new Playlist(name)));
	}

	_initCommands() {
		const sel = this.selection;

		sel.addCommand(async item => {
			const name = item.name;
			const commands = ["clear", `load "${escape(name)}"`, "play"];
			await this._mpd.command(commands);
			this.selection.clear(); // fixme notification?
		}, {label:"Play", icon:"play"});

		sel.addCommand(async item => {
			const name = item.name;
			await this._mpd.command(`load "${escape(name)}"`);
			this.selection.clear(); // fixme notification?
		}, {label:"Enqueue", icon:"plus"});

		sel.addCommand(async item => {
			const name = item.name;
			if (!confirm(`Really delete playlist '${name}'?`)) { return; }

			await this._mpd.command(`rm "${escape(name)}"`);
		}, {label:"Delete", icon:"delete"});

		sel.addCommandCancel();
	}
}

customElements.define("cyp-playlists", Playlists);

const prefix = "cyp";

function loadFromStorage(key) {
	return localStorage.getItem(`${prefix}-${key}`);
}

function saveToStorage(key, value) {
	return localStorage.setItem(`${prefix}-${key}`, value);
}

class Settings extends Component {
	constructor() {
		super();
		this._inputs = {
			theme: this.querySelector("[name=theme]"),
			ytLimit: this.querySelector("[name=yt-limit]"),
			color: Array.from(this.querySelectorAll("[name=color]"))
		};
	}

	_onAppLoad() {
		let mo = new MutationObserver(mrs => {
			mrs.forEach(mr => this._onAppAttributeChange(mr));
		});
		mo.observe(this._app, {attributes:true});

		this._inputs.theme.addEventListener("change", e => this._setTheme(e.target.value));
		this._inputs.ytLimit.addEventListener("change", e => this._setYtLimit(e.target.value));
		this._inputs.color.forEach(input => {
			input.addEventListener("click", e => this._setColor(e.target.value));
		});

		const theme = loadFromStorage("theme");
		(theme ? this._app.setAttribute("theme", theme) : this._syncTheme());

		const color = loadFromStorage("color");
		(color ? this._app.setAttribute("color", color) : this._syncColor());

		const ytLimit$1 = loadFromStorage("ytLimit") || ytLimit;
		this._setYtLimit(ytLimit$1);
	}

	_onAppAttributeChange(mr) {
		if (mr.attributeName == "theme") { this._syncTheme(); }
		if (mr.attributeName == "color") { this._syncColor(); }
	}

	_syncTheme() {
		this._inputs.theme.value = this._app.getAttribute("theme");
	}

	_syncColor() {
		this._inputs.color.forEach(input => {
			input.checked = (input.value == this._app.getAttribute("color"));
			input.parentNode.style.color = input.value;
		});
	}

	_setTheme(theme) {
		saveToStorage("theme", theme);
		this._app.setAttribute("theme", theme);
	}

	_setColor(color) {
		saveToStorage("color", color);
		this._app.setAttribute("color", color);
	}

	_setYtLimit(ytLimit) {
		saveToStorage("ytLimit", ytLimit);
		setYtLimit(ytLimit);
	}

	_onComponentChange(c, isThis) {
		this.hidden = !isThis;
	}
}

customElements.define("cyp-settings", Settings);

class Search extends HTMLElement {
	constructor() {
		super();
		this._built = false;
	}

	get value() { return this._input.value.trim(); }
	set value(value) { this._input.value = value; }
	get _input() { return this.querySelector("input"); }

	onSubmit() {}
	focus() { this._input.focus(); }
	pending(pending) { this.classList.toggle("pending", pending); }

	connectedCallback() {
		if (this._built) { return; }

		const form = node("form", {}, "", this);
		node("input", {type:"text"}, "", form);
		button({icon:"magnify"}, "", form);

		form.addEventListener("submit", e => {
			e.preventDefault();
			this.onSubmit();
		});

		this._built = true;
	}
}

customElements.define("cyp-search", Search);

class YtResult extends Item {
	constructor(title) {
		super();
		this._title = title;
	}

	connectedCallback() {
		this.appendChild(icon("magnify"));
		this._buildTitle(this._title);
	}

	onClick() {}
}

customElements.define("cyp-yt-result", YtResult);

const decoder = new TextDecoder("utf-8");

function decodeChunk(byteArray) {
	// \r => \n
	return decoder.decode(byteArray).replace(/\u000d/g, "\n");
}

class YT extends Component {
	constructor() {
		super();
		this._search = new Search();

		this._search.onSubmit = _ => {
			let query = this._search.value;
			query && this._doSearch(query);
		};
	}

	connectedCallback() {
		super.connectedCallback();

		this._clear();
	}

	_clear() {
		clear(this);
		this.appendChild(this._search);
	}

	async _doSearch(query) {
		this._clear();
		this._search.pending(true);

		let url = `/youtube?q=${encodeURIComponent(query)}&limit=${encodeURIComponent(ytLimit)}`;
		let response = await fetch(url);
		let results = await response.json();

		this._search.pending(false);

		results.forEach(result => {
			let node = new YtResult(result.title);
			this.appendChild(node);
			node.addButton("download", () => this._download(result.id));
		});
	}


	async _download(id) {
		this._clear();

		let pre = node("pre", {}, "", this);
		this._search.pending(true);

		let body = new URLSearchParams();
		body.set("id", id);
		let response = await fetch("/youtube", {method:"POST", body});

		let reader = response.body.getReader();
		while (true) {
			let { done, value } = await reader.read();
			if (done) { break; }
			pre.textContent += decodeChunk(value);
			pre.scrollTop = pre.scrollHeight;
		}
		reader.releaseLock();

		this._search.pending(false);

		if (response.status == 200) {
			this._mpd.command(`update ${escape(ytPath)}`);
		}
	}

	_onComponentChange(c, isThis) {
		const wasHidden = this.hidden;
		this.hidden = !isThis;

		if (!wasHidden && isThis) { this._showRoot(); }
	}
}

customElements.define("cyp-yt", YT);

const ICONS$1 = {
	"AlbumArtist": "artist",
	"Album": "album"
};

class Tag extends Item {
	constructor(type, value, filter) {
		super();
		this._type = type;
		this._value = value;
		this._filter = filter;
	}

	connectedCallback() {
		node("span", {className:"art"}, "", this);
		this._buildTitle(this._value);
	}

	createChildFilter() {
		return Object.assign({[this._type]:this._value}, this._filter);
	}

	async fillArt(mpd) {
		const parent = this.firstChild;
		const filter = this.createChildFilter();

		let artist = filter["AlbumArtist"];
		let album = filter["Album"];
		let src = null;

		if (artist && album) {
			src = await get(mpd, artist, album);
			if (!src) {
				let songs = await mpd.listSongs(filter, [0,1]);
				if (songs.length) {
					src = await get(mpd, artist, album, songs[0]["file"]);
				}
			}
		}

		if (src) {
			node("img", {src}, "", parent);
		} else {
			const icon$1 = ICONS$1[this._type];
			icon(icon$1, parent);
		}
	}
}

customElements.define("cyp-tag", Tag);

class Path extends Item {
	constructor(data) {
		super();
		this._data = data;
		this._isDirectory = ("directory" in this._data);
	}

	get file() { return (this._isDirectory ? this._data["directory"] : this._data["file"]); }

	connectedCallback() {
		this.appendChild(icon(this._isDirectory ? "folder" : "music"));
		this._buildTitle(fileName(this.file));
	}
}

customElements.define("cyp-path", Path);

class Back extends Item {
	constructor(title) {
		super();
		this._title = title;
	}

	connectedCallback() {
		this.appendChild(icon("keyboard-backspace"));
		this._buildTitle(this._title);
	}
}

customElements.define("cyp-back", Back);

const TAGS$1 = {
	"Album": "Albums",
	"AlbumArtist": "Artists"
};

function nonempty(str) { return (str.length > 0); }

function createEnqueueCommand(node) {
	if (node instanceof Song) {
		return `add "${escape(node.data["file"])}"`;
	} else if (node instanceof Path) {
		return `add "${escape(node.file)}"`;
	} else if (node instanceof Tag) {
		return [
			"findadd",
			serializeFilter(node.createChildFilter()),
			// `sort ${SORT}` // MPD >= 0.22, not yet released
		].join(" ");
	} else {
		throw new Error(`Cannot create enqueue command for "${node.nodeName}"`);
	}
}

class Library extends Component {
	constructor() {
		super({selection:"multi"});
		this._stateStack = [];
		this._initCommands();

		this._search = new Search();
		this._search.onSubmit = _ => {
			let query = this._search.value;
			if (query.length < 3) { return; }
			this._doSearch(query);
		};
	}

	_popState() {
		this.selection.clear();
		this._stateStack.pop();

		if (this._stateStack.length > 0) {
			let state = this._stateStack[this._stateStack.length-1];
			this._showState(state);
		} else {
			this._showRoot();
		}
	}

	_onAppLoad() {
		this._showRoot();
	}

	_onComponentChange(c, isThis) {
		const wasHidden = this.hidden;
		this.hidden = !isThis;

		if (!wasHidden && isThis) { this._showRoot(); }
	}

	_showRoot() {
		this._stateStack = [];
		clear(this);

		const nav = node("nav", {}, "", this);

		button({icon:"artist"}, "Artists and albums", nav)
			.addEventListener("click", _ => this._pushState({type:"tags", tag:"AlbumArtist"}));

		button({icon:"folder"}, "Files and directories", nav)
			.addEventListener("click", _ => this._pushState({type:"path", path:""}));

		button({icon:"magnify"}, "Search", nav)
			.addEventListener("click", _ => this._pushState({type:"search"}));
	}

	_pushState(state) {
		this.selection.clear();
		this._stateStack.push(state);

		this._showState(state);
	}

	_showState(state) {
		switch (state.type) {
			case "tags": this._listTags(state.tag, state.filter); break;
			case "songs": this._listSongs(state.filter); break;
			case "path": this._listPath(state.path); break;
			case "search": this._showSearch(state.query); break;
		}
	}

	async _listTags(tag, filter = {}) {
		const values = await this._mpd.listTags(tag, filter);
		clear(this);

		if ("AlbumArtist" in filter) { this._buildBack(); }
		values.filter(nonempty).forEach(value => this._buildTag(tag, value, filter));
	}

	async _listPath(path) {
		let paths = await this._mpd.listPath(path);
		clear(this);

		path && this._buildBack();
		paths["directory"].forEach(path => this._buildPath(path));
		paths["file"].forEach(path => this._buildPath(path));
	}

	async _listSongs(filter) {
		const songs = await this._mpd.listSongs(filter);
		clear(this);
		this._buildBack();
		songs.forEach(song => this.appendChild(new Song(song)));
	}

	_showSearch(query = "") {
		clear(this);

		this.appendChild(this._search);
		this._search.value = query;
		this._search.focus();

		query && this._search.onSubmit();
	}

	async _doSearch(query) {
		let state = this._stateStack[this._stateStack.length-1];
		state.query = query;

		clear(this);
		this.appendChild(this._search);
		this._search.pending(true);

		const songs1 = await this._mpd.searchSongs({"AlbumArtist": query});
		const songs2 = await this._mpd.searchSongs({"Album": query});
		const songs3 = await this._mpd.searchSongs({"Title": query});

		this._search.pending(false);

		this._aggregateSearch(songs1, "AlbumArtist");
		this._aggregateSearch(songs2, "Album");
		songs3.forEach(song => this.appendChild(new Song(song)));
	}

	_aggregateSearch(songs, tag) {
		let results = new Map();
		songs.forEach(song => {
			let filter = {}, value;
			const artist = song["AlbumArtist"] || song["Artist"];

			if (tag == "Album") {
				value = song[tag];
				if (artist) { filter["AlbumArtist"] = artist; }
			}

			if (tag == "AlbumArtist") { value = artist; }

			results.set(value, filter);
		});

		results.forEach((filter, value) => this._buildTag(tag, value, filter));
	}

	_buildTag(tag, value, filter) {
		let node;
		switch (tag) {
			case "AlbumArtist":
				node = new Tag(tag, value, filter);
				this.appendChild(node);
				node.onClick = () => this._pushState({type:"tags", tag:"Album", filter:node.createChildFilter()});
			break;

			case "Album":
				node = new Tag(tag, value, filter);
				this.appendChild(node);
				node.addButton("chevron-double-right", _ => this._pushState({type:"songs", filter:node.createChildFilter()}));
			break;
		}
		node.fillArt(this._mpd);
	}

	_buildBack() {
		const backState = this._stateStack[this._stateStack.length-2];
		let title;
		switch (backState.type) {
			case "path": title = ".."; break;
			case "search": title = "Search"; break;
			case "tags": title = TAGS$1[backState.tag]; break;
		}

		const node = new Back(title);
		this.appendChild(node);
		node.onClick = () => this._popState();
	}

	_buildPath(data) {
		let node = new Path(data);
		this.appendChild(node);

		if ("directory" in data) {
			const path = data["directory"];
			node.addButton("chevron-double-right", _ => this._pushState({type:"path", path}));
		}
	}

	_initCommands() {
		const sel = this.selection;

		sel.addCommandAll();

		sel.addCommand(async items => {
			const commands = ["clear",...items.map(createEnqueueCommand), "play"];
			await this._mpd.command(commands);
			this.selection.clear(); // fixme notification?
		}, {label:"Play", icon:"play"});

		sel.addCommand(async items => {
			const commands = items.map(createEnqueueCommand);
			await this._mpd.command(commands);
			this.selection.clear(); // fixme notification?
		}, {label:"Enqueue", icon:"plus"});

		sel.addCommandCancel();
	}
}

customElements.define("cyp-library", Library);
