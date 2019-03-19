import * as mpd from "./mpd.js";
import * as status from "./status.js";

async function init() {
	await mpd.init();
	status.init();
	window.mpd = mpd;
}

init();
