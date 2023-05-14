import icons from "./icons.js";


type Attrs = Record<string, string | number | boolean>;

export function node<T extends keyof HTMLElementTagNameMap>(name:T, attrs?: Attrs, content?: string, parent?: HTMLElement): HTMLElementTagNameMap[T] {
	let n = document.createElement(name);
	Object.assign(n, attrs);

	if (attrs && attrs.title) { n.setAttribute("aria-label", attrs.title as string); }

	content && text(content, n);
	parent && parent.append(n);
	return n;
}

export function icon(type: string, parent?: HTMLElement) {
	let str = icons[type];
	if (!str) {
		console.error("Bad icon type '%s'", type);
		return node("span", {}, "‽");
	}

	let tmp = node("div");
	tmp.innerHTML = str;
	let s = tmp.querySelector("svg");
	if (!s) { throw new Error(`Bad icon source for type '${type}'`); }

	s.classList.add("icon");
	s.classList.add(`icon-${type}`);

	parent && parent.append(s);
	return s;
}

export function button(attrs: Attrs, content?: string, parent?: HTMLElement) {
	let result = node("button", attrs, content, parent);
	if (attrs && attrs.icon) {
		let i = icon(attrs.icon as string);
		result.insertBefore(i, result.firstChild);
	}
	return result;
}

export function clear(node: HTMLElement) {
	while (node.firstChild) { node.firstChild.remove(); }
	return node;
}

export function text(txt: string, parent?: HTMLElement) {
	let n = document.createTextNode(txt);
	parent && parent.append(n);
	return n;
}

export function fragment() {
	return document.createDocumentFragment();
}
