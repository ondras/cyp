import * as art from "./lib/art.js";
import * as html from "./lib/html.js";
import * as format from "./lib/format.js";
import Component from "./component.js";

const DELAY = 1000;

class Player extends Component {
	constructor() {
		super();
		this._current = {};
		this._toggledVolume = 0;
		this._idleTimeout = null;
		this._dom = this._initDOM();
		this._update();
	}

	_initDOM() {
		const DOM = {};
		const all = this.querySelectorAll("[class]");
		Array.from(all).forEach(node => DOM[node.className] = node);

		DOM.progress = DOM.timeline.querySelector("x-range");
		DOM.volume = DOM.volume.querySelector("x-range");

		DOM.play.addEventListener("click", _ => this._command("play"));
		DOM.pause.addEventListener("click", _ => this._command("pause 1"));
		DOM.prev.addEventListener("click", _ => this._command("previous"));
		DOM.next.addEventListener("click", _ => this._command("next"));

		DOM.random.addEventListener("click", _ => this._command(`random ${this._current["random"] == "1" ? "0" : "1"}`));
		DOM.repeat.addEventListener("click", _ => this._command(`repeat ${this._current["repeat"] == "1" ? "0" : "1"}`));

		DOM.volume.addEventListener("input", e => this._command(`setvol ${e.target.valueAsNumber}`));
		DOM.progress.addEventListener("input", e => this._command(`seekcur ${e.target.valueAsNumber}`));

		DOM.mute.addEventListener("click", _ => this._command(`setvol ${this._toggledVolume}`));

		return DOM;
	}

	async _command(cmd) {
		const mpd = await this._mpd;
		this._clearIdle();
		const data = await mpd.commandAndStatus(cmd);
		this._sync(data);
		this._idle();
	}

	_idle() {
		this._idleTimeout = setTimeout(() => this._update(), DELAY);
	}

	_clearIdle() {
		this._idleTimeout && clearTimeout(this._idleTimeout);
		this._idleTimeout = null;
	}

	async _update() {
		const mpd = await this._mpd;
		this._clearIdle();
		const data = await mpd.status();
		this._sync(data);
		this._idle();
	}

	_sync(data) {
		const DOM = this._dom;
		if ("volume" in data) {
			data["volume"] = Number(data["volume"]);

			DOM.mute.disabled = false;
			DOM.volume.disabled = false;
			DOM.volume.value = data["volume"];

			if (data["volume"] == 0 && this._current["volume"] > 0) { // muted
				this._toggledVolume = this._current["volume"];
				html.clear(DOM.mute);
				DOM.mute.appendChild(html.icon("volume-off"));
			}

			if (data["volume"] > 0 && this._current["volume"] == 0) { // restored
				this._toggledVolume = 0;
				html.clear(DOM.mute);
				DOM.mute.appendChild(html.icon("volume-high"));
			}

		} else {
			DOM.mute.disabled = true;
			DOM.volume.disabled = true;
			DOM.volume.value = 50;
		}

		// changed time
		let elapsed = Number(data["elapsed"] || 0);
		DOM.progress.value = elapsed;
		DOM.elapsed.textContent = format.time(elapsed);

		if (data["file"] != this._current["file"]) { // changed song
			if (data["file"]) { // playing at all?
				let duration = Number(data["duration"]);
				DOM.duration.textContent = format.time(duration);
				DOM.progress.max = duration;
				DOM.progress.disabled = false;
				DOM.title.textContent = data["Title"] || data["file"].split("/").pop();
				DOM.subtitle.textContent = format.subtitle(data, {duration:false});
			} else {
				DOM.title.textContent = "";
				DOM.subtitle.textContent = "";
				DOM.progress.value = 0;
				DOM.progress.disabled = true;
			}

			this._dispatchSongChange(data);
		}

		let artistNew = data["AlbumArtist"] || data["Artist"];
		let artistOld = this._current["AlbumArtist"] || this._current["Artist"];
		if (artistNew != artistOld || data["Album"] != this._current["Album"]) { // changed album (art)
			html.clear(DOM.art);
			art.get(artistNew, data["Album"], data["file"]).then(src => {
				if (src) {
					html.node("img", {src}, "", DOM.art);
				} else {
					html.icon("music", DOM.art);
				}
			});
		}

		let flags = [];
		if (data["random"] == "1") { flags.push("random"); }
		if (data["repeat"] == "1") { flags.push("repeat"); }
		this.dataset.flags = flags.join(" ");
		this.dataset.state = data["state"];

		this._current = data;
	}

	async _dispatchSongChange(detail) {
		const app = await this._app;
		const e = new CustomEvent("song-change", {detail});
		app.dispatchEvent(e);
	}
}

customElements.define("cyp-player", Player);
