import * as mpd from "./mpd.js";
import * as art from "./art.js";

const DELAY = 2000;
const DOM = {};

let current = {};

async function tick() {
	let data = await mpd.status();

	update(data);

//	console.log(data);
	setTimeout(tick, DELAY);
}

function update(data) {
	if (data["Title"] != current["Title"]) { DOM.title.textContent = data["Title"]; }

	if (data["Artist"] != current["Artist"] || data["Album"] != current["Album"]) {
		DOM.art.innerHTML = "";
		art.get(data["Artist"], data["Album"], data["file"]).then(src => {
			if (!src) { return; }
			let image = document.createElement("img");
			image.src = src;
			DOM.art.appendChild(image);
		});
	}

	current = data;
}

async function play() {
	let data = await mpd.commandAndStatus("pause 0");
	update(data);
}

async function pause() {
	let data = await mpd.commandAndStatus("pause 1");
	update(data);
}

export function init() {
	let all = document.querySelectorAll("footer [class]");
	Array.from(all).forEach(node => DOM[node.className] = node);

	DOM.play.addEventListener("click", e => play());
	DOM.pause.addEventListener("click", e => pause());

	tick();
}
