import * as mpd from "./mpd.js";
import * as html from "./html.js";
import * as pubsub from "./pubsub.js";
import * as format from "./format.js";
import * as player from "../player.js";

export const CTX_FS = 1;
export const CTX_QUEUE = 2;
export const CTX_LIBRARY = 3;

const TYPE_ID = 1;
const TYPE_URL = 2;
const TYPE_FILTER = 3;
const TYPE_PLAYLIST = 4;

const SORT = "-Track";

function enqueue(type, what) {
	switch (type) {
		case TYPE_URL: return mpd.command(`add "${mpd.escape(what)}"`); break;
		case TYPE_FILTER: return mpd.enqueueByFilter(what, SORT); break;
		case TYPE_PLAYLIST: return mpd.command(`load "${mpd.escape(what)}"`); break;
	}
}

function fileName(data) {
	return data["file"].split("/").pop();
}

function formatTitle(ctx, data) {
	let tokens = [];
	switch (ctx) {
		case CTX_FS: return fileName(data); break;

		case CTX_LIBRARY:
			data["Track"] && tokens.push(data["Track"].padStart(2, "0"));
			data["Title"] && tokens.push(data["Title"]);
			if (!tokens.length)  {tokens.push(fileName(data)); }
			return tokens.join(" ");
		break;

		case CTX_QUEUE:
			data["Artist"] && tokens.push(data["Artist"]);
			data["Title"] && tokens.push(data["Title"]);
			if (!tokens.length) { tokens.push(fileName(data)); }
			return tokens.join(" - ");
		break;
	}
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
		player.update();
	});

	return button;

}

function deleteButton(type, id, parent) {
	let title;

	switch (type) {
		case TYPE_ID: title = "Delete from queue"; break;
		case TYPE_PLAYLIST: title = "Delete playlist"; break;
	}

	let button = html.button({icon:"close", title}, "", parent);
	button.addEventListener("click", async e => {
		switch (type) {
			case TYPE_ID:
				await mpd.command(`deleteid ${id}`);
				pubsub.publish("queue-change");
			return;
			case TYPE_PLAYLIST: 
				let ok = confirm(`Really delete playlist '${id}'?`);
				if (!ok) { return; }
				await mpd.command(`rm "${mpd.escape(id)}"`);
				pubsub.publish("playlists-change");
			return;
		}
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
	let node = html.node("li", {}, "", parent);


	let title = formatTitle(ctx, data);
	let h2 = html.node("h2", {}, "", node);
	if (ctx == CTX_FS || ctx == CTX_LIBRARY) { html.icon("music", h2); }
	html.text(title, h2);

	html.node("span", {className:"duration"}, format.time(Number(data["duration"])), node);

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
	let node = html.node("li", {}, "", parent);

	let h2 = html.node("h2", {}, "", node);
	if (ctx == CTX_FS) { html.icon("folder", h2); }
	html.text(label, h2);

	let type = (ctx == CTX_FS ? TYPE_URL : TYPE_FILTER);

	playButton(type, urlOrFilter, node);
	addButton(type, urlOrFilter, node);

	return node;
}

export function playlist(name, parent) {
	let node = html.node("li", {}, "", parent);

	let h2 = html.node("h2", {}, "", node);
	html.icon("playlist-music", h2)
	html.text(name, h2);

	playButton(TYPE_PLAYLIST, name, node);
	addButton(TYPE_PLAYLIST, name, node);
	deleteButton(TYPE_PLAYLIST, name, node);

	return node;
}
