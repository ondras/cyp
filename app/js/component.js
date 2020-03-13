import Selection from "./selection.js";

export class HasApp extends HTMLElement {
	get _app() { return this.closest("cyp-app"); }
	get _mpd() { return this._app.mpd; }
}

export default class Component extends HasApp {
	constructor(options = {}) {
		super();
		if (options.selection) { this.selection = new Selection(this, options.selection); }
	}

	connectedCallback() {
		this._app.addEventListener("load", _ => this._onAppLoad());
		this._app.addEventListener("component-change", _ => {
			const component = this._app.component;
			const isThis = (this.nodeName.toLowerCase() == `cyp-${component}`);
			this._onComponentChange(component, isThis);
		});
	}

	_onAppLoad() {}
	_onComponentChange(_component, _isThis) {}
}
