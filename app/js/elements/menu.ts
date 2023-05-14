import Component from "../component.js";


class Menu extends Component {
	protected tabs = Array.from(this.querySelectorAll<HTMLElement>("[data-for]"));

	connectedCallback() {
		super.connectedCallback();

		this.tabs.forEach(tab => {
			tab.addEventListener("click", _ => this.app.setAttribute("component", tab.dataset.for!));
		});
	}

	protected onAppLoad() {
		this.app.addEventListener("queue-length-change", e => {
			this.querySelector(".queue-length")!.textContent = `(${(e as CustomEvent).detail})`;
		});
	}

	protected onComponentChange(component: string) {
		this.tabs.forEach(tab => {
			tab.classList.toggle("active", tab.dataset.for == component);
		});
	}
}

customElements.define("cyp-menu", Menu);
