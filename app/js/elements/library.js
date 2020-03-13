import * as html from "../html.js";
import Component from "../component.js";
import Tag from "./tag.js";
import Path from "./path.js";
import Back from "./back.js";
import Song from "./song.js";
import { escape, serializeFilter } from "../mpd.js";


const SORT = "-Track";

function nonempty(str) { return (str.length > 0); }

function createEnqueueCommand(node) {
	if (node instanceof Song) {
		return `add "${escape(node.data["file"])}"`;
	} else if (node instanceof Path) {
		return `add "${escape(node.file)}"`;
	} else if (node instanceof Tag) {
		return [
			"findadd",
			serializeFilter(node.createChildFilter()),
			// `sort ${SORT}` // MPD >= 0.22, not yet released
		].join(" ");
	} else {
		throw new Error(`Cannot create enqueue command for "${node.nodeName}"`);
	}
}

class Library extends Component {
	constructor() {
		super({selection:"multi"});
		this._initCommands();
	}

	_onAppLoad() {
		this._showRoot();
	}

	_onComponentChange(c, isThis) {
		const wasHidden = this.hidden;
		this.hidden = !isThis;

		if (!wasHidden && isThis) { this._showRoot(); }
	}

	_showRoot() {
		html.clear(this);

		const nav = html.node("nav", {}, "", this);

		html.button({icon:"artist"}, "Artists and albums", nav)
			.addEventListener("click", _ => this._listTags("AlbumArtist"));

		html.button({icon:"folder"}, "Files and directories", nav)
			.addEventListener("click", _ => this._listPath(""));

		html.button({icon:"magnify"}, "Search", nav)
			.addEventListener("click", _ => this._showSearch());
	}

	async _listTags(tag, filter = {}) {
		const values = await this._mpd.listTags(tag, filter);
		html.clear(this);

		if ("AlbumArtist" in filter) { this._buildBack(filter); }
		values.filter(nonempty).forEach(value => this._buildTag(tag, value, filter));
	}

	async _listPath(path) {
		let paths = await this._mpd.listPath(path);
		html.clear(this);

		path && this._buildBack(path);
		paths["directory"].forEach(path => this._buildPath(path));
		paths["file"].forEach(path => this._buildPath(path));
	}

	async _listSongs(filter) {
		const songs = await this._mpd.listSongs(filter);
		html.clear(this);
		this._buildBack(filter);
		songs.forEach(song => this.appendChild(new Song(song)));
	}

	_showSearch() {
		html.clear(this);

		const form = html.node("form", {}, "", this);
		const input = html.node("input", {type:"text"}, "", form);
		html.button({icon:"magnify"}, "", form);
		form.addEventListener("submit", e => {
			e.preventDefault();
			const q = input.value.trim();
			if (q.length < 3) { return; }
			this._doSearch(q, form);
		});

		input.focus();
	}

	async _doSearch(q, form) {
		const songs1 = await this._mpd.searchSongs({"AlbumArtist": q});
		const songs2 = await this._mpd.searchSongs({"Album": q});
		const songs3 = await this._mpd.searchSongs({"Title": q});
		html.clear(this);
		this.appendChild(form);

		this._aggregateSearch(songs1, "AlbumArtist");
		this._aggregateSearch(songs2, "Album");
		songs3.forEach(song => this.appendChild(new Song(song)));
	}

	_aggregateSearch(songs, tag) {
		let results = new Map();
		songs.forEach(song => {
			let filter = {}, value;
			const artist = song["AlbumArtist"] || song["Artist"]

			if (tag == "Album") {
				value = song[tag];
				if (artist) { filter["AlbumArtist"] = artist; }
			}

			if (tag == "AlbumArtist") { value = artist; }

			results.set(value, filter);
		});

		results.forEach((filter, value) => this._buildTag(tag, value, filter));
	}

	_buildTag(tag, value, filter) {
		let node;
		switch (tag) {
			case "AlbumArtist":
				node = new Tag(tag, value, filter);
				this.appendChild(node);
				node.onClick = () => this._listTags("Album", node.createChildFilter());
			break;

			case "Album":
				node = new Tag(tag, value, filter);
				this.appendChild(node);
				node.addButton("chevron-double-right", _ => this._listSongs(node.createChildFilter()));
			break;
		}
	}

	_buildBack(filterOrPath) {
		if (typeof(filterOrPath) == "string") {
			const path = filterOrPath.split("/").slice(0, -1).join("");
			const node = new Back("..");
			this.appendChild(node);
			node.onClick = () => {
				this.selection.clear();
				this._listPath(path);
			}
			return;
		}

		const filter = Object.assign({}, filterOrPath)
		let tag, title;

		if ("Album" in filter) {
			tag = "Album";
			title = filter["AlbumArtist"];
		} else if ("AlbumArtist" in filter) {
			tag = "AlbumArtist";
			title = "Artists";
		}

		delete filter[tag];
		const node = new Back(title);
		this.appendChild(node);
		node.onClick = () => {
			this.selection.clear();
			this._listTags(tag, filter);
		}
	}

	_buildPath(data) {
		let node = new Path(data);
		this.appendChild(node);

		if ("directory" in data) {
			const path = data["directory"];
			node.addButton("chevron-double-right", _ => this._listPath(path));
		}
	}

	_initCommands() {
		const sel = this.selection;

		sel.addCommandAll();

		sel.addCommand(async items => {
			const commands = ["clear",...items.map(createEnqueueCommand), "play"];
			await this._mpd.command(commands);
			this.selection.clear();
			this._app.dispatchEvent(new CustomEvent("queue-change")); // fixme notification?
		}, {label:"Play", icon:"play"});

		sel.addCommand(async items => {
			const commands = items.map(createEnqueueCommand);
			await this._mpd.command(commands);
			this.selection.clear();
			this._app.dispatchEvent(new CustomEvent("queue-change")); // fixme notification?
		}, {label:"Enqueue", icon:"plus"});

		sel.addCommandCancel();
	}
}

customElements.define("cyp-library", Library);
