import * as mpd from "./lib/mpd.js";
import * as html from "./lib/html.js";
import * as pubsub from "./lib/pubsub.js";
import * as ui from "./lib/ui.js";

let node;

async function onClick(e) {
	let url = prompt("Please enter a YouTube URL:");
	if (!url) { return; }

	let body = new URLSearchParams();
	body.set("url", url);
	let response = await fetch("/youtube", {method:"POST", body});
	console.log(response);
	let text = await response.text();
	console.log(text, text.length);
}

export async function activate() {}

export function init(n) {
	node = n;

	let button = node.querySelector(".go").addEventListener("click", onClick);
}
