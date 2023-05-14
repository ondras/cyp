import Item from "../item.js";
import * as html from "../html.js";
import * as format from "../format.js";
import { PathData } from "../parser.js";


export default class Path extends Item {
	protected isDirectory: boolean;

	constructor(readonly data: PathData) {
		super();
		this.isDirectory = ("directory" in this.data);
	}

	get file() { return (this.isDirectory ? this.data.directory : this.data.file) as string; }

	connectedCallback() {
		this.append(html.icon(this.isDirectory ? "folder" : "music"));
		this.buildTitle(format.fileName(this.file));
	}
}

customElements.define("cyp-path", Path);
