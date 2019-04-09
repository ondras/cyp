import * as mpd from "./lib/mpd.js";

let node;
let inputs = {};
const prefix = "cyp";

function loadFromStorage(key, def) {
	return localStorage.getItem(`${prefix}-${key}`) || def;
}

function saveToStorage(key, value) {
	return localStorage.setItem(`${prefix}-${key}`, value);
}

function load() {
	let theme = loadFromStorage("theme", "dark");
	inputs.theme.value = theme;
	setTheme(theme);

	let color = loadFromStorage("color", "dodgerblue");
	inputs.color.forEach(input => {
		input.checked = (input.value == color);
		input.parentNode.style.color = input.value;
	});
	setColor(color);
}

function setTheme(theme) {
	saveToStorage("theme", theme);
	document.documentElement.dataset.theme = theme;
}

function setColor(color) {
	saveToStorage("color", color);
	document.documentElement.dataset.color = color;
}

async function setVolume(volume) {
	mpd.command(`setvol ${volume}`);
}

export async function notifyVolume(volume) {
	inputs.volume.value = volume;
}

export async function activate() {}

export function init(n) {
	node = n;

	inputs.theme = n.querySelector("[name=theme]");
	inputs.color = Array.from(n.querySelectorAll("[name=color]"));
	inputs.volume = n.querySelector("[name=volume]");

	load();

	inputs.theme.addEventListener("change", e => setTheme(e.target.value));
	inputs.color.forEach(input => {
		input.addEventListener("click", e => setColor(e.target.value));
	});

	inputs.volume.addEventListener("input", e => setVolume(e.target.valueAsNumber));
}
