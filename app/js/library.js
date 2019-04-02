import * as mpd from "./lib/mpd.js";
import * as html from "./lib/html.js";
import * as ui from "./lib/ui.js";
import * as format from "./lib/format.js";

import Search from "./lib/search.js";

let node, search;

function nonempty(x) { return x.length > 0; }

function buildHeader(filter) {
	filter = filter || {};
	let header = node.querySelector("header");
	html.clear(header);

	search.reset();
	header.appendChild(search.getNode());

	let artist = filter["Artist"];
	if (artist) {
		let artistFilter = {"Artist":artist};
		let button = html.button({icon:"artist"}, artist, header);
		button.addEventListener("click", e => listAlbums(artistFilter));

		let album = filter["Album"];
		if (album) {
			html.node("span", {}, format.SEPARATOR, header);
			let albumFilter = Object.assign({}, artistFilter, {"Album":album});
			let button = html.button({icon:"album"}, album, header);
			button.addEventListener("click", e => listSongs(albumFilter));
		}
	}

}

function buildAlbum(album, filter, parent) {
	let childFilter = Object.assign({}, filter, {"Album": album});
	let node = ui.group(ui.CTX_LIBRARY, album, childFilter, parent);
	node.addEventListener("click", e => listSongs(childFilter));
	node.dataset.name = album;
	return node;
}

function buildArtist(artist, filter, parent) {
	let childFilter = Object.assign({}, filter, {"Artist": artist});
	let node = ui.group(ui.CTX_LIBRARY, artist, childFilter, parent);
	node.addEventListener("click", e => listAlbums(childFilter));
	node.dataset.name = artist;
	return node;
}

function buildSongs(songs, filter) {
	let ul = node.querySelector("ul");
	html.clear(ul);

	songs.map(song => {
		let node = ui.song(ui.CTX_LIBRARY, song, ul);
		node.dataset.name = song["Title"];
	});
}

function buildAlbums(albums, filter) {
	let ul = node.querySelector("ul");
	html.clear(ul);

	albums.filter(nonempty).map(album => buildAlbum(album, filter, ul));
}

function buildArtists(artists, filter) {
	let ul = node.querySelector("ul");
	html.clear(ul);

	artists.filter(nonempty).map(artist => buildArtist(artist, filter, ul));
}

async function listSongs(filter) {
	let songs = await mpd.listSongs(filter);
	buildSongs(songs, filter);
	buildHeader(filter);
}

async function listAlbums(filter) {
	let albums = await mpd.listTags("Album", filter);
	buildAlbums(albums, filter);
	buildHeader(filter);
}

async function listArtists(filter) {
	let artists = await mpd.listTags("Artist", filter);
	buildArtists(artists, filter);
	buildHeader(filter);
}

function onSearch(e) {
	Array.from(node.querySelectorAll("[data-name]")).forEach(node => {
		let name = node.dataset.name;
		node.style.display = (search.match(name) ? "" : "none");
	});
}

export async function activate() {
	listArtists();
}

export function init(n) {
	node = n;

	search = new Search(node.querySelector(".search"));
	search.addEventListener("input", onSearch);
}
