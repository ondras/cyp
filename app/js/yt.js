import * as mpd from "./lib/mpd.js";
import * as html from "./lib/html.js";
import * as pubsub from "./lib/pubsub.js";
import * as ui from "./lib/ui.js";
import * as conf from "./conf.js";

let node;
const decoder = new TextDecoder("utf-8");

function decodeChunk(byteArray) {
	// \r => \n
	return decoder.decode(byteArray).replace(/\u000d/g, "\n");
}

async function post(q) {
	let pre = node.querySelector("pre");
	html.clear(pre);

	node.classList.add("pending");

	let body = new URLSearchParams();
	body.set("q", q);
	let response = await fetch("/youtube", {method:"POST", body});

	let reader = response.body.getReader();
	while (true) {
		let { done, value } = await reader.read();
		if (done) { break; }
		pre.textContent += decodeChunk(value);
		pre.scrollTop = pre.scrollHeight;
	}
	reader.releaseLock();

	node.classList.remove("pending");

	if (response.status == 200) {
		mpd.command(`update ${mpd.escape(conf.ytPath)}`);
	}
}

function download() {
	let url = prompt("Please enter a YouTube URL:");
	if (!url) { return; }

	post(url);
}

function search() {
	let q = prompt("Please enter a search string:");
	if (!q) { return; }
	post(`ytsearch:${q}`);
}

function clear() {
	html.clear(node.querySelector("pre"));
}

export async function activate() {}

export function init(n) {
	node = n;
	node.querySelector(".download").addEventListener("click", e => download());
	node.querySelector(".search-download").addEventListener("click", e => search());
	node.querySelector(".clear").addEventListener("click", e => clear());
}
