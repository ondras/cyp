import * as app from "./app.js";
import * as mpd from "./lib/mpd.js";
import * as html from "./lib/html.js";
import * as player from "./player.js";
import * as format from "./lib/format.js";
import * as ui from "./lib/ui.js";

let node;

function buildHeader(path) {
	let header = node.querySelector("header");
	html.clear(header);

	let button = html.button({}, "/", header);
	button.addEventListener("click", e => list(""));

	path.split("/").filter(x => x).forEach((name, index, all) => {
		let button = html.button({}, name, header);
		let path = all.slice(0, index+1).join("/");
		button.addEventListener("click", e => list(path));
	});
}

function buildDirectory(data, parent) {
	let path = data["directory"];
	let name = path.split("/").pop();
	let node = ui.group(ui.GROUP_DIRECTORY, name, path, parent);
	node.addEventListener("click", e => list(path));
	return node;
}

function buildFile(data, parent) {
	return ui.song(ui.SONG_FILE, data, parent);
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
	buildHeader(path);
}

export async function activate() {
	list("");
}

export function init(n) {
	node = n;
}
