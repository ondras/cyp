import App from "./elements/app.js";


export default class Component extends HTMLElement {
	connectedCallback() {
		const { app } = this;

		app.addEventListener("load", _ => this.onAppLoad());
		app.addEventListener("component-change", _ => {
			const component = app.component;
			const isThis = (this.nodeName.toLowerCase() == `cyp-${component}`);
			this.onComponentChange(component, isThis);
		});
	}

	protected get app() { return this.closest<App>("cyp-app")!; }
	protected get mpd() { return this.app.mpd; }

	protected onAppLoad() {}
	protected onComponentChange(component: string, isThis: boolean) {}
}
