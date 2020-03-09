import Component from "../component.js";

class Menu extends Component {
	constructor() {
		super();

		this._tabs = Array.from(this.querySelectorAll("[data-for]"));
		this._tabs.forEach(tab => {
			tab.addEventListener("click", _ => this._activate(tab.dataset.for));
		});
	}

	async _listen() {
		const app = await this._app;
		let mo = new MutationObserver(_ => this._sync())
		mo.observe(app, {attributes:true});
	}

	async _activate(component) {
		const app = await this._app;
		app.setAttribute("component", component);
	}

	_onComponentChange(component) {
		this._tabs.forEach(tab => {
			tab.classList.toggle("active", tab.dataset.for == component);
		});
	}
}

customElements.define("cyp-menu", Menu);
