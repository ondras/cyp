import Component from "./component.js";

const prefix = "cyp";

function loadFromStorage(key) {
	return localStorage.getItem(`${prefix}-${key}`);
}

function saveToStorage(key, value) {
	return localStorage.setItem(`${prefix}-${key}`, value);
}

class Settings extends Component {
	constructor() {
		super();
		this._inputs = {
			theme: this.querySelector("[name=theme]"),
			color: Array.from(this.querySelectorAll("[name=color]"))
		};

		this._load();

		this._inputs.theme.addEventListener("change", e => this._setTheme(e.target.value));
		this._inputs.color.forEach(input => {
			input.addEventListener("click", e => this._setColor(e.target.value));
		});
	}

	_onAppAttributeChange(mr) {
		if (mr.attributeName == "theme") { this._syncTheme(); }
		if (mr.attributeName == "color") { this._syncColor(); }
	}

	async _syncTheme() {
		const app = await this._app;
		this._inputs.theme.value = app.getAttribute("theme");
	}

	async _syncColor() {
		const app = await this._app;
		this._inputs.color.forEach(input => {
			input.checked = (input.value == app.getAttribute("color"));
			input.parentNode.style.color = input.value;
		});
	}

	async _load() {
		const app = await this._app;

		const theme = loadFromStorage("theme");
		(theme ? app.setAttribute("theme", theme) : this._syncTheme());

		const color = loadFromStorage("color");
		(color ? app.setAttribute("color", color) : this._syncColor());
	}

	async _setTheme(theme) {
		const app = await this._app;
		saveToStorage("theme", theme);
		app.setAttribute("theme", theme);
	}

	async _setColor(color) {
		const app = await this._app;
		saveToStorage("color", color);
		app.setAttribute("color", color);
	}
}

customElements.define("cyp-settings", Settings);
