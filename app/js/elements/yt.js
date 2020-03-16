import * as html from "../html.js";
import * as conf from "../conf.js";
import { escape } from "../mpd.js";
import Component from "../component.js";
import Search from "./search.js";
import Result from "./yt-result.js";


const decoder = new TextDecoder("utf-8");

function decodeChunk(byteArray) {
	// \r => \n
	return decoder.decode(byteArray).replace(/\u000d/g, "\n");
}

class YT extends Component {
	constructor() {
		super();
		this._search = new Search();

		this._search.onSubmit = _ => {
			let query = this._search.value;
			query && this._doSearch(query);
		}
	}

	connectedCallback() {
		super.connectedCallback();

		this._clear();
	}

	_clear() {
		html.clear(this);
		this.appendChild(this._search);
	}

	async _doSearch(query) {
		this._clear();
		this._search.pending(true);

		let response = await fetch(`/youtube?q=${encodeURIComponent(query)}`);
		let results = await response.json();

		this._search.pending(false);

		results.forEach(result => {
			let node = new Result(result.title);
			this.appendChild(node);
			node.addButton("download", () => this._download(result.id));
		});
	}


	async _download(id) {
		this._clear();

		let pre = html.node("pre", {}, "", this);
		this._search.pending(true);

		let body = new URLSearchParams();
		body.set("id", id);
		let response = await fetch("/youtube", {method:"POST", body});

		let reader = response.body.getReader();
		while (true) {
			let { done, value } = await reader.read();
			if (done) { break; }
			pre.textContent += decodeChunk(value);
			pre.scrollTop = pre.scrollHeight;
		}
		reader.releaseLock();

		this._search.pending(false);

		if (response.status == 200) {
			this._mpd.command(`update ${escape(conf.ytPath)}`);
		}
	}

	_onComponentChange(c, isThis) {
		const wasHidden = this.hidden;
		this.hidden = !isThis;

		if (!wasHidden && isThis) { this._showRoot(); }
	}
}

customElements.define("cyp-yt", YT);