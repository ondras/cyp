import * as app from "./app.js";
import * as mpd from "./lib/mpd.js";
import * as html from "./lib/html.js";
import * as player from "./player.js";
import * as format from "./lib/format.js";
import * as ui from "./lib/ui.js";

let node;
const SORT = "-Track";

function buildHeader(path) {
	filter = filter || {};
	let header = node.querySelector("header");
	html.clear(header);

	let button = html.button({}, "Music Library", header);
	button.addEventListener("click", e => listArtists());

	let artist = filter["Artist"];
	if (artist) {
		let artistFilter = {"Artist":artist};
		let button = html.button({}, artist, header);
		button.addEventListener("click", e => listAlbums(artistFilter));

		let album = filter["Album"];
		if (album) {
			let albumFilter = Object.assign({}, artistFilter, {"Album":album});
			let button = html.button({}, album, header);
			button.addEventListener("click", e => listSongs(albumFilter));
		}
	}
}

function buildDirectory(data, parent) {
	let path = data["directory"];
	let node = ui.group(path, {}, parent);
	node.addEventListener("click", e => list(path));
	return node;
}

function buildFile(data, parent) {
	return ui.song(data, parent);
}

function buildResults(results) {
	let ul = node.querySelector("ul");
	html.clear(ul);

	results["directory"].forEach(directory => buildDirectory(directory, ul));
	results["file"].forEach(file => buildFile(file, ul));
}

async function list(path) {
	let results = await mpd.listPath(path);
	buildResults(results);
//	buildHeader(path);
}

export async function activate() {
	list("");
}

export function init(n) {
	node = n;
}
