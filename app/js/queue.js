import * as mpd from "./lib/mpd.js";
import * as html from "./lib/html.js";
import * as player from "./player.js";
import * as pubsub from "./lib/pubsub.js";

let node;
let currentId;

function updateCurrent() {
	let all = Array.from(node.querySelectorAll("[data-song-id]"));
	all.forEach(node => {
		node.classList.toggle("current", node.dataset.songId == currentId);
	});
}

async function playSong(id) {
	await mpd.command(`playid ${id}`);
	player.update();
}

function buildSong(song) {
	let id = Number(song["Id"]);

	let node = html.node("li");
	node.dataset.songId = id;

	node.textContent = song["file"];
	let play = html.button({}, "▶", node);
	play.addEventListener("click", e => playSong(id));

	return node;
}

function buildSongs(songs) {
	html.clear(node);

	let ul = html.node("ul");
	songs.map(buildSong).forEach(li => ul.appendChild(li));

	node.appendChild(ul);
	updateCurrent();
}

function onSongChange(message, publisher, data) {
	currentId = data["Id"];
	updateCurrent();
}

export async function activate() {
	let songs = await mpd.listQueue();
	buildSongs(songs);
}

export function init(n) {
	node = n;
	pubsub.subscribe("song-change", onSongChange);
}
