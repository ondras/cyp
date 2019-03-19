import * as mpd from "./mpd.js";

const DELAY = 2000;
const DOM = {};

async function tick() {
	let data = await mpd.getStatus();
	DOM.title.textContent = data["Title"];
//	console.log(data);
	setTimeout(tick, DELAY);
}

export function init() {
	let node = document.querySelector("footer");
	DOM.title = node.querySelector(".title");

	tick();
}