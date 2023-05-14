import * as html from "../html.js";
import Component from "../component.js";
import Tag, { TagType, TagFilter } from "./tag.js";
import Path from "./path.js";
import Back from "./back.js";
import Song from "./song.js";
import Search from "./search.js";
import Filter from "./filter.js";
import Selection from "../selection.js";
import { escape, serializeFilter } from "../mpd.js";
import { SongData, PathData } from "../parser.js";



type OurNode = Song | Path | Tag;

type State = {
	type: "tags";
	tag: TagType;
	filter?: TagFilter;
} | {
	type: "songs";
	filter: TagFilter;
} | {
	type: "path";
	path: string;
} | {
	type: "search";
	query?: string;
}

const SORT = "-Track";
const TAGS = {
	"Album": "Albums",
	"AlbumArtist": "Artists",
	"Genre": "Genres"
}

class Library extends Component {
	protected selection!: Selection;
	protected search = new Search();
	protected filter = new Filter();
	protected stateStack: State[] = [];

	constructor() {
		super();

		this.search.onSubmit = () => {
			let query = this.search.value;
			if (query.length < 3) { return; }
			this.doSearch(query);
		}
	}

	protected popState() {
		this.selection.clear();
		this.stateStack.pop();

		if (this.stateStack.length > 0) {
			let state = this.stateStack[this.stateStack.length-1];
			this.showState(state);
		} else {
			this.showRoot();
		}
	}

	protected onAppLoad() {
		this.selection = this.app.createSelection();
		this.showRoot();
	}

	protected onComponentChange(c: string, isThis: boolean) {
		const wasHidden = this.hidden;
		this.hidden = !isThis;

		if (!wasHidden && isThis) { this.showRoot(); }
	}

	protected showRoot() {
		this.stateStack = [];
		html.clear(this);

		const nav = html.node("nav", {}, "", this);

		html.button({icon:"artist"}, "Artists and albums", nav)
			.addEventListener("click", _ => this.pushState({type:"tags", tag:"AlbumArtist"}));

		html.button({icon:"music"}, "Genres", nav)
			.addEventListener("click", _ => this.pushState({type:"tags", tag:"Genre"}));

		html.button({icon:"folder"}, "Files and directories", nav)
			.addEventListener("click", _ => this.pushState({type:"path", path:""}));

		html.button({icon:"magnify"}, "Search", nav)
			.addEventListener("click", _ => this.pushState({type:"search"}));
	}

	protected pushState(state: State) {
		this.selection.clear();
		this.stateStack.push(state);

		this.showState(state);
	}

	protected showState(state: State) {
		switch (state.type) {
			case "tags": this.listTags(state.tag, state.filter); break;
			case "songs": this.listSongs(state.filter); break;
			case "path": this.listPath(state.path); break;
			case "search": this.showSearch(state.query); break;
		}
	}

	protected async listTags(tag: TagType, filter = {}) {
		const values = (await this.mpd.listTags(tag, filter)).filter(nonempty) as any[];
		html.clear(this);

		if ("AlbumArtist" in filter || "Genre" in filter) { this.buildBack(); }
		(values.length > 0) && this.addFilter();

		let nodes = values.map(value => this.buildTag(tag, value, filter));
		// FIXME append

		let albumNodes = nodes.filter(node => node.type == "Album");
		this.configureSelection(albumNodes);
	}

	protected async listPath(path: string) {
		let paths = await this.mpd.listPath(path);
		html.clear(this);

		path && this.buildBack();
		(paths["directory"].length + paths["file"].length > 0) && this.addFilter();

		let items = [...paths["directory"], ...paths["file"]];
		let nodes = items.map(item => this.buildPath(item));
		// FIXME append

		this.configureSelection(nodes);
	}

	protected async listSongs(filter: TagFilter) {
		const songs = await this.mpd.listSongs(filter);
		html.clear(this);
		this.buildBack();
		(songs.length > 0 && this.addFilter());

		let nodes = songs.map(song => new Song(song));
		this.append(...nodes);

		this.configureSelection(nodes);
	}

	protected showSearch(query = "") {
		html.clear(this);

		this.append(this.search);
		this.search.value = query;
		this.search.focus();

		query && this.search.onSubmit();
	}

	protected async doSearch(query: string) {
		this.stateStack[this.stateStack.length-1] = {
			type: "search",
			query
		}

		html.clear(this);
		this.append(this.search);
		this.search.pending(true);

		const songs1 = await this.mpd.searchSongs({"AlbumArtist": query});
		const songs2 = await this.mpd.searchSongs({"Album": query});
		const songs3 = await this.mpd.searchSongs({"Title": query});

		this.search.pending(false);

		let nodes1 = this.aggregateSearch(songs1, "AlbumArtist");
		let nodes2 = this.aggregateSearch(songs2, "Album");
		let nodes3 = songs3.map(song => new Song(song));
		// FIXME append
		this.append(...nodes3);

		let selectableNodes = [...nodes2, ...nodes3];
		this.configureSelection(selectableNodes);
	}

	protected aggregateSearch(songs: SongData[], tag: TagType) {
		let results = new Map();
		let nodes: OurNode[] = [];

		songs.forEach(song => {
			let filter: TagFilter = {}, value;
			const artist = song.AlbumArtist || song.Artist;

			if (tag == "Album") {
				value = song[tag];
				if (artist) { filter["AlbumArtist"] = artist; }
			}

			if (tag == "AlbumArtist") { value = artist; }

			results.set(value, filter);
		});

		results.forEach((filter, value) => {
			let node = this.buildTag(tag, value, filter);
			nodes.push(node);
		});

		return nodes;
	}

	protected buildTag(tag: TagType, value: string, filter: TagFilter) {
		let node = new Tag(tag, value, filter);
		this.append(node);
		node.fillArt(this.mpd);

		switch (tag) {
			case "AlbumArtist":
			case "Genre":
				node.onclick = () => this.pushState({type:"tags", tag:"Album", filter:node.createChildFilter()});
			break;

			case "Album":
				node.addButton("chevron-double-right", () => this.pushState({type:"songs", filter:node.createChildFilter()}));
			break;
		}

		return node;
	}

	protected buildBack() {
		const backState = this.stateStack[this.stateStack.length-2];
		let title = "";
		switch (backState.type) {
			case "path": title = ".."; break;
			case "search": title = "Search"; break;
			case "tags": title = TAGS[backState.tag]; break;
		}

		const node = new Back(title);
		this.append(node);
		node.onclick = () => this.popState();
	}

	protected buildPath(data: PathData) {
		let node = new Path(data);
		this.append(node);

		if (data.directory) {
			const path = data.directory;
			node.addButton("chevron-double-right", () => this.pushState({type:"path", path}));
		}

		return node;
	}

	protected addFilter() {
		this.append(this.filter);
		this.filter.value = "";
	}

	configureSelection(items: OurNode[]) {
		const { selection, mpd } = this;

		let commands = [{
			cb: async (items: OurNode[]) => {
				const commands = ["clear", ...items.map(createEnqueueCommand), "play"];
				await mpd.command(commands);
				selection.clear(); // fixme notification?
			},
			label:"Play",
			icon:"play"
		}, {
			cb: async (items: OurNode[]) => {
				const commands = items.map(createEnqueueCommand);
				await mpd.command(commands);
				selection.clear(); // fixme notification?
			},
			label:"Enqueue",
			icon:"plus"
		}];

		selection.configure(items, "multi", commands);
	}
}

customElements.define("cyp-library", Library);

function nonempty(str: string) { return (str.length > 0); }

function createEnqueueCommand(node: OurNode | HTMLElement) {
	if (node instanceof Song || node instanceof Path) {
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
