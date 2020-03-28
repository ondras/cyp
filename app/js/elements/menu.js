import Component from "../component.js";

class Menu extends Component {
	_onAppLoad() {
		/** @type HTMLElement[] */
		this._tabs = Array.from(this.querySelectorAll("[data-for]"));

		this._tabs.forEach(tab => {
			tab.addEventListener("click", _ => this._app.setAttribute("component", tab.dataset.for));
		});

		this._app.addEventListener("queue-length-change", e => {
			this.querySelector(".queue-length").textContent = `(${e.detail})`;
		});

	}
	_onComponentChange(component) {
		this._tabs.forEach( tab => {
			tab.classList.toggle("active", tab.dataset.for == component);
		});
	}
}

customElements.define("cyp-menu", Menu);
