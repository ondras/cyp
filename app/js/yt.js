import * as mpd from "./lib/mpd.js";
import * as html from "./lib/html.js";
import * as pubsub from "./lib/pubsub.js";
import * as ui from "./lib/ui.js";
import * as conf from "./conf.js";

let node;
const decoder = new TextDecoder("utf-8");

function decodeChunk(byteArray) {
	return decoder.decode(byteArray);
}

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

	let reader = response.body.getReader();
	while (true) {
		let { done, value } = await reader.read();
		if (done) { break; }
		p.textContent += decodeChunk(value);
	}
	reader.releaseLock();

	button.disabled = false;
	if (response.status == 200) {
		mpd.command(`update ${mpd.escape(conf.ytPath)}`);
	}
}

export async function activate() {}

export function init(n) {
	node = n;

	let button = node.querySelector(".go").addEventListener("click", onClick);
}
