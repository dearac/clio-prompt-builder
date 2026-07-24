import { app } from "../../scripts/app.js";

const NODE_CLASS = "ClioPromptBuilder";
const ORDER_WIDGET = "dropdown_order";
const NONE_VALUE = "✨ none";
const DEFAULT_ORDER = [
  "subject",
  "body",
  "skin_type",
  "hair_type",
  "hair_style",
  "eyes",
  "mouth",
  "clothing_style",
  "view_style",
  "position",
  "environment",
  "style",
];

const LABELS = {
  subject: "Subject",
  body: "Body",
  skin_type: "Skin type",
  hair_type: "Hair type",
  hair_style: "Hair style",
  eyes: "Eyes",
  mouth: "Mouth",
  clothing_style: "Clothing style",
  view_style: "View style",
  position: "Position / pose",
  environment: "Environment",
  style: "Visual style",
};

function parseOrder(value) {
  let requested = [];
  try {
    requested = JSON.parse(value || "[]");
  } catch (_error) {
    requested = [];
  }
  if (!Array.isArray(requested)) requested = [];

  const valid = [];
  for (const name of requested) {
    if (DEFAULT_ORDER.includes(name) && !valid.includes(name)) valid.push(name);
  }
  for (const name of DEFAULT_ORDER) {
    if (!valid.includes(name)) valid.push(name);
  }
  return valid;
}

function comboValues(widget) {
  if (Array.isArray(widget?.options?.values)) return widget.options.values.map(String);
  if (Array.isArray(widget?.options)) return widget.options.map(String);
  return [];
}

function hideNativeWidget(widget) {
  if (!widget || widget.__clioHidden) return;
  widget.__clioHidden = true;
  widget.__clioOriginalComputeSize = widget.computeSize;
  widget.__clioOriginalDraw = widget.draw;
  widget.computeSize = () => [0, -4];
  widget.draw = () => {};
}

function setWidgetValue(widget, value, node) {
  widget.value = value;
  widget.callback?.(value, app.canvas, node, app.canvas?.graph_mouse);
  node.setDirtyCanvas?.(true, true);
  app.graph?.setDirtyCanvas?.(true, true);
}

function installStyles() {
  if (document.getElementById("clio-prompt-builder-v2-styles")) return;
  const style = document.createElement("style");
  style.id = "clio-prompt-builder-v2-styles";
  style.textContent = `
    .clio-v2-editor {
      box-sizing: border-box;
      width: 100%;
      padding: 6px;
      color: var(--input-text, #ddd);
      font-family: Arial, sans-serif;
      font-size: 12px;
      user-select: none;
    }
    .clio-v2-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      margin-bottom: 6px;
    }
    .clio-v2-help {
      flex: 1;
      opacity: 0.75;
      line-height: 1.25;
    }
    .clio-v2-buttons {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      gap: 5px;
    }
    .clio-v2-button {
      border: 1px solid var(--border-color, #666);
      border-radius: 5px;
      background: var(--comfy-input-bg, #222);
      color: inherit;
      padding: 3px 7px;
      cursor: pointer;
      white-space: nowrap;
    }
    .clio-v2-button:hover { filter: brightness(1.15); }
    .clio-v2-list {
      display: flex;
      flex-direction: column;
      gap: 5px;
    }
    .clio-v2-row {
      display: grid;
      grid-template-columns: 24px minmax(90px, 0.9fr) minmax(145px, 1.5fr);
      align-items: center;
      gap: 6px;
      padding: 5px;
      border: 1px solid var(--border-color, #555);
      border-radius: 6px;
      background: var(--comfy-input-bg, #222);
      position: relative;
    }
    .clio-v2-row.dragging { opacity: 0.45; }
    .clio-v2-row.drop-before { border-top: 3px solid var(--p-button-text-primary, #6aa9ff); }
    .clio-v2-handle {
      cursor: grab;
      text-align: center;
      font-size: 17px;
      line-height: 1;
      opacity: 0.8;
    }
    .clio-v2-handle:active { cursor: grabbing; }
    .clio-v2-label {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .clio-v2-search-wrap {
      position: relative;
      min-width: 0;
      width: 100%;
    }
    .clio-v2-search-input {
      box-sizing: border-box;
      width: 100%;
      min-width: 0;
      border: 1px solid var(--border-color, #666);
      border-radius: 5px;
      background: var(--comfy-input-bg, #181818);
      color: inherit;
      padding: 4px 24px 4px 6px;
    }
    .clio-v2-search-input:focus { outline: 1px solid var(--p-button-text-primary, #6aa9ff); }
    .clio-v2-arrow {
      position: absolute;
      right: 7px;
      top: 50%;
      transform: translateY(-50%);
      pointer-events: none;
      opacity: 0.75;
    }
    .clio-v2-menu {
      position: absolute;
      z-index: 99999;
      left: 0;
      right: 0;
      top: calc(100% + 3px);
      max-height: 240px;
      overflow-y: auto;
      border: 1px solid var(--border-color, #666);
      border-radius: 5px;
      background: var(--comfy-menu-bg, #181818);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.35);
      display: none;
    }
    .clio-v2-menu.open { display: block; }
    .clio-v2-option {
      box-sizing: border-box;
      width: 100%;
      border: 0;
      background: transparent;
      color: inherit;
      text-align: left;
      padding: 6px 8px;
      cursor: pointer;
      font-size: 12px;
    }
    .clio-v2-option:hover,
    .clio-v2-option.active { background: var(--comfy-input-bg, #333); }
    .clio-v2-empty { padding: 7px 8px; opacity: 0.65; }
  `;
  document.head.appendChild(style);
}

function buildEditor(node) {
  if (node.__clioV2Ready) return;

  const widgetsByName = Object.fromEntries((node.widgets || []).map((widget) => [widget.name, widget]));
  const orderWidget = widgetsByName[ORDER_WIDGET];
  if (!orderWidget) return;

  const dropdownWidgets = {};
  for (const name of DEFAULT_ORDER) {
    const widget = widgetsByName[name];
    if (widget) {
      dropdownWidgets[name] = widget;
      hideNativeWidget(widget);
    }
  }
  hideNativeWidget(orderWidget);
  installStyles();

  const root = document.createElement("div");
  root.className = "clio-v2-editor";

  const toolbar = document.createElement("div");
  toolbar.className = "clio-v2-toolbar";

  const help = document.createElement("div");
  help.className = "clio-v2-help";
  help.textContent = "Search selections or drag rows to set prompt priority.";

  const buttons = document.createElement("div");
  buttons.className = "clio-v2-buttons";

  const resetAll = document.createElement("button");
  resetAll.type = "button";
  resetAll.className = "clio-v2-button";
  resetAll.textContent = "Reset all to none";

  const resetOrder = document.createElement("button");
  resetOrder.type = "button";
  resetOrder.className = "clio-v2-button";
  resetOrder.textContent = "Reset order";

  buttons.append(resetAll, resetOrder);
  toolbar.append(help, buttons);

  const list = document.createElement("div");
  list.className = "clio-v2-list";
  root.append(toolbar, list);

  let draggedRow = null;
  let openMenu = null;

  function closeMenu() {
    openMenu?.classList.remove("open");
    openMenu = null;
  }

  function saveOrder() {
    const order = [...list.querySelectorAll(".clio-v2-row")].map((row) => row.dataset.name);
    setWidgetValue(orderWidget, JSON.stringify(order), node);
  }

  function makeSearch(widget, labelText) {
    const values = comboValues(widget);
    const wrap = document.createElement("div");
    wrap.className = "clio-v2-search-wrap";

    const input = document.createElement("input");
    input.type = "text";
    input.className = "clio-v2-search-input";
    input.setAttribute("aria-label", labelText);
    input.setAttribute("autocomplete", "off");
    input.value = String(widget.value ?? NONE_VALUE);

    const arrow = document.createElement("span");
    arrow.className = "clio-v2-arrow";
    arrow.textContent = "▾";

    const menu = document.createElement("div");
    menu.className = "clio-v2-menu";
    let filtered = [...values];
    let activeIndex = -1;

    function choose(value) {
      input.value = value;
      setWidgetValue(widget, value, node);
      closeMenu();
    }

    function renderMenu(query = "") {
      const normalized = query.trim().toLowerCase();
      filtered = values.filter((value) => value.toLowerCase().includes(normalized));
      activeIndex = -1;
      menu.replaceChildren();

      if (!filtered.length) {
        const empty = document.createElement("div");
        empty.className = "clio-v2-empty";
        empty.textContent = "No matches";
        menu.appendChild(empty);
        return;
      }

      for (const value of filtered) {
        const option = document.createElement("button");
        option.type = "button";
        option.className = "clio-v2-option";
        option.textContent = value;
        option.addEventListener("mousedown", (event) => {
          event.preventDefault();
          choose(value);
        });
        menu.appendChild(option);
      }
    }

    function open(query = "") {
      if (openMenu && openMenu !== menu) closeMenu();
      renderMenu(query);
      menu.classList.add("open");
      openMenu = menu;
    }

    function updateActive() {
      const options = [...menu.querySelectorAll(".clio-v2-option")];
      options.forEach((option, index) => option.classList.toggle("active", index === activeIndex));
      options[activeIndex]?.scrollIntoView({ block: "nearest" });
    }

    input.addEventListener("focus", () => {
      input.select();
      open("");
    });
    input.addEventListener("input", () => open(input.value));
    input.addEventListener("keydown", (event) => {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        if (!menu.classList.contains("open")) open(input.value);
        activeIndex = Math.min(activeIndex + 1, filtered.length - 1);
        updateActive();
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        activeIndex = Math.max(activeIndex - 1, 0);
        updateActive();
      } else if (event.key === "Enter") {
        event.preventDefault();
        if (activeIndex >= 0 && filtered[activeIndex]) {
          choose(filtered[activeIndex]);
        } else {
          const exact = values.find((value) => value.toLowerCase() === input.value.trim().toLowerCase());
          if (exact) choose(exact);
        }
      } else if (event.key === "Escape") {
        closeMenu();
        input.value = String(widget.value ?? NONE_VALUE);
        input.blur();
      }
    });
    input.addEventListener("blur", () => {
      window.setTimeout(() => {
        if (!values.includes(input.value)) input.value = String(widget.value ?? NONE_VALUE);
        if (openMenu === menu) closeMenu();
      }, 120);
    });

    wrap.append(input, arrow, menu);
    return { wrap, input };
  }

  function makeRow(name) {
    const widget = dropdownWidgets[name];
    if (!widget) return null;

    const row = document.createElement("div");
    row.className = "clio-v2-row";
    row.dataset.name = name;
    row.draggable = true;

    const handle = document.createElement("span");
    handle.className = "clio-v2-handle";
    handle.textContent = "☰";
    handle.title = "Drag to reorder";

    const label = document.createElement("span");
    label.className = "clio-v2-label";
    label.textContent = LABELS[name] || name;
    label.title = label.textContent;

    const search = makeSearch(widget, label.textContent);
    row.__clioInput = search.input;

    row.addEventListener("dragstart", (event) => {
      if (event.target.closest(".clio-v2-search-wrap")) {
        event.preventDefault();
        return;
      }
      closeMenu();
      draggedRow = row;
      row.classList.add("dragging");
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", name);
    });
    row.addEventListener("dragover", (event) => {
      event.preventDefault();
      if (!draggedRow || draggedRow === row) return;
      row.classList.add("drop-before");
      event.dataTransfer.dropEffect = "move";
    });
    row.addEventListener("dragleave", () => row.classList.remove("drop-before"));
    row.addEventListener("drop", (event) => {
      event.preventDefault();
      row.classList.remove("drop-before");
      if (!draggedRow || draggedRow === row) return;
      const rect = row.getBoundingClientRect();
      const after = event.clientY > rect.top + rect.height / 2;
      list.insertBefore(draggedRow, after ? row.nextSibling : row);
      saveOrder();
    });
    row.addEventListener("dragend", () => {
      row.classList.remove("dragging");
      for (const item of list.children) item.classList.remove("drop-before");
      draggedRow = null;
      saveOrder();
    });

    row.append(handle, label, search.wrap);
    return row;
  }

  function render(orderValue = orderWidget.value) {
    closeMenu();
    list.replaceChildren();
    for (const name of parseOrder(orderValue)) {
      const row = makeRow(name);
      if (row) list.appendChild(row);
    }
  }

  resetAll.addEventListener("click", () => {
    closeMenu();
    for (const name of DEFAULT_ORDER) {
      const widget = dropdownWidgets[name];
      if (widget) setWidgetValue(widget, NONE_VALUE, node);
    }
    for (const row of list.querySelectorAll(".clio-v2-row")) {
      if (row.__clioInput) row.__clioInput.value = NONE_VALUE;
    }
  });

  resetOrder.addEventListener("click", () => {
    render(JSON.stringify(DEFAULT_ORDER));
    saveOrder();
  });

  document.addEventListener("mousedown", (event) => {
    if (!root.contains(event.target)) closeMenu();
  });

  const domWidget = node.addDOMWidget("clio_dropdown_editor", "CLIO_ORDER_EDITOR", root, {
    serialize: false,
    hideOnZoom: false,
  });
  domWidget.computeSize = (width) => [width, Math.max(440, DEFAULT_ORDER.length * 42 + 70)];

  node.__clioV2Ready = true;
  node.__clioV2Refresh = () => {
    render(orderWidget.value);
    node.setSize?.([Math.max(node.size?.[0] || 400, 430), node.computeSize?.()[1] || 590]);
    node.setDirtyCanvas?.(true, true);
  };

  render();
  requestAnimationFrame(() => node.__clioV2Refresh());
}

app.registerExtension({
  name: "dearac.ClioPromptBuilder.SearchDragDropV2",

  async nodeCreated(node) {
    if (node?.comfyClass !== NODE_CLASS) return;
    buildEditor(node);
  },

  loadedGraphNode(node) {
    if (node?.comfyClass !== NODE_CLASS) return;
    requestAnimationFrame(() => {
      buildEditor(node);
      node.__clioV2Refresh?.();
    });
  },
});
