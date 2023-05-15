import * as html from "../html.js";
import * as conf from "../conf.js";
import { escape } from "../mpd.js";
import Component from "../component.js";
import Search from "./search.js";
import Result from "./yt-result.js";


interface ResultData {
	title: string;
	id: string;
}

class YT extends Component {
	search = new Search();

	constructor() {
		super();

		this.search.onSubmit = () => {
			let query = this.search.value;
			query && this.doSearch(query);
		}

		this.clear();
	}

	protected clear() {
		html.clear(this);
		this.append(this.search);
	}

	protected async doSearch(query: string) {
		this.clear();
		this.search.pending(true);

		let url = `youtube?q=${encodeURIComponent(query)}&limit=${encodeURIComponent(conf.ytLimit)}`;
		let response = await fetch(url);
		if (response.status == 200) {
			let results = await response.json() as ResultData[];
			results.forEach(result => {
				let node = new Result(result.title);
				this.append(node);
				node.addButton("download", () => this.download(result.id));
			});
		} else {
			let text = await response.text();
			alert(text);
		}

		this.search.pending(false);
	}

	protected async download(id: string) {
		this.clear();

		let pre = html.node("pre", {}, "", this);
		this.search.pending(true);

		let body = new URLSearchParams();
		body.set("id", id);
		let response = await fetch("youtube", {method:"POST", body});

		let reader = response.body!.getReader();
		while (true) {
			let { done, value } = await reader.read();
			if (done) { break; }
			pre.textContent += decodeChunk(value!);
			pre.scrollTop = pre.scrollHeight;
		}
		reader.releaseLock();

		this.search.pending(false);

		if (response.status == 200) {
			this.mpd.command(`update ${escape(conf.ytPath)}`);
		}
	}

	protected onComponentChange(c: string, isThis: boolean) {
		const wasHidden = this.hidden;
		this.hidden = !isThis;

		if (!wasHidden && isThis) { this.clear(); }
	}
}

customElements.define("cyp-yt", YT);

const decoder = new TextDecoder("utf-8");
function decodeChunk(byteArray: Uint8Array) {
	// \r => \n
	return decoder.decode(byteArray).replace(/\u000d/g, "\n");
}
