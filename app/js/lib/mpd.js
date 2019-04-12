import * as parser from "./parser.js";

let ws;
let commandQueue = [];
let current;

function onMessage(e) {
	if (current) {
		let lines = JSON.parse(e.data);
		let last = lines.pop();
		if (last.startsWith("OK")) {
			current.resolve(lines);
		} else {
			console.warn(last);
			current.reject(last);
		}
		current = null;
	}
	processQueue();
}

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

function processQueue() {
	if (current || commandQueue.length == 0) { return; }
	current = commandQueue.shift();
	ws.send(current.cmd);
}

function serializeFilter(filter) {
	let tokens = ["("];
	Object.entries(filter).forEach(([key, value], index) => {
		index && tokens.push(" AND ");
		tokens.push(`(${key} == "${escape(value)}")`);
	});
	tokens.push(")");

	let filterStr = tokens.join("");
	return `"${escape(filterStr)}"`;
}

export function escape(str) {
	return str.replace(/(['"\\])/g, "\\$1");
}

export async function command(cmd) {
	if (cmd instanceof Array) { cmd = ["command_list_begin", ...cmd, "command_list_end"].join("\n"); }

	return new Promise((resolve, reject) => {
		commandQueue.push({cmd, resolve, reject});
		processQueue();
	});
}

export async function commandAndStatus(cmd) {
	let lines = await command([cmd, "status", "currentsong"]);
	let status = parser.linesToStruct(lines);
	if (status["duration"] instanceof Array) { status["duration"] = status["duration"][0]; }
	return status;
}

export async function status() {
	let lines = await command(["status", "currentsong"]);
	let status = parser.linesToStruct(lines);
	if (status["duration"] instanceof Array) { status["duration"] = status["duration"][0]; }
	return status;
}

export async function listQueue() {
	let lines = await command("playlistinfo");
	return parser.songList(lines);
}

export async function listPlaylists() {
	let lines = await command("listplaylists");
	let parsed = parser.linesToStruct(lines);

	let list = parsed["playlist"];
	if (!list) { return []; }
	return (list instanceof Array ? list : [list]);
}

export async function enqueueByFilter(filter, sort = null) {
	let tokens = ["findadd"];
	tokens.push(serializeFilter(filter));
//	sort && tokens.push("sort", sort);  FIXME not implemented in MPD
	return command(tokens.join(" "));
}

export async function listPath(path) {
	let lines = await command(`lsinfo "${escape(path)}"`);
	return parser.pathContents(lines);
}

export async function listTags(tag, filter = null) {
	let tokens = ["list", tag];
	if (filter) {
		tokens.push(serializeFilter(filter));

		let fakeGroup = Object.keys(filter)[0]; // FIXME hack for MPD < 0.21.6
		tokens.push("group", fakeGroup);
	}
	let lines = await command(tokens.join(" "));
	let parsed = parser.linesToStruct(lines);
	return [].concat(tag in parsed ? parsed[tag] : []);
}

export async function listSongs(filter, window = null) {
	let tokens = ["find"];
	tokens.push(serializeFilter(filter));
	if (window) { tokens.push("window", window.join(":")); }
	let lines = await command(tokens.join(" "));
	return parser.songList(lines);
}

export async function albumArt(songUrl) {
	let data = [];
	let offset = 0;
	while (1) {
		let params = ["albumart", `"${escape(songUrl)}"`, offset];
		let lines = await command(params.join(" "));
		data = data.concat(lines[2]);
		let metadata = parser.linesToStruct(lines.slice(0, 2));
		if (data.length >= Number(metadata["size"])) { return data; }
		offset += Number(metadata["binary"]);
	}
	return null;
}

export async function init() {
	return new Promise((resolve, reject) => {
		try {
			ws = new WebSocket(`ws://${location.host}`);
		} catch (e) { reject(e); }
		current = {resolve, reject};

		ws.addEventListener("error", onError);
		ws.addEventListener("message", onMessage);
		ws.addEventListener("close", onClose);
	});
}
