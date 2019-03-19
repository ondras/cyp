import * as mpd from "./mpd.js";
import * as status from "./status.js";
import * as art from "./art.js";

async function init() {
	await mpd.init();
	status.init();
	window.mpd = mpd;
	art.get("NAS/ABBA/Greatest Hits/01 Dancing Queen.mp3").then(src => {
		let image = document.createElement("img");
		image.src = src;
		document.querySelector("main").appendChild(image);
	});
}

init();
