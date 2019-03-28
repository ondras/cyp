import * as mpd from "./lib/mpd.js";
import * as html from "./lib/html.js";
import * as pubsub from "./lib/pubsub.js";
import * as ui from "./lib/ui.js";

let node;
let currentId;

function updateCurrent() {
	let all = Array.from(node.querySelectorAll("[data-song-id]"));
	all.forEach(node => {
		node.classList.toggle("current", node.dataset.songId == currentId);
	});
}

function buildSongs(songs) {
	let ul = node.querySelector("ul");
	html.clear(ul);

	songs.map(song => ui.song(ui.CTX_QUEUE, song, ul));

	updateCurrent();
}

function onSongChange(message, publisher, data) {
	currentId = data["Id"];
	updateCurrent();
}

function onQueueChange(message, publisher, data) {
	syncQueue();
}

async function syncQueue() {
	let songs = await mpd.listQueue();
	buildSongs(songs);
	document.querySelector("#queue-length").textContent = `(${songs.length})`;
}

export async function activate() {
	syncQueue();
}

export function init(n) {
	node = n;
	syncQueue();
	pubsub.subscribe("song-change", onSongChange);
	pubsub.subscribe("queue-change", onQueueChange);

	node.querySelector(".clear").addEventListener("click", async e => {
		await mpd.command("clear");
		syncQueue();
	});

	node.querySelector(".save").addEventListener("click", e => {
		let name = prompt("Save current queue as a playlist?", "name");
		if (name === null) { return; }
		mpd.command(`save "${mpd.escape(name)}"`);
	});
}
