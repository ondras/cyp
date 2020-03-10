import * as mpd from "./mpd.js";
import * as html from "./html.js";
import * as format from "./format.js";
import * as art from "./art.js";

export const CTX_FS = 1;
export const CTX_QUEUE = 2;
export const CTX_LIBRARY = 3;

const TYPE_ID = 1;
const TYPE_URL = 2;
const TYPE_FILTER = 3;
const TYPE_PLAYLIST = 4;

const SORT = "-Track";

async function enqueue(type, what) {
	switch (type) {
		case TYPE_URL: return mpd.command(`add "${mpd.escape(what)}"`); break;
		case TYPE_FILTER: return mpd.enqueueByFilter(what, SORT); break;
		case TYPE_PLAYLIST: return mpd.command(`load "${mpd.escape(what)}"`); break;
	}
}

async function fillArt(parent, filter) {
	let artist = filter["AlbumArtist"];
	let album = filter["Album"];
	let src = null;

	if (artist && album) {
		src = await art.get(artist, album);
		if (!src) {
			let songs = await mpd.listSongs(filter, [0,1]);
			if (songs.length) {
				src = await art.get(artist, album, songs[0]["file"]);
			}
		}
	}

	if (src) {
		html.node("img", {src}, "", parent);
	} else {
		html.icon(album ? "album" : "artist", parent);
	}
}

function fileName(data) {
	return data["file"].split("/").pop();
}

function formatSongInfo(ctx, data) {
	let lines = [];
	let tokens = [];
	switch (ctx) {
		case CTX_FS: lines.push(fileName(data)); break;

		case CTX_LIBRARY:
		case CTX_QUEUE:
			if (data["Title"]) {
				if (ctx == CTX_LIBRARY && data["Track"]) {
					tokens.push(data["Track"].padStart(2, "0"));
				}
				tokens.push(data["Title"]);
				lines.push(tokens.join(" "));
				lines.push(format.subtitle(data));
			} else {
				lines.push(fileName(data));
				lines.push("\u00A0");
			}
		break;
	}

	return lines;
}

function playButton(type, what, parent) {
	let button = html.button({icon:"play", title:"Play"}, "", parent);
	button.addEventListener("click", async e => {
		if (type == TYPE_ID) {
			await mpd.command(`playid ${what}`);
		} else {
			await mpd.command("clear");
			await enqueue(type, what);
			await mpd.command("play");
			pubsub.publish("queue-change");
		}
		button.closest("cyp-app").querySelector("cyp-player").update(); // FIXME nejde to lepe?
	});

	return button;
}

function addButton(type, what, parent) {
	let button = html.button({icon:"plus", title:"Add to queue"}, "", parent);
	button.addEventListener("click", async e => {
		e.stopPropagation();
		await enqueue(type, what);
		pubsub.publish("queue-change");
		// fixme notification?
	});
	return button;
}

export function song(ctx, data, parent) {
	let node = html.node("li", {className:"song"}, "", parent);
	let info = html.node("div", {className:"info"}, "", node);

	if (ctx == CTX_FS) { html.icon("music", info); }

	let lines = formatSongInfo(ctx, data);
	html.node("h2", {}, lines.shift(), info);
	lines.length && html.node("div", {}, lines.shift(), info);


	switch (ctx) {
		case CTX_QUEUE:
			let id = data["Id"];
			node.dataset.songId = id;
			playButton(TYPE_ID, id, node);
			deleteButton(TYPE_ID, id, node);
		break;

		case CTX_LIBRARY:
		case CTX_FS:
			let url = data["file"];
			playButton(TYPE_URL, url, node);
			addButton(TYPE_URL, url, node);
		break;
	}

	return node;
}

export function group(ctx, label, urlOrFilter, parent) {
	let node = html.node("li", {className:"group"}, "", parent);

	if (ctx == CTX_LIBRARY) {
		node.classList.add("has-art");
		let art = html.node("span", {className:"art"}, "", node);
		fillArt(art, urlOrFilter);
	}

	let info = html.node("span", {className:"info"}, "", node);
	if (ctx == CTX_FS) { html.icon("folder", info); }
	html.node("h2", {}, label, info);

	let type = (ctx == CTX_FS ? TYPE_URL : TYPE_FILTER);

	playButton(type, urlOrFilter, node);
	addButton(type, urlOrFilter, node);

	return node;
}
