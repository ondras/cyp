import * as mpd from "./mpd.js";
import * as player from "./player.js";
import * as art from "./art.js";

async function init() {
	await mpd.init();
	player.init();
	window.mpd = mpd;
}

init();
