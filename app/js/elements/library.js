import * as html from "../html.js";
import Component from "../component.js";
import Tag from "./tag.js";
import Path from "./path.js";
import Back from "./back.js";
import Song from "./song.js";
import Search from "./search.js";
import { escape, serializeFilter } from "../mpd.js";


const SORT = "-Track";
const TAGS = {
	"Album": "Albums",
	"AlbumArtist": "Artists"
}

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
		this._stateStack = [];
		this._initCommands();

		this._search = new Search();
		this._search.onSubmit = _ => {
			let query = this._search.value;
			if (query.length < 3) { return; }
			this._doSearch(query);
		}
	}

	_popState() {
		this.selection.clear();

		this._stateStack.pop();
		if (this._stateStack.length > 0) {
			let state = this._stateStack[this._stateStack.length-1];
			this._showState(state);
		} else {
			this._showRoot();
		}
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
		this._stateStack = [];
		html.clear(this);

		const nav = html.node("nav", {}, "", this);

		html.button({icon:"artist"}, "Artists and albums", nav)
			.addEventListener("click", _ => this._pushState({type:"tags", tag:"AlbumArtist"}));

		html.button({icon:"folder"}, "Files and directories", nav)
			.addEventListener("click", _ => this._pushState({type:"path", path:""}));

		html.button({icon:"magnify"}, "Search", nav)
			.addEventListener("click", _ => this._pushState({type:"search"}));
	}

	_pushState(state) {
		this._stateStack.push(state);
		this._showState(state);
	}

	_showState(state) {
		switch (state.type) {
			case "tags": this._listTags(state.tag, state.filter); break;
			case "songs": this._listSongs(state.filter); break;
			case "path": this._listPath(state.path); break;
			case "search": this._showSearch(state.query); break;
		}
	}

	async _listTags(tag, filter = {}) {
		const values = await this._mpd.listTags(tag, filter);
		html.clear(this);

		if ("AlbumArtist" in filter) { this._buildBack(); }
		values.filter(nonempty).forEach(value => this._buildTag(tag, value, filter));
	}

	async _listPath(path) {
		let paths = await this._mpd.listPath(path);
		html.clear(this);

		path && this._buildBack();
		paths["directory"].forEach(path => this._buildPath(path));
		paths["file"].forEach(path => this._buildPath(path));
	}

	async _listSongs(filter) {
		const songs = await this._mpd.listSongs(filter);
		html.clear(this);
		this._buildBack();
		songs.forEach(song => this.appendChild(new Song(song)));
	}

	_showSearch(query = "") {
		html.clear(this);

		this.appendChild(this._search);
		this._search.value = query;
		this._search.focus();

		query && this._search.onSubmit();
	}

	async _doSearch(query) {
		let state = this._stateStack[this._stateStack.length-1];
		state.query = query;

		html.clear(this);
		this.appendChild(this._search);
		this._search.pending(true);

		const songs1 = await this._mpd.searchSongs({"AlbumArtist": query});
		const songs2 = await this._mpd.searchSongs({"Album": query});
		const songs3 = await this._mpd.searchSongs({"Title": query});

		this._search.pending(false);

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
				node.onClick = () => this._pushState({type:"tags", tag:"Album", filter:node.createChildFilter()});
			break;

			case "Album":
				node = new Tag(tag, value, filter);
				this.appendChild(node);
				node.addButton("chevron-double-right", _ => this._pushState({type:"songs", filter:node.createChildFilter()}));
			break;
		}
		node.fillArt(this._mpd);
	}

	_buildBack() {
		const backState = this._stateStack[this._stateStack.length-2];
		let title;
		switch (backState.type) {
			case "path": title = ".."; break;
			case "search": title = "Search"; break;
			case "tags": title = TAGS[backState.tag]; break;
		}

		const node = new Back(title);
		this.appendChild(node);
		node.onClick = () => this._popState();
	}

	_buildPath(data) {
		let node = new Path(data);
		this.appendChild(node);

		if ("directory" in data) {
			const path = data["directory"];
			node.addButton("chevron-double-right", _ => this._pushState({type:"path", path}));
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
