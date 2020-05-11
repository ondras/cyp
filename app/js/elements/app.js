import MPD from "../mpd.js";
import * as html from "../html.js";

function initIcons() {
	Array.from(document.querySelectorAll("[data-icon]")).forEach(/** @param {HTMLElement} node */ node => {
		node.dataset.icon.split(" ").forEach(name => {
			let icon = html.icon(name);
			node.insertBefore(icon, node.firstChild);
		})
	});
}

class App extends HTMLElement {
	static get observedAttributes() { return ["component"]; }

	constructor() {
		super();
		initIcons();
	}

	async connectedCallback() {
		await waitForChildren(this);

		window.addEventListener("hashchange", e => this._onHashChange());
		this._onHashChange();

		await this._connect();
		this.dispatchEvent(new CustomEvent("load"));
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
	set component(component) { this.setAttribute("component", component); }

	_onHashChange() {
		const component = location.hash.substring(1) || "queue";
		if (component != this.component) { this.component = component; }
	}

	_onChange(changed) { this.dispatchEvent(new CustomEvent("idle-change", {detail:changed})); }

	_onClose(e) {
		setTimeout(() => this._connect(), 3000);
	}

	async _connect() {
		const attempts = 3;
		for (let i=0;i<attempts;i++) {
			try {
				let mpd = await MPD.connect();
				mpd.onChange = changed => this._onChange(changed);
				mpd.onClose = e => this._onClose(e);
				this.mpd = mpd;
				return;
			} catch (e) {
				await sleep(500);
			}
		}
		alert(`Failed to connect to MPD after ${attempts} attempts. Please reload the page to try again.`);
	}
}

customElements.define("cyp-app", App);

function sleep(ms) { return new Promise(resolve =>setTimeout(resolve, ms)); }

function waitForChildren(app) {
	const children = Array.from(app.querySelectorAll("*"));
	const names = children.map(node => node.nodeName.toLowerCase())
		.filter(name => name.startsWith("cyp-"));
	const unique = new Set(names);

	const promises = [...unique].map(name => customElements.whenDefined(name));
	return Promise.all(promises);
}