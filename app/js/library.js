import * as mpd from "./lib/mpd.js";
import * as html from "./lib/html.js";
import * as ui from "./lib/ui.js";

import Search from "./lib/search.js";

let node, search;

function nonempty(x) { return x.length > 0; }

function buildHeader(filter) {
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

	header.appendChild(search.getNode());
}

function buildAlbum(album, filter, parent) {
	let childFilter = Object.assign({}, filter, {"Album": album});
	let node = ui.group(ui.CTX_LIBRARY, album, childFilter, parent);
	node.addEventListener("click", e => listSongs(childFilter));
	return node;
}

function buildArtist(artist, filter, parent) {
	let childFilter = Object.assign({}, filter, {"Artist": artist});
	let node = ui.group(ui.CTX_LIBRARY, artist, childFilter, parent);
	node.addEventListener("click", e => listAlbums(childFilter));
	return node;
}

function buildSongs(songs, filter) {
	let ul = node.querySelector("ul");
	html.clear(ul);

	songs.map(song => ui.song(ui.CTX_LIBRARY, song, ul));
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
	
}

export async function activate() {
	listArtists();
}

export function init(n) {
	node = n;

	search = new Search(node.querySelector(".search"));
	search.addEventListener("input", onSearch);
}
