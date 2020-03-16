import Component from "../component.js";

class Menu extends Component {
	constructor() {
		super();

		this._tabs = Array.from(this.querySelectorAll("[data-for]"));
		this._tabs.forEach(tab => {
			tab.addEventListener("click", _ => this._activate(tab.dataset.for));
		});
	}

	_onAppLoad() {
		this._app.addEventListener("queue-length-change", e => {
			this.querySelector(".queue-length").textContent = `(${e.detail})`;
		});

	}

	async _activate(component) {
		const app = await this._app;
		app.setAttribute("component", component);
	}

	_onComponentChange(component) {
		this._tabs.forEach(/** @param {HTMLElement} tab */ tab => {
			tab.classList.toggle("active", tab.dataset.for == component);
		});
	}
}

customElements.define("cyp-menu", Menu);
