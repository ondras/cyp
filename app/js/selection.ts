import * as html from "./html.js";


type Mode = "single" | "multi";

interface Command {
	cb: Function;
	label: string;
	icon: string;
	className?: string;
};

export default class Selection {
	readonly commands = new Commands();
	protected items: HTMLElement[] = [];
	protected mode!: Mode;

	constructor() {
		this.hide();
	}

	configure(items: HTMLElement[], mode: Mode, commands: Command[]) {
		this.mode = mode;

		let allCommands: Command[] = [];

		if (mode == "multi") {
			allCommands.push({
				cb: () => items.forEach(item => this.add(item)),
				label:"Select all",
				icon:"checkbox-marked-outline"
			});
		}

		allCommands.push(...commands);

		allCommands.push({
			cb: () => this.clear(),
			icon: "cancel",
			label: "Cancel",
			className: "last"
		});

		let buttons = allCommands.map(command => {
			let button = buildButton(command);
			button.addEventListener("click", _ => {
				const arg = (mode == "single" ? this.items[0] : this.items);
				command.cb(arg);
			});
			return button;
		});

		this.commands.innerHTML = "";
		this.commands.append(...buttons);

		items.forEach(item => {
			item.onclick = () => this.toggle(item);
		});

		this.clear();
	}

	clear() {
		while (this.items.length) { this.remove(this.items[0]); }
	}

	protected toggle(node: HTMLElement) {
		if (this.items.includes(node)) {
			this.remove(node);
		} else {
			this.add(node);
		}
	}

	protected add(node: HTMLElement) {
		if (this.items.includes(node)) { return; }
		const length = this.items.length;
		this.items.push(node);
		node.classList.add("selected");

		if (this.mode == "single" && length > 0) { this.remove(this.items[0]); }

		if (length == 0) { this.show(); }
	}

	protected remove(node: HTMLElement) {
		const index = this.items.indexOf(node);
		this.items.splice(index, 1);
		node.classList.remove("selected");
		if (this.items.length == 0) { this.hide(); }
	}

	protected show() { this.commands.hidden = false; }
	protected hide() { this.commands.hidden = true; }
}

function buildButton(command: Command) {
	const button = html.button({icon:command.icon});
	if (command.className) { button.className = command.className; }
	html.node("span", {}, command.label, button);
	return button;
}

class Commands extends HTMLElement {}
customElements.define("cyp-commands", Commands);
