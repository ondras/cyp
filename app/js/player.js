import * as mpd from "./mpd.js";
import * as art from "./art.js";

const DELAY = 2000;
const DOM = {};

let current = {};
let node;
let idleTimeout = null;

function formatTime(sec) {
	sec = Math.round(sec);
	let m = Math.floor(sec / 60);
	let s = sec % 60;
	return `${m}:${s.toString().padStart(2, "0")}`;
}

function update(data) {
	DOM.elapsed.textContent = formatTime(Number(data["elapsed"] || 0)); // changed time

	if (data["file"] != current["file"]) { // changed song
		DOM.duration.textContent = formatTime(Number(data["duration"] || 0));
		DOM.title.textContent = data["Title"] || "";
		DOM.album.textContent = data["Album"] || "";
		DOM.artist.textContent = data["Artist"] || "";
	}

	if (data["Artist"] != current["Artist"] || data["Album"] != current["Album"]) { // changed album (art)
		DOM.art.innerHTML = "";
		art.get(data["Artist"], data["Album"], data["file"]).then(src => {
			if (!src) { return; }
			let image = document.createElement("img");
			image.src = src;
			DOM.art.appendChild(image);
		});
	}

	node.classList.toggle("random", data["random"] == "1");
	node.classList.toggle("repeat", data["repeat"] == "1");
	node.dataset.state = data["state"];

	current = data;
}

async function sync() {
	let data = await mpd.status();
	update(data);
	idle();
}

function idle() {
	idleTimeout = setTimeout(sync, DELAY);
}

function clearIdle() {
	idleTimeout && clearTimeout(idleTimeout);
	idleTimeout = null;
}

async function command(cmd) {
	clearIdle();
	let data = await mpd.commandAndStatus(cmd);
	update(data);
	idle();
}

export function init() {
	node = document.querySelector("#player");
	let all = node.querySelectorAll("[class]");
	Array.from(all).forEach(node => DOM[node.className] = node);

	DOM.play.addEventListener("click", e => command("play"));
	DOM.pause.addEventListener("click", e => command("pause 1"));
	DOM.prev.addEventListener("click", e => command("previous"));
	DOM.next.addEventListener("click", e => command("next"));

	DOM.random.addEventListener("click", e => command(`random ${current["random"] == "1" ? "0" : "1"}`));
	DOM.repeat.addEventListener("click", e => command(`repeat ${current["repeat"] == "1" ? "0" : "1"}`));

	sync();
}
