import * as mpd from "./mpd.js";
import * as html from "./html.js";

function playButton(fileOrFilter, parent) {
	let button = html.button({}, "▶", parent);
	button.addEventListener("click", async e => {
		e.stopPropagation();
		await mpd.command("clear");
		await mpd.enqueue(fileOrFilter, SORT);
		await mpd.command("play");
		app.activate("queue");
		player.update();
	});
	return button;
}

function addButton(fileOrFilter, parent) {
	let button = html.button({}, "+", parent);
	button.addEventListener("click", async e => {
		e.stopPropagation();
		await mpd.enqueue(fileOrFilter, SORT);
		// fixme notification?
	});
	return button;
}


export function song(data, parent) {
	let node = html.node("li", {}, "", parent);

	let file = data["file"];
	playButton(file, node);
	addButton(file, node);

	html.node("h3", {}, data["Title"], node);

	return node;
}

export function group(label, filter, parent) {
	let node = html.node("li", {}, label, parent);

	playButton(filter, node);
	addButton(filter, node);

	return node;
}