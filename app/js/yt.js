import * as mpd from "./lib/mpd.js";
import * as html from "./lib/html.js";
import * as pubsub from "./lib/pubsub.js";
import * as ui from "./lib/ui.js";
import * as conf from "./conf.js";

let node;

async function onClick(e) {
	let url = prompt("Please enter a YouTube URL:");
	if (!url) { return; }

	let button = e.target;
	button.disabled = true;

	let p = node.querySelector("p");
	p.textContent = "";

	let body = new URLSearchParams();
	body.set("url", url);
	let response = await fetch("/youtube", {method:"POST", body});
	let text = await response.text();

	button.disabled = false;
	p.textContent = text;

	if (response.status == 200) {
		mpd.command(`update ${mpd.escape(conf.ytPath)}`);
	}
}

export async function activate() {}

export function init(n) {
	node = n;

	let button = node.querySelector(".go").addEventListener("click", onClick);
}
