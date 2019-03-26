import icons from "./icons.js";

export function node(name, attrs, content, parent) {
	let n = document.createElement(name);
	Object.assign(n, attrs);

	if (attrs && attrs.title) { n.setAttribute("aria-label", attrs.title); }

	content && text(content, n);
	parent && parent.appendChild(n);
	return n;
}

export function icon(type, parent) {
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

	parent && parent.appendChild(s);
	return s;
}

export function button(attrs, content, parent) {
	let result = node("button", attrs, content, parent);
	if (attrs && attrs.icon) {
		let i = icon(attrs.icon);
		result.insertBefore(i, result.firstChild);
	}
	return result;
}

export function clear(node) {
	while (node.firstChild) { node.firstChild.parentNode.removeChild(node.firstChild); }
	return node;
}

export function text(txt, parent) {
	let n = document.createTextNode(txt);
	parent && parent.appendChild(n);
	return n;
}

export function fragment() {
	return document.createDocumentFragment();
}
