import * as html from "./html.js";


export default class Item extends HTMLElement {
	addButton(icon: string, cb: Function) {
		html.button({icon}, "", this).addEventListener("click", e => {
			e.stopPropagation(); // do not select/activate/whatever
			cb();
		});
	}

	protected buildTitle(title: string) {
		return html.node("span", {className:"title"}, title, this);
	}

	matchPrefix(prefix: string) {
		return (this.textContent || "").match(/\w+/g)!.some(word => word.toLowerCase().startsWith(prefix));
	}
}
