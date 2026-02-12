"use strict";
(() => {
  // node_modules/custom-range/range.js
  var Range = class extends HTMLElement {
    static get observedAttributes() {
      return ["min", "max", "value", "step", "disabled"];
    }
    constructor() {
      super();
      this._dom = {};
      this.addEventListener("mousedown", this);
      this.addEventListener("keydown", this);
    }
    get _valueAsNumber() {
      let raw = this.hasAttribute("value") ? Number(this.getAttribute("value")) : 50;
      return this._constrain(raw);
    }
    get _minAsNumber() {
      return this.hasAttribute("min") ? Number(this.getAttribute("min")) : 0;
    }
    get _maxAsNumber() {
      return this.hasAttribute("max") ? Number(this.getAttribute("max")) : 100;
    }
    get _stepAsNumber() {
      return this.hasAttribute("step") ? Number(this.getAttribute("step")) : 1;
    }
    get value() {
      return String(this._valueAsNumber);
    }
    get valueAsNumber() {
      return this._valueAsNumber;
    }
    get min() {
      return this.hasAttribute("min") ? this.getAttribute("min") : "";
    }
    get max() {
      return this.hasAttribute("max") ? this.getAttribute("max") : "";
    }
    get step() {
      return this.hasAttribute("step") ? this.getAttribute("step") : "";
    }
    get disabled() {
      return this.hasAttribute("disabled");
    }
    set _valueAsNumber(value) {
      this.value = String(value);
    }
    set min(min) {
      this.setAttribute("min", min);
    }
    set max(max) {
      this.setAttribute("max", max);
    }
    set value(value) {
      this.setAttribute("value", value);
    }
    set step(step) {
      this.setAttribute("step", step);
    }
    set disabled(disabled) {
      disabled ? this.setAttribute("disabled", "") : this.removeAttribute("disabled");
    }
    connectedCallback() {
      if (this.firstChild) {
        return;
      }
      this.innerHTML = `
			<span class="-track"></span>
			<span class="-elapsed"></span>
			<span class="-remaining"></span>
			<div class="-inner">
				<button class="-thumb"></button>
			</div>
		`;
      Array.from(this.querySelectorAll("[class^='-']")).forEach((node2) => {
        let name = node2.className.substring(1);
        this._dom[name] = node2;
      });
      this._update();
    }
    attributeChangedCallback(name, oldValue, newValue) {
      if (!this.firstChild) {
        return;
      }
      switch (name) {
        case "min":
        case "max":
        case "value":
        case "step":
          this._update();
          break;
      }
    }
    handleEvent(e) {
      switch (e.type) {
        case "mousedown":
          if (this.disabled) {
            return;
          }
          document.addEventListener("mousemove", this);
          document.addEventListener("mouseup", this);
          this._setToMouse(e);
          break;
        case "mousemove":
          this._setToMouse(e);
          break;
        case "mouseup":
          document.removeEventListener("mousemove", this);
          document.removeEventListener("mouseup", this);
          this.dispatchEvent(new CustomEvent("change"));
          break;
        case "keydown":
          if (this.disabled) {
            return;
          }
          this._handleKey(e.code);
          this.dispatchEvent(new CustomEvent("input"));
          this.dispatchEvent(new CustomEvent("change"));
          break;
      }
    }
    _handleKey(code) {
      let min = this._minAsNumber;
      let max = this._maxAsNumber;
      let range = max - min;
      let step = this._stepAsNumber;
      switch (code) {
        case "ArrowLeft":
        case "ArrowDown":
          this._valueAsNumber = this._constrain(this._valueAsNumber - step);
          break;
        case "ArrowRight":
        case "ArrowUp":
          this._valueAsNumber = this._constrain(this._valueAsNumber + step);
          break;
        case "Home":
          this._valueAsNumber = this._constrain(min);
          break;
        case "End":
          this._valueAsNumber = this._constrain(max);
          break;
        case "PageUp":
          this._valueAsNumber = this._constrain(this._valueAsNumber + range / 10);
          break;
        case "PageDown":
          this._valueAsNumber = this._constrain(this._valueAsNumber - range / 10);
          break;
      }
    }
    _constrain(value) {
      const min = this._minAsNumber;
      const max = this._maxAsNumber;
      const step = this._stepAsNumber;
      value = Math.max(value, min);
      value = Math.min(value, max);
      value -= min;
      value = Math.round(value / step) * step;
      value += min;
      if (value > max) {
        value -= step;
      }
      return value;
    }
    _update() {
      let min = this._minAsNumber;
      let max = this._maxAsNumber;
      let frac = (this._valueAsNumber - min) / (max - min);
      this._dom.thumb.style.left = `${frac * 100}%`;
      this._dom.remaining.style.left = `${frac * 100}%`;
      this._dom.elapsed.style.width = `${frac * 100}%`;
    }
    _setToMouse(e) {
      let rect = this._dom.inner.getBoundingClientRect();
      let x = e.clientX;
      x = Math.max(x, rect.left);
      x = Math.min(x, rect.right);
      let min = this._minAsNumber;
      let max = this._maxAsNumber;
      let frac = (x - rect.left) / (rect.right - rect.left);
      let value = this._constrain(min + frac * (max - min));
      if (value == this._valueAsNumber) {
        return;
      }
      this._valueAsNumber = value;
      this.dispatchEvent(new CustomEvent("input"));
    }
  };
  customElements.define("x-range", Range);

  // app/js/parser.ts
  function linesToStruct(lines) {
    let result = {};
    lines.forEach((line) => {
      let cindex = line.indexOf(":");
      if (cindex == -1) {
        throw new Error(`Malformed line "${line}"`);
      }
      let key = line.substring(0, cindex);
      let value = line.substring(cindex + 2);
      if (key in result) {
        let old = result[key];
        if (old instanceof Array) {
          old.push(value);
        } else {
          result[key] = [old, value];
        }
      } else {
        result[key] = value;
      }
    });
    return result;
  }
  function songList(lines) {
    let songs = [];
    let batch = [];
    while (lines.length) {
      let line = lines[0];
      if (line.startsWith("file:") && batch.length) {
        let song = linesToStruct(batch);
        songs.push(song);
        batch = [];
      }
      batch.push(lines.shift());
    }
    if (batch.length) {
      let song = linesToStruct(batch);
      songs.push(song);
    }
    return songs;
  }
  function pathContents(lines) {
    const prefixes = ["file", "directory", "playlist"];
    let batch = [];
    let result = {};
    let batchPrefix = "";
    prefixes.forEach((prefix2) => result[prefix2] = []);
    while (lines.length) {
      let line = lines[0];
      let prefix2 = line.split(":")[0];
      if (prefixes.includes(prefix2)) {
        if (batch.length) {
          result[batchPrefix].push(linesToStruct(batch));
        }
        batchPrefix = prefix2;
        batch = [];
      }
      batch.push(lines.shift());
    }
    if (batch.length) {
      result[batchPrefix].push(linesToStruct(batch));
    }
    return result;
  }

  // app/js/mpd.ts
  var MPD = class {
    constructor(ws, initialCommand) {
      this.ws = ws;
      this.queue = [];
      this.canTerminateIdle = false;
      this.current = initialCommand;
      ws.addEventListener("message", (e) => this._onMessage(e));
      ws.addEventListener("close", (e) => this._onClose(e));
    }
    static async connect() {
      let response = await fetch("ticket", { method: "POST" });
      let ticket = (await response.json()).ticket;
      let ws = new WebSocket(createURL(ticket).href);
      return new Promise((resolve, reject) => {
        let mpd;
        let initialCommand = { resolve: () => resolve(mpd), reject, cmd: "" };
        mpd = new this(ws, initialCommand);
      });
    }
    onClose(e) {
    }
    onChange(changed) {
    }
    command(cmds) {
      let cmd = cmds instanceof Array ? ["command_list_begin", ...cmds, "command_list_end"].join("\n") : cmds;
      return new Promise((resolve, reject) => {
        this.queue.push({ cmd, resolve, reject });
        if (!this.current) {
          this.advanceQueue();
        } else if (this.canTerminateIdle) {
          this.ws.send("noidle");
          this.canTerminateIdle = false;
        }
      });
    }
    async status() {
      let lines = await this.command("status");
      return linesToStruct(lines);
    }
    async currentSong() {
      let lines = await this.command("currentsong");
      return linesToStruct(lines);
    }
    async listQueue() {
      let lines = await this.command("playlistinfo");
      return songList(lines);
    }
    async listPlaylists() {
      let lines = await this.command("listplaylists");
      let parsed = linesToStruct(lines);
      let list = parsed.playlist;
      if (!list) {
        return [];
      }
      return list instanceof Array ? list : [list];
    }
    async listPlaylistItems(name) {
      let lines = await this.command(`listplaylistinfo "${escape(name)}"`);
      return songList(lines);
    }
    async listPath(path) {
      let lines = await this.command(`lsinfo "${escape(path)}"`);
      return pathContents(lines);
    }
    async listTags(tag, filter = {}) {
      let tokens = ["list", tag];
      if (Object.keys(filter).length) {
        tokens.push(serializeFilter(filter));
        let fakeGroup = Object.keys(filter)[0];
        tokens.push("group", fakeGroup);
      }
      let lines = await this.command(tokens.join(" "));
      let parsed = linesToStruct(lines);
      return [].concat(tag in parsed ? parsed[tag] : []);
    }
    async listSongs(filter, window2) {
      let tokens = ["find", serializeFilter(filter)];
      window2 && tokens.push("window", window2.join(":"));
      let lines = await this.command(tokens.join(" "));
      return songList(lines);
    }
    async searchSongs(filter) {
      let tokens = ["search", serializeFilter(filter, "contains")];
      let lines = await this.command(tokens.join(" "));
      return songList(lines);
    }
    async albumArt(songUrl) {
      let data = [];
      let offset = 0;
      let params = ["albumart", `"${escape(songUrl)}"`, offset];
      while (1) {
        params[2] = offset;
        try {
          let lines = await this.command(params.join(" "));
          data = data.concat(lines[2]);
          let metadata = linesToStruct(lines.slice(0, 2));
          if (data.length >= Number(metadata.size)) {
            return data;
          }
          offset += Number(metadata.binary);
        } catch (e) {
          return null;
        }
      }
      return null;
    }
    _onMessage(e) {
      if (!this.current) {
        return;
      }
      let lines = JSON.parse(e.data);
      let last = lines.pop();
      if (last.startsWith("OK")) {
        this.current.resolve(lines);
      } else {
        console.warn(last);
        this.current.reject(last);
      }
      this.current = void 0;
      if (this.queue.length > 0) {
        this.advanceQueue();
      } else {
        setTimeout(() => this.idle(), 0);
      }
    }
    _onClose(e) {
      console.warn(e);
      this.current && this.current.reject(e);
      this.onClose(e);
    }
    advanceQueue() {
      this.current = this.queue.shift();
      this.ws.send(this.current.cmd);
    }
    async idle() {
      if (this.current) {
        return;
      }
      this.canTerminateIdle = true;
      let lines = await this.command("idle stored_playlist playlist player options mixer");
      this.canTerminateIdle = false;
      let changed = linesToStruct(lines).changed || [];
      changed = [].concat(changed);
      changed.length > 0 && this.onChange(changed);
    }
  };
  function escape(str) {
    return str.replace(/(['"\\])/g, "\\$1");
  }
  function serializeFilter(filter, operator = "==") {
    let tokens = ["("];
    Object.entries(filter).forEach(([key, value], index) => {
      index && tokens.push(" AND ");
      tokens.push(`(${key} ${operator} "${escape(value)}")`);
    });
    tokens.push(")");
    let filterStr = tokens.join("");
    return `"${escape(filterStr)}"`;
  }
  function createURL(ticket) {
    let url = new URL(location.href);
    url.protocol = url.protocol == "https:" ? "wss" : "ws";
    url.hash = "";
    url.searchParams.set("ticket", ticket);
    return url;
  }

  // app/js/icons.ts
  var ICONS = {};
  ICONS["playlist-music"] = `<svg viewBox="0 0 24 24">
  <path d="M15,6H3V8H15V6M15,10H3V12H15V10M3,16H11V14H3V16M17,6V14.18C16.69,14.07 16.35,14 16,14A3,3 0 0,0 13,17A3,3 0 0,0 16,20A3,3 0 0,0 19,17V8H22V6H17Z"/>
</svg>`;
  ICONS["folder"] = `<svg viewBox="0 0 24 24">
  <path d="M10,4H4C2.89,4 2,4.89 2,6V18A2,2 0 0,0 4,20H20A2,2 0 0,0 22,18V8C22,6.89 21.1,6 20,6H12L10,4Z"/>
</svg>`;
  ICONS["shuffle"] = `<svg viewBox="0 0 24 24">
  <path d="M14.83,13.41L13.42,14.82L16.55,17.95L14.5,20H20V14.5L17.96,16.54L14.83,13.41M14.5,4L16.54,6.04L4,18.59L5.41,20L17.96,7.46L20,9.5V4M10.59,9.17L5.41,4L4,5.41L9.17,10.58L10.59,9.17Z"/>
</svg>`;
  ICONS["artist"] = `<svg viewBox="0 0 24 24">
  <path d="M11,14C12,14 13.05,14.16 14.2,14.44C13.39,15.31 13,16.33 13,17.5C13,18.39 13.25,19.23 13.78,20H3V18C3,16.81 3.91,15.85 5.74,15.12C7.57,14.38 9.33,14 11,14M11,12C9.92,12 9,11.61 8.18,10.83C7.38,10.05 7,9.11 7,8C7,6.92 7.38,6 8.18,5.18C9,4.38 9.92,4 11,4C12.11,4 13.05,4.38 13.83,5.18C14.61,6 15,6.92 15,8C15,9.11 14.61,10.05 13.83,10.83C13.05,11.61 12.11,12 11,12M18.5,10H20L22,10V12H20V17.5A2.5,2.5 0 0,1 17.5,20A2.5,2.5 0 0,1 15,17.5A2.5,2.5 0 0,1 17.5,15C17.86,15 18.19,15.07 18.5,15.21V10Z"/>
</svg>`;
  ICONS["download"] = `<svg viewBox="0 0 24 24">
  <path d="M5,20H19V18H5M19,9H15V3H9V9H5L12,16L19,9Z"/>
</svg>`;
  ICONS["checkbox-marked-outline"] = `<svg viewBox="0 0 24 24">
  <path d="M19,19H5V5H15V3H5C3.89,3 3,3.89 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V11H19M7.91,10.08L6.5,11.5L11,16L21,6L19.59,4.58L11,13.17L7.91,10.08Z"/>
</svg>`;
  ICONS["magnify"] = `<svg viewBox="0 0 24 24">
  <path d="M9.5,3A6.5,6.5 0 0,1 16,9.5C16,11.11 15.41,12.59 14.44,13.73L14.71,14H15.5L20.5,19L19,20.5L14,15.5V14.71L13.73,14.44C12.59,15.41 11.11,16 9.5,16A6.5,6.5 0 0,1 3,9.5A6.5,6.5 0 0,1 9.5,3M9.5,5C7,5 5,7 5,9.5C5,12 7,14 9.5,14C12,14 14,12 14,9.5C14,7 12,5 9.5,5Z"/>
</svg>`;
  ICONS["delete"] = `<svg viewBox="0 0 24 24">
  <path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z"/>
</svg>`;
  ICONS["rewind"] = `<svg viewBox="0 0 24 24">
  <path d="M11.5,12L20,18V6M11,18V6L2.5,12L11,18Z"/>
</svg>`;
  ICONS["cancel"] = `<svg viewBox="0 0 24 24">
  <path d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12,4A8,8 0 0,0 4,12C4,13.85 4.63,15.55 5.68,16.91L16.91,5.68C15.55,4.63 13.85,4 12,4M12,20A8,8 0 0,0 20,12C20,10.15 19.37,8.45 18.32,7.09L7.09,18.32C8.45,19.37 10.15,20 12,20Z"/>
</svg>`;
  ICONS["settings"] = `<svg viewBox="0 0 24 24">
  <path d="M12,15.5A3.5,3.5 0 0,1 8.5,12A3.5,3.5 0 0,1 12,8.5A3.5,3.5 0 0,1 15.5,12A3.5,3.5 0 0,1 12,15.5M19.43,12.97C19.47,12.65 19.5,12.33 19.5,12C19.5,11.67 19.47,11.34 19.43,11L21.54,9.37C21.73,9.22 21.78,8.95 21.66,8.73L19.66,5.27C19.54,5.05 19.27,4.96 19.05,5.05L16.56,6.05C16.04,5.66 15.5,5.32 14.87,5.07L14.5,2.42C14.46,2.18 14.25,2 14,2H10C9.75,2 9.54,2.18 9.5,2.42L9.13,5.07C8.5,5.32 7.96,5.66 7.44,6.05L4.95,5.05C4.73,4.96 4.46,5.05 4.34,5.27L2.34,8.73C2.21,8.95 2.27,9.22 2.46,9.37L4.57,11C4.53,11.34 4.5,11.67 4.5,12C4.5,12.33 4.53,12.65 4.57,12.97L2.46,14.63C2.27,14.78 2.21,15.05 2.34,15.27L4.34,18.73C4.46,18.95 4.73,19.03 4.95,18.95L7.44,17.94C7.96,18.34 8.5,18.68 9.13,18.93L9.5,21.58C9.54,21.82 9.75,22 10,22H14C14.25,22 14.46,21.82 14.5,21.58L14.87,18.93C15.5,18.67 16.04,18.34 16.56,17.94L19.05,18.95C19.27,19.03 19.54,18.95 19.66,18.73L21.66,15.27C21.78,15.05 21.73,14.78 21.54,14.63L19.43,12.97Z"/>
</svg>`;
  ICONS["pause"] = `<svg viewBox="0 0 24 24">
  <path d="M14,19H18V5H14M6,19H10V5H6V19Z"/>
</svg>`;
  ICONS["arrow-down-bold"] = `<svg viewBox="0 0 24 24">
  <path d="M9,4H15V12H19.84L12,19.84L4.16,12H9V4Z"/>
</svg>`;
  ICONS["filter-variant"] = `<svg viewBox="0 0 24 24">
  <path d="M6,13H18V11H6M3,6V8H21V6M10,18H14V16H10V18Z"/>
</svg>`;
  ICONS["volume-off"] = `<svg viewBox="0 0 24 24">
  <path d="M12,4L9.91,6.09L12,8.18M4.27,3L3,4.27L7.73,9H3V15H7L12,20V13.27L16.25,17.53C15.58,18.04 14.83,18.46 14,18.7V20.77C15.38,20.45 16.63,19.82 17.68,18.96L19.73,21L21,19.73L12,10.73M19,12C19,12.94 18.8,13.82 18.46,14.64L19.97,16.15C20.62,14.91 21,13.5 21,12C21,7.72 18,4.14 14,3.23V5.29C16.89,6.15 19,8.83 19,12M16.5,12C16.5,10.23 15.5,8.71 14,7.97V10.18L16.45,12.63C16.5,12.43 16.5,12.21 16.5,12Z"/>
</svg>`;
  ICONS["close"] = `<svg viewBox="0 0 24 24">
  <path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z"/>
</svg>`;
  ICONS["music"] = `<svg viewBox="0 0 24 24">
  <path d="M21,3V15.5A3.5,3.5 0 0,1 17.5,19A3.5,3.5 0 0,1 14,15.5A3.5,3.5 0 0,1 17.5,12C18.04,12 18.55,12.12 19,12.34V6.47L9,8.6V17.5A3.5,3.5 0 0,1 5.5,21A3.5,3.5 0 0,1 2,17.5A3.5,3.5 0 0,1 5.5,14C6.04,14 6.55,14.12 7,14.34V6L21,3Z"/>
</svg>`;
  ICONS["repeat"] = `<svg viewBox="0 0 24 24">
  <path d="M17,17H7V14L3,18L7,22V19H19V13H17M7,7H17V10L21,6L17,2V5H5V11H7V7Z"/>
</svg>`;
  ICONS["arrow-up-bold"] = `<svg viewBox="0 0 24 24">
  <path d="M15,20H9V12H4.16L12,4.16L19.84,12H15V20Z"/>
</svg>`;
  ICONS["keyboard-backspace"] = `<svg viewBox="0 0 24 24">
  <path d="M21,11H6.83L10.41,7.41L9,6L3,12L9,18L10.41,16.58L6.83,13H21V11Z"/>
</svg>`;
  ICONS["play"] = `<svg viewBox="0 0 24 24">
  <path d="M8,5.14V19.14L19,12.14L8,5.14Z"/>
</svg>`;
  ICONS["plus"] = `<svg viewBox="0 0 24 24">
  <path d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z"/>
</svg>`;
  ICONS["content-save"] = `<svg viewBox="0 0 24 24">
  <path d="M15,9H5V5H15M12,19A3,3 0 0,1 9,16A3,3 0 0,1 12,13A3,3 0 0,1 15,16A3,3 0 0,1 12,19M17,3H5C3.89,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V7L17,3Z"/>
</svg>`;
  ICONS["library-music"] = `<svg viewBox="0 0 24 24">
  <path d="M4,6H2V20A2,2 0 0,0 4,22H18V20H4M18,7H15V12.5A2.5,2.5 0 0,1 12.5,15A2.5,2.5 0 0,1 10,12.5A2.5,2.5 0 0,1 12.5,10C13.07,10 13.58,10.19 14,10.5V5H18M20,2H8A2,2 0 0,0 6,4V16A2,2 0 0,0 8,18H20A2,2 0 0,0 22,16V4A2,2 0 0,0 20,2Z"/>
</svg>`;
  ICONS["fast-forward"] = `<svg viewBox="0 0 24 24">
  <path d="M13,6V18L21.5,12M4,18L12.5,12L4,6V18Z"/>
</svg>`;
  ICONS["volume-high"] = `<svg viewBox="0 0 24 24">
  <path d="M14,3.23V5.29C16.89,6.15 19,8.83 19,12C19,15.17 16.89,17.84 14,18.7V20.77C18,19.86 21,16.28 21,12C21,7.72 18,4.14 14,3.23M16.5,12C16.5,10.23 15.5,8.71 14,7.97V16C15.5,15.29 16.5,13.76 16.5,12M3,9V15H7L12,20V4L7,9H3Z"/>
</svg>`;
  ICONS["chevron-double-right"] = `<svg viewBox="0 0 24 24">
  <path d="M5.59,7.41L7,6L13,12L7,18L5.59,16.59L10.17,12L5.59,7.41M11.59,7.41L13,6L19,12L13,18L11.59,16.59L16.17,12L11.59,7.41Z"/>
</svg>`;
  ICONS["album"] = `<svg viewBox="0 0 24 24">
  <path d="M12,11A1,1 0 0,0 11,12A1,1 0 0,0 12,13A1,1 0 0,0 13,12A1,1 0 0,0 12,11M12,16.5C9.5,16.5 7.5,14.5 7.5,12C7.5,9.5 9.5,7.5 12,7.5C14.5,7.5 16.5,9.5 16.5,12C16.5,14.5 14.5,16.5 12,16.5M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z"/>
</svg>`;
  ICONS["minus_unused"] = `<svg viewBox="0 0 24 24">
  <path d="M19,13H5V11H19V13Z"/>
</svg>`;
  var icons_default = ICONS;

  // app/js/html.ts
  function node(name, attrs, content, parent) {
    let n = document.createElement(name);
    Object.assign(n, attrs);
    if (attrs && attrs.title) {
      n.setAttribute("aria-label", attrs.title);
    }
    content && text(content, n);
    parent && parent.append(n);
    return n;
  }
  function icon(type, parent) {
    let str = icons_default[type];
    if (!str) {
      console.error("Bad icon type '%s'", type);
      return node("span", {}, "\u203D");
    }
    let tmp = node("div");
    tmp.innerHTML = str;
    let s = tmp.querySelector("svg");
    if (!s) {
      throw new Error(`Bad icon source for type '${type}'`);
    }
    s.classList.add("icon");
    s.classList.add(`icon-${type}`);
    parent && parent.append(s);
    return s;
  }
  function button(attrs, content, parent) {
    let result = node("button", attrs, content, parent);
    if (attrs && attrs.icon) {
      let i = icon(attrs.icon);
      result.insertBefore(i, result.firstChild);
    }
    return result;
  }
  function clear(node2) {
    while (node2.firstChild) {
      node2.firstChild.remove();
    }
    return node2;
  }
  function text(txt, parent) {
    let n = document.createTextNode(txt);
    parent && parent.append(n);
    return n;
  }

  // app/js/selection.ts
  var Selection = class {
    constructor() {
      this.commands = new Commands();
      this.items = [];
      this.hide();
    }
    configure(items, mode, commands) {
      this.mode = mode;
      let allCommands = [];
      if (mode == "multi") {
        allCommands.push({
          cb: () => items.forEach((item) => this.add(item)),
          label: "Select all",
          icon: "checkbox-marked-outline"
        });
      }
      allCommands.push(...commands);
      allCommands.push({
        cb: () => this.clear(),
        icon: "cancel",
        label: "Cancel",
        className: "last"
      });
      let buttons = allCommands.map((command) => {
        let button2 = buildButton(command);
        button2.addEventListener("click", (_) => {
          const arg = mode == "single" ? this.items[0] : this.items;
          command.cb(arg);
        });
        return button2;
      });
      this.commands.innerHTML = "";
      this.commands.append(...buttons);
      items.forEach((item) => {
        item.onclick = () => this.toggle(item);
      });
      this.clear();
    }
    clear() {
      while (this.items.length) {
        this.remove(this.items[0]);
      }
    }
    toggle(node2) {
      if (this.items.includes(node2)) {
        this.remove(node2);
      } else {
        this.add(node2);
      }
    }
    add(node2) {
      if (this.items.includes(node2)) {
        return;
      }
      const length = this.items.length;
      this.items.push(node2);
      node2.classList.add("selected");
      if (this.mode == "single" && length > 0) {
        this.remove(this.items[0]);
      }
      if (length == 0) {
        this.show();
      }
    }
    remove(node2) {
      const index = this.items.indexOf(node2);
      this.items.splice(index, 1);
      node2.classList.remove("selected");
      if (this.items.length == 0) {
        this.hide();
      }
    }
    show() {
      this.commands.hidden = false;
    }
    hide() {
      this.commands.hidden = true;
    }
  };
  function buildButton(command) {
    const button2 = button({ icon: command.icon });
    if (command.className) {
      button2.className = command.className;
    }
    node("span", {}, command.label, button2);
    return button2;
  }
  var Commands = class extends HTMLElement {
  };
  customElements.define("cyp-commands", Commands);

  // app/js/conf.ts
  var artSize = 96 * (window.devicePixelRatio || 1);
  var ytPath = "_youtube";
  var ytLimit = 3;
  function setYtLimit(limit) {
    ytLimit = limit;
  }
  function setYtPath(path) {
    ytPath = path;
  }

  // app/js/elements/app.ts
  function initIcons() {
    [...document.querySelectorAll("[data-icon]")].forEach((node2) => {
      node2.dataset.icon.split(" ").forEach((name) => {
        let icon2 = icon(name);
        node2.prepend(icon2);
      });
    });
  }
  var App = class extends HTMLElement {
    constructor() {
      super();
      initIcons();
    }
    static get observedAttributes() {
      return ["component"];
    }
    async connectedCallback() {
      await waitForChildren(this);
      window.addEventListener("hashchange", (e) => this.onHashChange());
      this.onHashChange();
      await loadSettings();
      await this.connect();
      this.dispatchEvent(new CustomEvent("load"));
      this.initMediaHandler();
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
    get component() {
      return this.getAttribute("component") || "";
    }
    set component(component) {
      this.setAttribute("component", component);
    }
    createSelection() {
      let selection = new Selection();
      this.querySelector("footer").append(selection.commands);
      return selection;
    }
    onHashChange() {
      const component = location.hash.substring(1) || "queue";
      if (component != this.component) {
        this.component = component;
      }
    }
    onChange(changed) {
      this.dispatchEvent(new CustomEvent("idle-change", { detail: changed }));
    }
    async onClose(e) {
      await sleep(3e3);
      this.connect();
    }
    async connect() {
      const attempts = 3;
      for (let i = 0; i < attempts; i++) {
        try {
          let mpd = await MPD.connect();
          mpd.onChange = (changed) => this.onChange(changed);
          mpd.onClose = (e) => this.onClose(e);
          this.mpd = mpd;
          return;
        } catch (e) {
          await sleep(500);
        }
      }
      alert(`Failed to connect to MPD after ${attempts} attempts. Please reload the page to try again.`);
    }
    initMediaHandler() {
      if (!("mediaSession" in navigator)) {
        console.log("mediaSession is not supported");
        return;
      }
      const audio = node("audio", { loop: true }, "", this);
      node("source", { src: "https://raw.githubusercontent.com/anars/blank-audio/master/10-seconds-of-silence.mp3" }, "", audio);
      window.addEventListener("click", () => {
        audio.play();
      }, { once: true });
      navigator.mediaSession.metadata = new MediaMetadata({
        title: "Control Your Player"
      });
      navigator.mediaSession.setActionHandler("play", () => {
        this.mpd.command("play");
        audio.play();
      });
      navigator.mediaSession.setActionHandler("pause", () => {
        this.mpd.command("pause 1");
        audio.pause();
      });
      navigator.mediaSession.setActionHandler("previoustrack", () => {
        this.mpd.command("previous");
        audio.play();
      });
      navigator.mediaSession.setActionHandler("nexttrack", () => {
        this.mpd.command("next");
        audio.play();
      });
    }
  };
  customElements.define("cyp-app", App);
  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  function waitForChildren(app) {
    const children = [...app.querySelectorAll("*")];
    const names = children.map((node2) => node2.nodeName.toLowerCase()).filter((name) => name.startsWith("cyp-"));
    const unique = new Set(names);
    const promises = [...unique].map((name) => customElements.whenDefined(name));
    return Promise.all(promises);
  }
  async function loadSettings() {
    const response = await fetch("settings");
    const settings = await response.json();
    if (settings.youtubeDir) {
      setYtPath(settings.youtubeDir);
    }
  }

  // app/js/component.ts
  var Component = class extends HTMLElement {
    connectedCallback() {
      const { app } = this;
      app.addEventListener("load", (_) => this.onAppLoad());
      app.addEventListener("component-change", (_) => {
        const component = app.component;
        const isThis = this.nodeName.toLowerCase() == `cyp-${component}`;
        this.onComponentChange(component, isThis);
      });
    }
    get app() {
      return this.closest("cyp-app");
    }
    get mpd() {
      return this.app.mpd;
    }
    onAppLoad() {
    }
    onComponentChange(component, isThis) {
    }
  };

  // app/js/elements/menu.ts
  var Menu = class extends Component {
    constructor() {
      super(...arguments);
      this.tabs = Array.from(this.querySelectorAll("[data-for]"));
    }
    connectedCallback() {
      super.connectedCallback();
      this.tabs.forEach((tab) => {
        tab.addEventListener("click", (_) => this.app.setAttribute("component", tab.dataset.for));
      });
    }
    onAppLoad() {
      this.app.addEventListener("queue-length-change", (e) => {
        this.querySelector(".queue-length").textContent = `(${e.detail})`;
      });
    }
    onComponentChange(component) {
      this.tabs.forEach((tab) => {
        tab.classList.toggle("active", tab.dataset.for == component);
      });
    }
  };
  customElements.define("cyp-menu", Menu);

  // app/js/art.ts
  var cache = {};
  var MIME = "image/jpeg";
  var STORAGE_PREFIX = `art-${artSize}`;
  function store(key, data) {
    localStorage.setItem(`${STORAGE_PREFIX}-${key}`, data);
  }
  function load(key) {
    return localStorage.getItem(`${STORAGE_PREFIX}-${key}`);
  }
  async function bytesToImage(bytes) {
    const blob = new Blob([bytes]);
    const src = URL.createObjectURL(blob);
    const image = node("img", { src });
    return new Promise((resolve) => {
      image.onload = () => resolve(image);
    });
  }
  function resize(image) {
    while (Math.min(image.width, image.height) >= 2 * artSize) {
      let tmp = node("canvas", { width: image.width / 2, height: image.height / 2 });
      tmp.getContext("2d").drawImage(image, 0, 0, tmp.width, tmp.height);
      image = tmp;
    }
    const canvas = node("canvas", { width: artSize, height: artSize });
    canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas;
  }
  async function get(mpd, artist, album, songUrl) {
    const key = `${artist}-${album}`;
    if (key in cache) {
      return cache[key];
    }
    const loaded = load(key);
    if (loaded) {
      cache[key] = loaded;
      return loaded;
    }
    if (!songUrl) {
      return null;
    }
    let resolve;
    const promise = new Promise((res) => resolve = res);
    cache[key] = promise;
    const data = await mpd.albumArt(songUrl);
    if (data) {
      const bytes = new Uint8Array(data);
      const image = await bytesToImage(bytes);
      const url = resize(image).toDataURL(MIME);
      store(key, url);
      cache[key] = url;
      resolve(url);
    } else {
      cache[key] = null;
    }
    return cache[key];
  }

  // app/js/format.ts
  var SEPARATOR = " \xB7 ";
  function time(sec) {
    sec = Math.round(sec);
    let m = Math.floor(sec / 60);
    let s = sec % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }
  function subtitle(data, options = { duration: true }) {
    let tokens = [];
    if (data.Artist) {
      tokens.push(data.Artist);
    } else if (data.AlbumArtist) {
      tokens.push(data.AlbumArtist);
    }
    data.Album && tokens.push(data.Album);
    options.duration && data.duration && tokens.push(time(Number(data.duration)));
    return tokens.join(SEPARATOR);
  }
  function fileName(file) {
    return file.split("/").pop() || "";
  }

  // app/js/elements/player.ts
  var ELAPSED_PERIOD = 500;
  var Player = class extends Component {
    constructor() {
      super();
      this.current = {
        song: {},
        elapsed: 0,
        at: 0,
        volume: 0
      };
      this.toggleVolume = 0;
      const DOM = {};
      const all = this.querySelectorAll("[class]");
      [...all].forEach((node2) => DOM[node2.className] = node2);
      DOM.progress = DOM.timeline.querySelector("x-range");
      DOM.volume = DOM.volume.querySelector("x-range");
      this.DOM = DOM;
    }
    handleEvent(e) {
      switch (e.type) {
        case "idle-change":
          let hasOptions = e.detail.includes("options");
          let hasPlayer = e.detail.includes("player");
          let hasMixer = e.detail.includes("mixer");
          (hasOptions || hasPlayer || hasMixer) && this.updateStatus();
          hasPlayer && this.updateCurrent();
          break;
      }
    }
    onAppLoad() {
      this.addEvents();
      this.updateStatus();
      this.updateCurrent();
      this.app.addEventListener("idle-change", this);
      setInterval(() => this.updateElapsed(), ELAPSED_PERIOD);
    }
    async updateStatus() {
      const { current, mpd } = this;
      const data = await mpd.status();
      this.updateFlags(data);
      this.updateVolume(data);
      current.elapsed = Number(data.elapsed || 0);
      current.at = performance.now();
    }
    async updateCurrent() {
      const { current, mpd, DOM } = this;
      const data = await mpd.currentSong();
      if (data.file != current.song.file) {
        if (data.file) {
          DOM.title.textContent = data.Title || fileName(data.file);
          DOM.subtitle.textContent = subtitle(data, { duration: false });
          let duration = Number(data.duration);
          DOM.duration.textContent = time(duration);
          DOM.progress.max = String(duration);
          DOM.progress.disabled = false;
        } else {
          DOM.title.textContent = "";
          DOM.subtitle.textContent = "";
          DOM.progress.value = "0";
          DOM.progress.disabled = true;
        }
        this.dispatchSongChange(data);
      }
      let artistNew = data.Artist || data.AlbumArtist || "";
      let artistOld = current.song["Artist"] || current.song["AlbumArtist"];
      let albumNew = data["Album"];
      let albumOld = current.song["Album"];
      Object.assign(current.song, data);
      if (artistNew != artistOld || albumNew != albumOld) {
        clear(DOM.art);
        let src = await get(mpd, artistNew, data.Album || "", data.file);
        if (src) {
          node("img", { src }, "", DOM.art);
        } else {
          icon("music", DOM.art);
        }
      }
    }
    updateElapsed() {
      const { current, DOM } = this;
      let elapsed = 0;
      if (current.song["file"]) {
        elapsed = current.elapsed;
        if (this.dataset.state == "play") {
          elapsed += (performance.now() - current.at) / 1e3;
        }
      }
      let progress = DOM.progress;
      progress.value = String(elapsed);
      DOM.elapsed.textContent = time(elapsed);
      this.app.style.setProperty("--progress", String(elapsed / Number(progress.max)));
    }
    updateFlags(data) {
      let flags = [];
      if (data.random == "1") {
        flags.push("random");
      }
      if (data.repeat == "1") {
        flags.push("repeat");
      }
      if (data.volume === "0") {
        flags.push("mute");
      }
      this.dataset.flags = flags.join(" ");
      this.dataset.state = data["state"];
    }
    updateVolume(data) {
      const { current, DOM } = this;
      if ("volume" in data) {
        let volume = Number(data.volume);
        DOM.mute.disabled = false;
        DOM.volume.disabled = false;
        DOM.volume.value = String(volume);
        if (volume == 0 && current.volume > 0) {
          this.toggleVolume = current.volume;
        }
        if (volume > 0 && current.volume == 0) {
          this.toggleVolume = 0;
        }
        current.volume = volume;
      } else {
        DOM.mute.disabled = true;
        DOM.volume.disabled = true;
        DOM.volume.value = String(50);
      }
    }
    addEvents() {
      const { current, mpd, DOM } = this;
      DOM.play.addEventListener("click", (_) => mpd.command("play"));
      DOM.pause.addEventListener("click", (_) => mpd.command("pause 1"));
      DOM.prev.addEventListener("click", (_) => mpd.command("previous"));
      DOM.next.addEventListener("click", (_) => mpd.command("next"));
      DOM.random.addEventListener("click", (_) => {
        let isRandom = this.dataset.flags.split(" ").includes("random");
        mpd.command(`random ${isRandom ? "0" : "1"}`);
      });
      DOM.repeat.addEventListener("click", (_) => {
        let isRepeat = this.dataset.flags.split(" ").includes("repeat");
        mpd.command(`repeat ${isRepeat ? "0" : "1"}`);
      });
      DOM.progress.addEventListener("input", (e) => {
        let elapsed = e.target.valueAsNumber;
        current.elapsed = elapsed;
        current.at = performance.now();
        mpd.command(`seekcur ${elapsed}`);
      });
      DOM.volume.addEventListener("input", (e) => mpd.command(`setvol ${e.target.valueAsNumber}`));
      DOM.mute.addEventListener("click", () => mpd.command(`setvol ${this.toggleVolume}`));
    }
    dispatchSongChange(detail) {
      const e = new CustomEvent("song-change", { detail });
      this.app.dispatchEvent(e);
    }
  };
  customElements.define("cyp-player", Player);

  // app/js/item.ts
  var Item = class extends HTMLElement {
    addButton(icon2, cb) {
      button({ icon: icon2 }, "", this).addEventListener("click", (e) => {
        e.stopPropagation();
        cb();
      });
    }
    buildTitle(title) {
      return node("span", { className: "title" }, title, this);
    }
    matchPrefix(prefix2) {
      return (this.textContent || "").match(/\w+/g).some((word) => word.toLowerCase().startsWith(prefix2));
    }
  };

  // app/js/elements/song.ts
  var Song = class extends Item {
    constructor(data) {
      super();
      this.data = data;
      icon("music", this);
      icon("play", this);
      const block = node("div", { className: "multiline" }, "", this);
      const title = this.buildSongTitle(data);
      block.append(title);
      if (data.Track) {
        const track = node("span", { className: "track" }, data.Track.padStart(2, "0"));
        title.insertBefore(text(" "), title.firstChild);
        title.insertBefore(track, title.firstChild);
      }
      if (data.Title) {
        const subtitle2 = subtitle(data);
        node("span", { className: "subtitle" }, subtitle2, block);
      }
      this.playing = false;
    }
    get file() {
      return this.data.file;
    }
    get songId() {
      return this.data.Id;
    }
    set playing(playing) {
      this.classList.toggle("playing", playing);
    }
    buildSongTitle(data) {
      return super.buildTitle(data.Title || fileName(this.file));
    }
  };
  customElements.define("cyp-song", Song);

  // app/js/elements/queue.ts
  function generateMoveCommands(items, diff, parent) {
    let all = [...parent.children].filter((node2) => node2 instanceof Song);
    const COMPARE = (a, b) => all.indexOf(a) - all.indexOf(b);
    return items.sort(COMPARE).map((item) => {
      let index = all.indexOf(item) + diff;
      if (index < 0 || index >= all.length) {
        return null;
      }
      return `moveid ${item.songId} ${index}`;
    }).filter((command) => command);
  }
  var Queue = class extends Component {
    handleEvent(e) {
      switch (e.type) {
        case "song-change":
          this.currentId = e.detail["Id"];
          this.updateCurrent();
          break;
        case "idle-change":
          e.detail.includes("playlist") && this.sync();
          break;
      }
    }
    onAppLoad() {
      const { app } = this;
      this.selection = app.createSelection();
      app.addEventListener("idle-change", this);
      app.addEventListener("song-change", this);
      this.sync();
    }
    onComponentChange(c, isThis) {
      this.hidden = !isThis;
    }
    async sync() {
      let songs = await this.mpd.listQueue();
      this.buildSongs(songs);
      let e = new CustomEvent("queue-length-change", { detail: songs.length });
      this.app.dispatchEvent(e);
    }
    updateCurrent() {
      let songs = [...this.children].filter((node2) => node2 instanceof Song);
      songs.forEach((node2) => {
        node2.playing = node2.songId == this.currentId;
      });
    }
    buildSongs(songs) {
      clear(this);
      let nodes = songs.map((song) => {
        let node2 = new Song(song);
        node2.addButton("play", async () => {
          await this.mpd.command(`playid ${node2.songId}`);
        });
        return node2;
      });
      this.append(...nodes);
      this.configureSelection(nodes);
      this.updateCurrent();
    }
    configureSelection(nodes) {
      const { mpd, selection } = this;
      let commands = [{
        cb: (items) => {
          const commands2 = generateMoveCommands(items, -1, this);
          mpd.command(commands2);
        },
        label: "Up",
        icon: "arrow-up-bold"
      }, {
        cb: (items) => {
          const commands2 = generateMoveCommands(items, 1, this);
          mpd.command(commands2.reverse());
        },
        label: "Down",
        icon: "arrow-down-bold"
      }, {
        cb: async (items) => {
          let name = prompt("Save selected songs as a playlist?", "name");
          if (name === null) {
            return;
          }
          name = escape(name);
          try {
            await mpd.command(`rm "${name}"`);
          } catch (e) {
          }
          const commands2 = items.map((item) => {
            return `playlistadd "${name}" "${escape(item.file)}"`;
          });
          await mpd.command(commands2);
          selection.clear();
        },
        label: "Save",
        icon: "content-save"
      }, {
        cb: async (items) => {
          if (!confirm(`Remove these ${items.length} songs from the queue?`)) {
            return;
          }
          const commands2 = items.map((item) => `deleteid ${item.songId}`);
          mpd.command(commands2);
        },
        label: "Remove",
        icon: "delete"
      }];
      selection.configure(nodes, "multi", commands);
    }
  };
  customElements.define("cyp-queue", Queue);

  // app/js/elements/playlist.ts
  var Playlist = class extends Item {
    constructor(name) {
      super();
      this.name = name;
      icon("playlist-music", this);
      this.buildTitle(name);
    }
  };
  customElements.define("cyp-playlist", Playlist);

  // app/js/elements/back.ts
  var Back = class extends Item {
    constructor(title) {
      super();
      this.append(icon("keyboard-backspace"));
      this.buildTitle(title);
    }
  };
  customElements.define("cyp-back", Back);

  // app/js/elements/playlists.ts
  var Playlists = class extends Component {
    handleEvent(e) {
      switch (e.type) {
        case "idle-change":
          e.detail.includes("stored_playlist") && this.sync();
          break;
      }
    }
    onAppLoad() {
      const { app } = this;
      this.selection = app.createSelection();
      app.addEventListener("idle-change", this);
      this.sync();
    }
    onComponentChange(c, isThis) {
      this.hidden = !isThis;
    }
    async sync() {
      if (this.current) {
        let songs = await this.mpd.listPlaylistItems(this.current);
        this.buildSongs(songs);
      } else {
        let lists = await this.mpd.listPlaylists();
        this.buildLists(lists);
      }
    }
    buildSongs(songs) {
      clear(this);
      this.buildBack();
      let nodes = songs.map((song) => new Song(song));
      this.append(...nodes);
      this.configureSelectionSongs(nodes);
    }
    buildLists(lists) {
      clear(this);
      let playlists = lists.map((name) => {
        let node2 = new Playlist(name);
        node2.addButton("chevron-double-right", () => {
          this.current = name;
          this.sync();
        });
        return node2;
      });
      this.append(...playlists);
      this.configureSelectionLists(playlists);
    }
    buildBack() {
      const node2 = new Back("Playlists");
      this.append(node2);
      node2.onclick = () => {
        this.current = void 0;
        this.sync();
      };
    }
    configureSelectionSongs(songs) {
      const { selection, mpd } = this;
      let commands = [{
        cb: async (items) => {
          await mpd.command(["clear", ...items.map(createAddCommand), "play"]);
          selection.clear();
        },
        label: "Play",
        icon: "play"
      }, {
        cb: async (items) => {
          await mpd.command(items.map(createAddCommand));
          selection.clear();
        },
        label: "Enqueue",
        icon: "plus"
      }];
      selection.configure(songs, "multi", commands);
    }
    configureSelectionLists(lists) {
      const { mpd, selection } = this;
      let commands = [{
        cb: async (item) => {
          const name = item.name;
          const commands2 = ["clear", `load "${escape(name)}"`, "play"];
          await mpd.command(commands2);
          selection.clear();
        },
        label: "Play",
        icon: "play"
      }, {
        cb: async (item) => {
          const name = item.name;
          await mpd.command(`load "${escape(name)}"`);
          selection.clear();
        },
        label: "Enqueue",
        icon: "plus"
      }, {
        cb: async (item) => {
          const name = item.name;
          if (!confirm(`Really delete playlist '${name}'?`)) {
            return;
          }
          await mpd.command(`rm "${escape(name)}"`);
        },
        label: "Delete",
        icon: "delete"
      }];
      selection.configure(lists, "single", commands);
    }
  };
  customElements.define("cyp-playlists", Playlists);
  function createAddCommand(node2) {
    return `add "${escape(node2.file)}"`;
  }

  // app/js/elements/settings.ts
  var prefix = "cyp";
  function loadFromStorage(key) {
    return localStorage.getItem(`${prefix}-${key}`);
  }
  function saveToStorage(key, value) {
    return localStorage.setItem(`${prefix}-${key}`, String(value));
  }
  var Settings = class extends Component {
    constructor() {
      super(...arguments);
      this.inputs = {
        theme: this.querySelector("[name=theme]"),
        ytLimit: this.querySelector("[name=yt-limit]"),
        color: [...this.querySelectorAll("[name=color]")]
      };
    }
    onAppLoad() {
      const { inputs } = this;
      let mo = new MutationObserver((mrs) => {
        mrs.forEach((mr) => this._onAppAttributeChange(mr));
      });
      mo.observe(this.app, { attributes: true });
      inputs.theme.addEventListener("change", (e) => this.setTheme(e.target.value));
      inputs.ytLimit.addEventListener("change", (e) => this.setYtLimit(Number(e.target.value)));
      inputs.color.forEach((input) => {
        input.addEventListener("click", (e) => this.setColor(e.target.value));
      });
      const theme = loadFromStorage("theme");
      theme ? this.app.setAttribute("theme", theme) : this.syncTheme();
      const color = loadFromStorage("color");
      color ? this.app.setAttribute("color", color) : this.syncColor();
      const ytLimit2 = loadFromStorage("ytLimit") || ytLimit;
      this.setYtLimit(Number(ytLimit2));
    }
    _onAppAttributeChange(mr) {
      if (mr.attributeName == "theme") {
        this.syncTheme();
      }
      if (mr.attributeName == "color") {
        this.syncColor();
      }
    }
    syncTheme() {
      this.inputs.theme.value = this.app.getAttribute("theme");
    }
    syncColor() {
      this.inputs.color.forEach((input) => {
        input.checked = input.value == this.app.getAttribute("color");
        input.parentElement.style.color = input.value;
      });
    }
    setTheme(theme) {
      saveToStorage("theme", theme);
      this.app.setAttribute("theme", theme);
    }
    setColor(color) {
      saveToStorage("color", color);
      this.app.setAttribute("color", color);
    }
    setYtLimit(ytLimit2) {
      saveToStorage("ytLimit", ytLimit2);
      setYtLimit(ytLimit2);
    }
    onComponentChange(c, isThis) {
      this.hidden = !isThis;
    }
  };
  customElements.define("cyp-settings", Settings);

  // app/js/elements/search.ts
  var Search = class extends HTMLElement {
    constructor() {
      super();
      const form = node("form", {}, "", this);
      node("input", { type: "text" }, "", form);
      button({ icon: "magnify" }, "", form);
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        this.onSubmit();
      });
    }
    get value() {
      return this.input.value.trim();
    }
    set value(value) {
      this.input.value = value;
    }
    get input() {
      return this.querySelector("input");
    }
    onSubmit() {
    }
    focus() {
      this.input.focus();
    }
    pending(pending) {
      this.classList.toggle("pending", pending);
    }
  };
  customElements.define("cyp-search", Search);

  // app/js/elements/yt-result.ts
  var YtResult = class extends Item {
    constructor(title) {
      super();
      this.append(icon("magnify"));
      this.buildTitle(title);
    }
  };
  customElements.define("cyp-yt-result", YtResult);

  // app/js/elements/yt.ts
  var YT = class extends Component {
    constructor() {
      super();
      this.search = new Search();
      this.search.onSubmit = () => {
        let query = this.search.value;
        query && this.doSearch(query);
      };
      this.clear();
    }
    clear() {
      clear(this);
      this.append(this.search);
    }
    async doSearch(query) {
      this.clear();
      this.search.pending(true);
      let url = `youtube?q=${encodeURIComponent(query)}&limit=${encodeURIComponent(ytLimit)}`;
      let response = await fetch(url);
      if (response.status == 200) {
        let results = await response.json();
        results.forEach((result) => {
          let node2 = new YtResult(result.title);
          this.append(node2);
          node2.addButton("download", () => this.download(result.id));
        });
      } else {
        let text2 = await response.text();
        alert(text2);
      }
      this.search.pending(false);
    }
    async download(id) {
      this.clear();
      let pre = node("pre", {}, "", this);
      this.search.pending(true);
      let body = new URLSearchParams();
      body.set("id", id);
      let response = await fetch("youtube", { method: "POST", body });
      let reader = response.body.getReader();
      while (true) {
        let { done, value } = await reader.read();
        if (done) {
          break;
        }
        pre.textContent += decodeChunk(value);
        pre.scrollTop = pre.scrollHeight;
      }
      reader.releaseLock();
      this.search.pending(false);
      if (response.status == 200) {
        this.mpd.command(`update ${escape(ytPath)}`);
      }
    }
    onComponentChange(c, isThis) {
      const wasHidden = this.hidden;
      this.hidden = !isThis;
      if (!wasHidden && isThis) {
        this.clear();
      }
    }
  };
  customElements.define("cyp-yt", YT);
  var decoder = new TextDecoder("utf-8");
  function decodeChunk(byteArray) {
    return decoder.decode(byteArray).replace(/\u000d/g, "\n");
  }

  // app/js/elements/tag.ts
  var ICONS2 = {
    "AlbumArtist": "artist",
    "Album": "album",
    "Genre": "music"
  };
  var Tag = class extends Item {
    constructor(type, value, filter) {
      super();
      this.type = type;
      this.value = value;
      this.filter = filter;
      node("span", { className: "art" }, "", this);
      this.buildTitle(value);
    }
    createChildFilter() {
      return Object.assign({ [this.type]: this.value }, this.filter);
    }
    async fillArt(mpd) {
      const parent = this.firstChild;
      const filter = this.createChildFilter();
      let artist = filter["AlbumArtist"];
      let album = filter["Album"];
      let src = null;
      if (artist && album) {
        src = await get(mpd, artist, album);
        if (!src) {
          let songs = await mpd.listSongs(filter, [0, 1]);
          if (songs.length) {
            src = await get(mpd, artist, album, songs[0]["file"]);
          }
        }
      }
      if (src) {
        node("img", { src }, "", parent);
      } else {
        const icon2 = ICONS2[this.type];
        icon(icon2, parent);
      }
    }
  };
  customElements.define("cyp-tag", Tag);

  // app/js/elements/path.ts
  var Path = class extends Item {
    constructor(data) {
      super();
      this.data = data;
      this.isDirectory = "directory" in this.data;
      this.append(icon(this.isDirectory ? "folder" : "music"));
      this.buildTitle(fileName(this.file));
    }
    get file() {
      return this.isDirectory ? this.data.directory : this.data.file;
    }
  };
  customElements.define("cyp-path", Path);

  // app/js/elements/filter.ts
  var SELECTOR = ["cyp-tag", "cyp-path", "cyp-song"].join(", ");
  var Filter = class extends HTMLElement {
    constructor() {
      super();
      node("input", { type: "text" }, "", this);
      icon("filter-variant", this);
      this.input.addEventListener("input", (e) => this.apply());
    }
    get value() {
      return this.input.value.trim();
    }
    set value(value) {
      this.input.value = value;
    }
    get input() {
      return this.querySelector("input");
    }
    apply() {
      let value = this.value.toLowerCase();
      let all = [...this.parentNode.querySelectorAll(SELECTOR)];
      all.forEach((item) => item.hidden = !item.matchPrefix(value));
    }
  };
  customElements.define("cyp-filter", Filter);

  // app/js/elements/library.ts
  var TAGS = {
    "Album": "Albums",
    "AlbumArtist": "Artists",
    "Genre": "Genres"
  };
  var Library = class extends Component {
    constructor() {
      super();
      this.search = new Search();
      this.filter = new Filter();
      this.stateStack = [];
      this.search.onSubmit = () => {
        let query = this.search.value;
        if (query.length < 3) {
          return;
        }
        this.doSearch(query);
      };
    }
    popState() {
      this.selection.clear();
      this.stateStack.pop();
      if (this.stateStack.length > 0) {
        let state = this.stateStack[this.stateStack.length - 1];
        this.showState(state);
      } else {
        this.showRoot();
      }
    }
    onAppLoad() {
      this.selection = this.app.createSelection();
      this.showRoot();
    }
    onComponentChange(c, isThis) {
      const wasHidden = this.hidden;
      this.hidden = !isThis;
      if (!wasHidden && isThis) {
        this.showRoot();
      }
    }
    showRoot() {
      this.stateStack = [];
      clear(this);
      const nav = node("nav", {}, "", this);
      button({ icon: "artist" }, "Artists and albums", nav).addEventListener("click", (_) => this.pushState({ type: "tags", tag: "AlbumArtist" }));
      button({ icon: "music" }, "Genres", nav).addEventListener("click", (_) => this.pushState({ type: "tags", tag: "Genre" }));
      button({ icon: "folder" }, "Files and directories", nav).addEventListener("click", (_) => this.pushState({ type: "path", path: "" }));
      button({ icon: "magnify" }, "Search", nav).addEventListener("click", (_) => this.pushState({ type: "search" }));
    }
    pushState(state) {
      this.selection.clear();
      this.stateStack.push(state);
      this.showState(state);
    }
    showState(state) {
      switch (state.type) {
        case "tags":
          this.listTags(state.tag, state.filter);
          break;
        case "songs":
          this.listSongs(state.filter);
          break;
        case "path":
          this.listPath(state.path);
          break;
        case "search":
          this.showSearch(state.query);
          break;
      }
    }
    async listTags(tag, filter = {}) {
      const values = (await this.mpd.listTags(tag, filter)).filter(nonempty);
      clear(this);
      if ("AlbumArtist" in filter || "Genre" in filter) {
        this.buildBack();
      }
      values.length > 0 && this.addFilter();
      let nodes = values.map((value) => this.buildTag(tag, value, filter));
      this.append(...nodes);
      let albumNodes = nodes.filter((node2) => node2.type == "Album");
      this.configureSelection(albumNodes);
    }
    async listPath(path) {
      let paths = await this.mpd.listPath(path);
      clear(this);
      path && this.buildBack();
      paths["directory"].length + paths["file"].length > 0 && this.addFilter();
      let items = [...paths["directory"], ...paths["file"]];
      let nodes = items.map((data) => {
        let node2 = new Path(data);
        if (data.directory) {
          const path2 = data.directory;
          node2.addButton("chevron-double-right", () => this.pushState({ type: "path", path: path2 }));
        }
        return node2;
      });
      this.append(...nodes);
      this.configureSelection(nodes);
    }
    async listSongs(filter) {
      const songs = await this.mpd.listSongs(filter);
      clear(this);
      this.buildBack();
      songs.length > 0 && this.addFilter();
      let nodes = songs.map((song) => new Song(song));
      this.append(...nodes);
      this.configureSelection(nodes);
    }
    showSearch(query = "") {
      clear(this);
      this.append(this.search);
      this.search.value = query;
      this.search.focus();
      query && this.search.onSubmit();
    }
    async doSearch(query) {
      this.stateStack[this.stateStack.length - 1] = {
        type: "search",
        query
      };
      clear(this);
      this.append(this.search);
      this.search.pending(true);
      const songs1 = await this.mpd.searchSongs({ "AlbumArtist": query });
      const songs2 = await this.mpd.searchSongs({ "Album": query });
      const songs3 = await this.mpd.searchSongs({ "Title": query });
      this.search.pending(false);
      let nodes1 = this.aggregateSearch(songs1, "AlbumArtist");
      let nodes2 = this.aggregateSearch(songs2, "Album");
      let nodes3 = songs3.map((song) => new Song(song));
      this.append(...nodes1, ...nodes2, ...nodes3);
      let selectableNodes = [...nodes2, ...nodes3];
      this.configureSelection(selectableNodes);
    }
    aggregateSearch(songs, tag) {
      let results = /* @__PURE__ */ new Map();
      let nodes = [];
      songs.forEach((song) => {
        let filter = {}, value;
        const artist = song.AlbumArtist || song.Artist;
        if (tag == "Album") {
          value = song[tag];
          if (artist) {
            filter["AlbumArtist"] = artist;
          }
        }
        if (tag == "AlbumArtist") {
          value = artist;
        }
        results.set(value, filter);
      });
      results.forEach((filter, value) => {
        let node2 = this.buildTag(tag, value, filter);
        nodes.push(node2);
      });
      return nodes;
    }
    buildTag(tag, value, filter) {
      let node2 = new Tag(tag, value, filter);
      node2.fillArt(this.mpd);
      switch (tag) {
        case "AlbumArtist":
        case "Genre":
          node2.onclick = () => this.pushState({ type: "tags", tag: "Album", filter: node2.createChildFilter() });
          break;
        case "Album":
          node2.addButton("chevron-double-right", () => this.pushState({ type: "songs", filter: node2.createChildFilter() }));
          break;
      }
      return node2;
    }
    buildBack() {
      const backState = this.stateStack[this.stateStack.length - 2];
      let title = "";
      switch (backState.type) {
        case "path":
          title = "..";
          break;
        case "search":
          title = "Search";
          break;
        case "tags":
          title = TAGS[backState.tag];
          break;
      }
      const node2 = new Back(title);
      this.append(node2);
      node2.onclick = () => this.popState();
    }
    addFilter() {
      this.append(this.filter);
      this.filter.value = "";
    }
    configureSelection(items) {
      const { selection, mpd } = this;
      let commands = [{
        cb: async (items2) => {
          const commands2 = ["clear", ...items2.map(createEnqueueCommand), "play"];
          await mpd.command(commands2);
          selection.clear();
        },
        label: "Play",
        icon: "play"
      }, {
        cb: async (items2) => {
          const commands2 = items2.map(createEnqueueCommand);
          await mpd.command(commands2);
          selection.clear();
        },
        label: "Enqueue",
        icon: "plus"
      }];
      selection.configure(items, "multi", commands);
    }
  };
  customElements.define("cyp-library", Library);
  function nonempty(str) {
    return str.length > 0;
  }
  function createEnqueueCommand(node2) {
    if (node2 instanceof Song || node2 instanceof Path) {
      return `add "${escape(node2.file)}"`;
    } else if (node2 instanceof Tag) {
      return [
        "findadd",
        serializeFilter(node2.createChildFilter())
        // `sort ${SORT}` // MPD >= 0.22, not yet released
      ].join(" ");
    } else {
      throw new Error(`Cannot create enqueue command for "${node2.nodeName}"`);
    }
  }
})();
