import * as mpd from "./lib/mpd.js";
import * as html from "./lib/html.js";
import * as pubsub from "./lib/pubsub.js";
import * as ui from "./lib/ui.js";

let node;

function buildLists(lists) {
	let ul = node.querySelector("ul");
	html.clear(ul);

	lists.map(list => ui.playlist(list, ul));
}

async function syncLists() {
	let lists = await mpd.listPlaylists();
	buildLists(lists);
}

export async function activate() {
	syncLists();
}

export function init(n) {
	node = n;
}
