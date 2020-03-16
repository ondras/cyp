import Selection from "./selection.js";


export default class Component extends HTMLElement {
	constructor(options = {}) {
		super();
		if (options.selection) { this.selection = new Selection(this, options.selection); }
	}

	connectedCallback() {
		if (this.selection) {
			const parent = this._app.querySelector("footer");
			this.selection.appendTo(parent);
		}
		this._app.addEventListener("load", _ => this._onAppLoad());
		this._app.addEventListener("component-change", _ => {
			const component = this._app.component;
			const isThis = (this.nodeName.toLowerCase() == `cyp-${component}`);
			this._onComponentChange(component, isThis);
		});
	}

	get _app() { return this.closest("cyp-app"); }
	get _mpd() { return this._app.mpd; }

	_onAppLoad() {}
	_onComponentChange(_component, _isThis) {}
}
