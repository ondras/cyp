import * as mpd from "../mpd.js";
import * as mpdMock from "../mpd-mock.js";
import * as html from "../html.js";

function initIcons() {
	Array.from(document.querySelectorAll("[data-icon]")).forEach(/** @param {HTMLElement} node */ node => {
		node.dataset.icon.split(" ").forEach(name => {
			let icon = html.icon(name);
			node.insertBefore(icon, node.firstChild);
		})
	});
}

async function initMpd() {
	try {
		await mpd.init();
		return mpd;
	} catch (e) {
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

		const children = Array.from(this.querySelectorAll("*"));
		const names = children.map(node => node.nodeName.toLowerCase())
			.filter(name => name.startsWith("cyp-"));
		const unique = new Set(names);

		const promises = [...unique].map(name => customElements.whenDefined(name));
		await Promise.all(promises);

		this.dispatchEvent(new CustomEvent("load"));

		const onHashChange = () => {
			const component = location.hash.substring(1) || "queue";
			if (component != this.component) { this.component = component; }
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

	get component() { return this.getAttribute("component"); }
	set component(component) { return this.setAttribute("component", component); }
}

customElements.define("cyp-app", App);
