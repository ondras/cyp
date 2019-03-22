import * as app from "./app.js";

let tabs = [];

export function init(node) {
	tabs = Array.from(node.querySelectorAll("[data-for]"));
	tabs.forEach(tab => {
		tab.addEventListener("click", e => app.activate(tab.dataset.for));
	});
}

export function active(id) {
	tabs.forEach(tab => {
		tab.classList.toggle("active", tab.dataset.for == id);
	});
}
