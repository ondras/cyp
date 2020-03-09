import Selection from "./lib/selection.js";

export class HasApp extends HTMLElement {
	get _app() { return this.closest("cyp-app"); }
	get _mpd() { return this._app.mpd; }
}

export default class Component extends HasApp {
	constructor() {
		super();
		this.selection = new Selection(this);
	}

	connectedCallback() {
		this._app.addEventListener("load", _ => this._onAppLoad());
		this._app.addEventListener("component-change", _ => {
			const component = this._app.getAttribute("component");
			const isThis = (this.nodeName.toLowerCase() == `cyp-${component}`);
			this._onComponentChange(component, isThis);
		});
	}

	_onComponentChange(_component, _isThis) {}
	_onAppLoad() {}
}
