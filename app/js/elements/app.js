import * as mpd from "../mpd.js";
import * as mpdMock from "../mpd-mock.js";
import * as html from "../html.js";

// import * as library from "./library.js";
// import * as fs from "./fs.js";

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
	}

	async connectedCallback() {
		this.mpd = await initMpd();

		const promises = ["cyp-player"].map(name => customElements.whenDefined(name));

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
