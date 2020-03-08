export default class Component extends HTMLElement {
	get _app() { return this.closest("cyp-app"); }
}
