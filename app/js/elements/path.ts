import Item from "../item.js";
import * as html from "../html.js";
import * as format from "../format.js";
import { PathData } from "../parser.js";


export default class Path extends Item {
	protected isDirectory: boolean;

	constructor(protected data: PathData) {
		super();
		this.isDirectory = ("directory" in this.data);
		this.append(html.icon(this.isDirectory ? "folder" : "music"));
		this.buildTitle(format.fileName(this.file));
	}

	get file() { return (this.isDirectory ? this.data.directory : this.data.file) as string; }
}

customElements.define("cyp-path", Path);
