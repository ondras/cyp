import * as mpd from "./mpd.js";
import * as html from "./html.js";
import * as pubsub from "./pubsub.js";
import * as format from "./format.js";
import * as player from "../player.js";

export const SONG_FILE = 1;
export const SONG_LIBRARY = 2;
export const SONG_QUEUE = 3;
export const GROUP_DIRECTORY = 4;
export const GROUP_LIBRARY = 5;

const SORT = "-Track";

function fileName(data) {
	return data["file"].split("/").pop();
}

function formatTitle(type, data) {
	switch (type) {
		case SONG_FILE:
			return `🎵 ${fileName(data)}`;
		break;

		case SONG_LIBRARY:
			return data["Artist"] || fileName(data);
		break;

		case SONG_QUEUE:
			let tokens = [];
			data["Artist"] && tokens.push(data["Artist"]);
			data["Title"] && tokens.push(data["Title"]);
			if (!tokens.length) { tokens.push(fileName(data)); }
			return tokens.join(" - ");
		break;
	}
}

function playButton(id, parent) {
	let button = html.button({className:"play"}, "▶", parent);
	button.addEventListener("click", async e => {
		await mpd.command(`playid ${id}`);
		player.update();
	});
}

function deleteButton(id, parent) {
	let button = html.button({className:"delete"}, "🗙", parent);
	button.addEventListener("click", async e => {
		await mpd.command(`deleteid ${id}`);
		pubsub.publish("queue-change");
	});
	return button;
}

function addAndPlayButton(urlOrFilter, parent) {
	let button = html.button({}, "▶", parent);
	button.addEventListener("click", async e => {
		e.stopPropagation();
		await mpd.command("clear");
		await mpd.enqueue(urlOrFilter, SORT);
		await mpd.command("play");
		pubsub.publish("queue-change");
		player.update();
	});
	return button;
}

function addButton(urlOrFilter, parent) {
	let button = html.button({}, "+", parent);
	button.addEventListener("click", async e => {
		e.stopPropagation();
		await mpd.enqueue(urlOrFilter, SORT);
		pubsub.publish("queue-change");
		// fixme notification?
	});
	return button;
}

export function song(type, data, parent) {
	let node = html.node("li", {}, "", parent);

	let title = formatTitle(type, data);
	html.node("h2", {}, title, node);

	html.node("span", {className:"duration"}, format.time(Number(data["duration"])), node);

	if (type == SONG_QUEUE) {
		let id = data["Id"];
		node.dataset.songId = id;
		playButton(id, node);
		deleteButton(id, node);
	} else {
		let url = data["file"];
		addAndPlayButton(url, node);
		addButton(url, node);
	}

	return node;
}

export function group(type, label, urlOrFilter, parent) {
	let node = html.node("li", {}, "", parent);

	if (type == GROUP_DIRECTORY) { label = `📁 ${label}`; }
	html.node("h2", {}, label, node);

	addAndPlayButton(urlOrFilter, node);
	addButton(urlOrFilter, node);

	return node;
}