const APP = "cyp-app";

export default class Component extends HTMLElement {
	constructor() {
		super();

		this._app.then(app => {
			let mo = new MutationObserver(mrs => {
				mrs.forEach(mr => this._onAppAttributeChange(mr));
			});
			mo.observe(app, {attributes:true});
		});
	}

	_onAppAttributeChange(mr) {
		if (mr.attributeName != "component") { return; }
		const component = mr.target.getAttribute(mr.attributeName);
		const isThis = (this.nodeName.toLowerCase() == `cyp-${component}`);
		this._onComponentChange(component, isThis);
	}

	get _app() {
		return customElements.whenDefined(APP)
			.then(() => this.closest(APP));
	}

	get _mpd() {
		return this._app.then(app => app.mpd);
	}

	_onComponentChange(component) {}
}
