import * as mpd from "./lib/mpd.js";
import * as html from "./lib/html.js";
import * as player from "./player.js";
import * as pubsub from "./lib/pubsub.js";
import * as format from "./lib/format.js";

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

async function deleteSong(id) {
	await mpd.command(`deleteid ${id}`);
	activate();
}

function buildSong(song) {
	let id = Number(song["Id"]);

	let node = html.node("li");
	node.dataset.songId = id;

	html.button({className:"play"}, "▶", node).addEventListener("click", e => playSong(id));

	let info = html.node("div", {className:"info"}, "", node);

	html.node("h2", {className:"title"}, song["Title"], info);
	html.node("span", {className:"artist-album"}, format.artistAlbum(song["Artist"], song["Album"]), info);
	html.node("span", {className:"duration"}, format.time(Number(song["duration"])), info);

	html.button({className:"delete"}, "🗙", node).addEventListener("click", e => deleteSong(id));

	return node;
}

function buildSongs(songs) {
	let ul = node.querySelector("ul");
	html.clear(ul);

	songs.map(buildSong).forEach(li => ul.appendChild(li));

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
