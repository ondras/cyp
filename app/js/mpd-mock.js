import * as mpd from "./mpd.js";

export const escape = mpd.escape;

export function command(cmd) {
	console.warn(`mpd-mock does not know "${cmd}"`);
}

export function commandAndStatus(cmd) {
	command(cmd);
	return status();
}

export function status() {
	return {
		volume: 50,
		elapsed: 10,
		duration: 70,
		file: "name.mp3",
		Title: "Title of song",
		Artist: "Artist of song",
		Album: "Album of song",
		Track: 6,
		state: "play",
		Id: 2
	}
}

export function listQueue() {
	return [
		{Id:1, Track:5, Title:"Title 1", Artist:"AAA", Album:"BBB", duration:30},
		status(),
		{Id:3, Track:7, Title:"Title 3", Artist:"CCC", Album:"DDD", duration:230},
	];
}

export async function listPlaylists() {
	return [
		"Playlist 1",
		"Playlist 2",
		"Playlist 3"
	];
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
	return null;
}

export function init() {}
