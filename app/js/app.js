import * as nav from "./nav.js";
import * as mpd from "./lib/mpd.js";
import * as player from "./player.js";
import * as html from "./lib/html.js";
import * as range from "./lib/range.js";

import * as queue from "./queue.js";
import * as library from "./library.js";
import * as fs from "./fs.js";
import * as playlists from "./playlists.js";
import * as yt from "./yt.js";
import * as settings from "./settings.js";

const components = { queue, library, fs, playlists, yt, settings };

export function activate(what) {
	location.hash = what;

	for (let id in components) {
		let node = document.querySelector(`#${id}`);
		if (what == id) {
			node.style.display = "";
			components[id].activate();
		} else {
			node.style.display = "none";
		}
	}
	nav.active(what);
}

function initIcons() {
	Array.from(document.querySelectorAll("[data-icon]")).forEach(node => {
		let icon = html.icon(node.dataset.icon);
		node.insertBefore(icon, node.firstChild);
	});
}

function fromHash() {
	let hash = location.hash.substring(1);
	activate(hash || "queue");
}

function onHashChange(e) {
	fromHash();
}

async function init() {
	initIcons();
	try {
		await mpd.init();
	} catch (e) {
		console.error(e);
	}

	nav.init(document.querySelector("nav"));
	for (let id in components) {
		let node = document.querySelector(`#${id}`);
		components[id].init(node);
	}

	player.init(document.querySelector("#player"));
	window.addEventListener("hashchange", onHashChange);
	fromHash();
}


init();

class App extends HTMLElement {
	get mpd() { return mpd; }
}

customElements.define("cyp-app", App);
