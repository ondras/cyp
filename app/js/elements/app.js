import MPD from "../mpd.js";
import * as html from "../html.js";

function initIcons() {
	Array.from(document.querySelectorAll("[data-icon]")).forEach(/** @param {HTMLElement} node */ node => {
		node.dataset.icon.split(" ").forEach(name => {
			let icon = html.icon(name);
			node.insertBefore(icon, node.firstChild);
		})
	});
}

class App extends HTMLElement {
	static get observedAttributes() { return ["component"]; }

	constructor() {
		super();
		initIcons();
	}

	async connectedCallback() {
		await waitForChildren(this);

		window.addEventListener("hashchange", e => this._onHashChange());
		this._onHashChange();

		await this._connect();
		this.dispatchEvent(new CustomEvent("load"));

		this.mediaSessionInit = false;
		this._initMediaHandler();
	}

	attributeChangedCallback(name, oldValue, newValue) {
		switch (name) {
			case "component":
				location.hash = newValue;
				const e = new CustomEvent("component-change");
				this.dispatchEvent(e);
			break;
		}
	}

	get component() { return this.getAttribute("component"); }
	set component(component) { this.setAttribute("component", component); }

	_onHashChange() {
		const component = location.hash.substring(1) || "queue";
		if (component != this.component) { this.component = component; }
	}

	_onChange(changed) { this.dispatchEvent(new CustomEvent("idle-change", {detail:changed})); }

	_onClose(e) {
		setTimeout(() => this._connect(), 3000);
	}

	async _connect() {
		const attempts = 3;
		for (let i=0;i<attempts;i++) {
			try {
				let mpd = await MPD.connect();
				mpd.onChange = changed => this._onChange(changed);
				mpd.onClose = e => this._onClose(e);
				this.mpd = mpd;
				return;
			} catch (e) {
				await sleep(500);
			}
		}
		alert(`Failed to connect to MPD after ${attempts} attempts. Please reload the page to try again.`);
	}

	_initMediaHandler() {
		// check support mediaSession
		if (!('mediaSession' in navigator)) {
			console.log('mediaSession is not supported');
			return;
		}

		// DOM (using media session controls are allowed only if there is audio/video tag)
		const audio = html.node("audio", {loop: true}, "", this);
		html.node("source", {src: 'https://raw.githubusercontent.com/anars/blank-audio/master/10-seconds-of-silence.mp3'}, '', audio);

		// Init event session (play audio) on click (because restrictions by web browsers)
		window.addEventListener('click', () => {
			if (!this.mediaSessionInit) {
				audio.play();
				this.mediaSessionInit = true;
			}
		});

		// mediaSession define metadata
		navigator.mediaSession.metadata = new MediaMetadata({
			title: 'Control Your Player'
		});

		// mediaSession define action handlers
		navigator.mediaSession.setActionHandler('play', () => {
			this.mpd.command("play")
			audio.play()
		});
		navigator.mediaSession.setActionHandler('pause', () => {
			this.mpd.command("pause 1")
			audio.pause()
		});
		navigator.mediaSession.setActionHandler('previoustrack', () => {
			this.mpd.command("previous")
			audio.play()
		});
		navigator.mediaSession.setActionHandler('nexttrack', () => {
			this.mpd.command("next")
			audio.play()
		});
	}
}

customElements.define("cyp-app", App);

function sleep(ms) { return new Promise(resolve =>setTimeout(resolve, ms)); }

function waitForChildren(app) {
	const children = Array.from(app.querySelectorAll("*"));
	const names = children.map(node => node.nodeName.toLowerCase())
		.filter(name => name.startsWith("cyp-"));
	const unique = new Set(names);

	const promises = [...unique].map(name => customElements.whenDefined(name));
	return Promise.all(promises);
}
