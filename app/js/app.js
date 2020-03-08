import "./lib/range.js";
import "./menu.js";
import "./player.js";
import "./queue.js";

import * as mpd from "./lib/mpd.js";
import * as mpdMock from "./lib/mpd-mock.js";
import * as html from "./lib/html.js";

import * as library from "./library.js";
import * as fs from "./fs.js";
import * as playlists from "./playlists.js";
import * as yt from "./yt.js";
import * as settings from "./settings.js";

function initIcons() {
	Array.from(document.querySelectorAll("[data-icon]")).forEach(node => {
		let icon = html.icon(node.dataset.icon);
		node.insertBefore(icon, node.firstChild);
	});
}

async function mpdExecutor(resolve, reject) {
	try {
		await mpd.init();
		resolve(mpd);
	} catch (e) {
		resolve(mpdMock);
		console.error(e);
		reject(e);
	}
}

class App extends HTMLElement {
	constructor() {
		super();
		initIcons();

		this._mpd = new Promise(mpdExecutor);

		this._load();
	}

	get mpd() { return this._mpd; }

	async _load() {
		const promises = ["cyp-player"].map(name => customElements.whenDefined(name));
		await Promise.all(promises);

		const onHashChange = () => {
			const hash = location.hash.substring(1);
			this._activate(hash || "queue");
		}

		window.addEventListener("hashchange", onHashChange);
		onHashChange();
	}

	_activate(what) {
		location.hash = what;
		this.setAttribute("component", what);

		const component = this.querySelector(`cyp-${what}`);
	//	component.activate();
	}
}

customElements.define("cyp-app", App);
