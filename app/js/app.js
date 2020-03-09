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
	Array.from(document.querySelectorAll("[data-icon]")).forEach(/** @param {HTMLElement} node */ node => {
		let icon = html.icon(node.dataset.icon);
		node.insertBefore(icon, node.firstChild);
	});
}

async function initMpd() {
	try {
		await mpd.init();
		return mpd;
	} catch (e) {
		console.error(e);
		return mpdMock;
	}
}

class App extends HTMLElement {
	static get observedAttributes() { return ["component"]; }

	constructor() {
		super();

		initIcons();

		this._mpdPromise = initMpd().then(mpd => this.mpd = mpd);
	}

	async connectedCallback() {
		const promises = ["cyp-player"].map(name => customElements.whenDefined(name));
		promises.push(this._mpdPromise);

		await Promise.all(promises);

		this.dispatchEvent(new CustomEvent("load"));

		const onHashChange = () => {
			const hash = location.hash.substring(1);
			this.setAttribute("component", hash || "queue");
		}
		window.addEventListener("hashchange", onHashChange);
		onHashChange();
	}

	attributeChangedCallback(name, oldValue, newValue) {
		switch (name) {
			case "component":
				location.hash = newValue;
				const e = new CustomEvent("component-change");
				this.dispatchEvent(e);
			break;
		}
	}
}

customElements.define("cyp-app", App);
