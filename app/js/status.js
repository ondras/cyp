import * as mpd from "./mpd.js";

const DELAY = 2000;

async function tick() {
	let data = await mpd.getStatus();
	console.log(data);
	setTimeout(tick, DELAY);
}

export function init() {
	tick();
}