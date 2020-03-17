import Component from "../component.js";
import * as conf from "../conf.js";


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
			ytLimit: this.querySelector("[name=yt-limit]"),
			color: Array.from(this.querySelectorAll("[name=color]"))
		};
	}

	_onAppLoad() {
		let mo = new MutationObserver(mrs => {
			mrs.forEach(mr => this._onAppAttributeChange(mr));
		});
		mo.observe(this._app, {attributes:true});

		this._inputs.theme.addEventListener("change", e => this._setTheme(e.target.value));
		this._inputs.ytLimit.addEventListener("change", e => this._setYtLimit(e.target.value));
		this._inputs.color.forEach(input => {
			input.addEventListener("click", e => this._setColor(e.target.value));
		});

		const theme = loadFromStorage("theme");
		(theme ? this._app.setAttribute("theme", theme) : this._syncTheme());

		const color = loadFromStorage("color");
		(color ? this._app.setAttribute("color", color) : this._syncColor());

		const ytLimit = loadFromStorage("ytLimit") || conf.ytLimit;
		this._setYtLimit(ytLimit);
	}

	_onAppAttributeChange(mr) {
		if (mr.attributeName == "theme") { this._syncTheme(); }
		if (mr.attributeName == "color") { this._syncColor(); }
	}

	_syncTheme() {
		this._inputs.theme.value = this._app.getAttribute("theme");
	}

	_syncColor() {
		this._inputs.color.forEach(input => {
			input.checked = (input.value == this._app.getAttribute("color"));
			input.parentNode.style.color = input.value;
		});
	}

	_setTheme(theme) {
		saveToStorage("theme", theme);
		this._app.setAttribute("theme", theme);
	}

	_setColor(color) {
		saveToStorage("color", color);
		this._app.setAttribute("color", color);
	}

	_setYtLimit(limit) {
		saveToStorage("color", color);
		conf.setYtLimit(limit);
	}

	_onComponentChange(c, isThis) {
		this.hidden = !isThis;
	}
}

customElements.define("cyp-settings", Settings);
