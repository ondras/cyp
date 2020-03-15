import * as html from "../html.js";
import * as conf from "../conf.js";
import { escape } from "../mpd.js";
import Component from "../component.js";


const decoder = new TextDecoder("utf-8");

function decodeChunk(byteArray) {
	// \r => \n
	return decoder.decode(byteArray).replace(/\u000d/g, "\n");
}

class YT extends Component {
	connectedCallback() {
		super.connectedCallback();

		const form = html.node("form", {}, "", this);
		const input = html.node("input", {type:"text"}, "", form);
		html.button({icon:"magnify"}, "", form);
		form.addEventListener("submit", e => {
			e.preventDefault();
			const query = input.value.trim();
			if (!query.length) { return; }
			this._doSearch(query, form);
		});
	}

	async _doSearch(query, form) {
		let response = await fetch(`/youtube?q=${encodeURIComponent(query)}`);
		let data = await response.json();

		html.clear(this);
		this.appendChild(form);

		console.log(data);
	}


	_download() {
		let url = prompt("Please enter a YouTube URL:");
		if (!url) { return; }

		this._post(url);
	}

	_search() {
		let q = prompt("Please enter a search string:");
		if (!q) { return; }

		this._post(`ytsearch:${q}`);
	}

	_clear() {
		html.clear(this.querySelector("pre"));
	}

	async _post(q) {
		let pre = this.querySelector("pre");
		html.clear(pre);

		this.classList.add("pending");

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

		this.classList.remove("pending");

		if (response.status == 200) {
			this._mpd.command(`update ${escape(conf.ytPath)}`);
		}
	}

	_onComponentChange(c, isThis) {
		this.hidden = !isThis;
	}
}

customElements.define("cyp-yt", YT);