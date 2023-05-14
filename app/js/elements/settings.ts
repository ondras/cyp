import Component from "../component.js";
import * as conf from "../conf.js";


const prefix = "cyp";

function loadFromStorage(key: string) {
	return localStorage.getItem(`${prefix}-${key}`);
}

function saveToStorage(key: string, value: string | number) {
	return localStorage.setItem(`${prefix}-${key}`, String(value));
}

class Settings extends Component {
	protected inputs = {
		theme: this.querySelector<HTMLSelectElement>("[name=theme]")!,
		ytLimit: this.querySelector<HTMLSelectElement>("[name=yt-limit]")!,
		color: [...this.querySelectorAll<HTMLInputElement>("[name=color]")]
	};

	protected onAppLoad() {
		const { inputs } = this;

		let mo = new MutationObserver(mrs => {
			mrs.forEach(mr => this._onAppAttributeChange(mr));
		});
		mo.observe(this.app, {attributes:true});

		inputs.theme.addEventListener("change", e => this.setTheme((e.target as HTMLSelectElement).value));
		inputs.ytLimit.addEventListener("change", e => this.setYtLimit(Number((e.target as HTMLSelectElement).value)));
		inputs.color.forEach(input => {
			input.addEventListener("click", e => this.setColor((e.target as HTMLInputElement).value));
		});

		const theme = loadFromStorage("theme");
		(theme ? this.app.setAttribute("theme", theme) : this.syncTheme());

		const color = loadFromStorage("color");
		(color ? this.app.setAttribute("color", color) : this.syncColor());

		const ytLimit = loadFromStorage("ytLimit") || conf.ytLimit;
		this.setYtLimit(Number(ytLimit));
	}

	_onAppAttributeChange(mr: MutationRecord) {
		if (mr.attributeName == "theme") { this.syncTheme(); }
		if (mr.attributeName == "color") { this.syncColor(); }
	}

	protected syncTheme() {
		this.inputs.theme.value = this.app.getAttribute("theme")!;
	}

	protected syncColor() {
		this.inputs.color.forEach(input => {
			input.checked = (input.value == this.app.getAttribute("color"));
			input.parentElement!.style.color = input.value;
		});
	}

	protected setTheme(theme: string) {
		saveToStorage("theme", theme);
		this.app.setAttribute("theme", theme);
	}

	protected setColor(color: string) {
		saveToStorage("color", color);
		this.app.setAttribute("color", color);
	}

	protected setYtLimit(ytLimit: number) {
		saveToStorage("ytLimit", ytLimit);
		conf.setYtLimit(ytLimit);
	}

	protected onComponentChange(c: string, isThis: boolean) {
		this.hidden = !isThis;
	}
}

customElements.define("cyp-settings", Settings);
