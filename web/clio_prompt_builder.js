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

function createStyles() {
  if (document.getElementById("clio-prompt-builder-styles")) return;
  const style = document.createElement("style");
  style.id = "clio-prompt-builder-styles";
  style.textContent = `
    .clio-order-editor {
      box-sizing: border-box;
      width: 100%;
      padding: 6px;
      color: var(--input-text, #ddd);
      font-family: Arial, sans-serif;
      font-size: 12px;
      user-select: none;
    }
    .clio-order-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      margin-bottom: 6px;
    }
    .clio-order-help {
      opacity: 0.75;
      line-height: 1.25;
      flex: 1;
    }
    .clio-toolbar-buttons {
      display: flex;
      gap: 5px;
      flex-wrap: wrap;
      justify-content: flex-end;
    }
    .clio-toolbar-button {
      border: 1px solid var(--border-color, #666);
      border-radius: 5px;
      background: var(--comfy-input-bg, #222);
      color: inherit;
      padding: 3px 7px;
      cursor: pointer;
      white-space: nowrap;
    }
    .clio-toolbar-button:hover {
      filter: brightness(1.15);
    }
    .clio-order-list {
      display: flex;
      flex-direction: column;
      gap: 5px;
    }
    .clio-order-row {
      display: grid;
      grid-template-columns: 24px minmax(88px, 0.9fr) minmax(130px, 1.4fr);
      align-items: center;
      gap: 6px;
      padding: 5px;
      border: 1px solid var(--border-color, #555);
      border-radius: 6px;
      background: var(--comfy-input-bg, #222);
      position: relative;
    }
    .clio-order-row.clio-dragging {
      opacity: 0.45;
    }
    .clio-order-row.clio-drop-before {
      border-top: 3px solid var(--p-button-text-primary, #6aa9ff);
    }
    .clio-drag-handle {
      cursor: grab;
      text-align: center;
      font-size: 17px;
      line-height: 1;
      opacity: 0.8;
    }
    .clio-drag-handle:active {
      cursor: grabbing;
    }
    .clio-order-label {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .clio-search-wrap {
      position: relative;
      min-width: 0;
      width: 100%;
    }
    .clio-search-input {
      box-sizing: border-box;
      min-width: 0;
      width: 100%;
      border: 1px solid var(--border-color, #666);
      border-radius: 5px;
      background: var(--comfy-input-bg, #181818);
      color: inherit;
      padding: 4px 24px 4px 6px;
    }
    .clio-search-input:focus {
      outline: 1px solid var(--p-button-text-primary, #6aa9ff);
    }
    .clio-search-arrow {
      position: absolute;
      right: 7px;
      top: 50%;
      transform: translateY(-50%);
      pointer-events: none;
      opacity: 0.75;
    }
    .clio-search-menu {
      position: absolute;
      z-index: 99999;
      left: 0;
      right: 0;
      top: calc(100% + 3px);
      max-height: 220px;
      overflow-y: auto;
      border: 1px solid var(--border-color, #666);
      border-radius: 5px;
      background: var(--comfy-menu-bg, #181818);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.35);
      display: none;
    }
    .clio-search-menu.clio-open {
      display: block;
    }
    .clio-search-option {
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
    .clio-search-option:hover,
    .clio-search-option.clio-active {
      background: var(--comfy-input-bg, #333);
    }
    .clio-search-empty {
      padding: 7px 8px;
      opacity: 0.65;
    }
  `;
  document.head.appendChild(style);
}

function buildEditor(node) {
  if (node.__clioEditorReady) return;

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

  createStyles();

  const root = document.createElement("div");
  root.className = "clio-order-editor";

  const toolbar = document.createElement("div");
  toolbar.className = "clio-order-toolbar";

  const help = document.createElement("div");
  help.className = "clio-order-help";
  help.textContent = "Search selections or drag rows to set prompt priority.";

  const buttonGroup = document.createElement("div");
  buttonGroup.className = "clio-toolbar-buttons";

  const resetAll = document.createElement("button");
  resetAll.type = "button";
  resetAll.className = "clio-toolbar-button";
  resetAll.textContent = "Reset all to none";

  const resetOrder = document.createElement("button");
  resetOrder.type = "button";
  resetOrder.className = "clio-toolbar-button";
  resetOrder.textContent = "Reset order";

  buttonGroup.append(resetAll, resetOrder);
  toolbar.append(help, buttonGroup);

  const list = document.createElement("div");
  list.className = "clio-order-list";
  root.append(toolbar, list);

  let draggedRow = null;
  let openMenu = null;

  function closeOpenMenu() {
    openMenu?.classList.remove("clio-open");
    openMenu = null;
  }

  function saveOrder() {
    const order = [...list.querySelectorAll(".clio-order-row")].map((row) => row.dataset.name);
    setWidgetValue(orderWidget, JSON.stringify(order), node);
  }

  function makeSearchControl(name, widget, labelText) {
    const values = comboValues(widget);
    const wrap = document.createElement("div");
    wrap.className = "clio-search-wrap";

    const input = document.createElement("input");
    input.type = "text";
    input.className = "clio-search-input";
    input.setAttribute("aria-label", labelText);
    input.setAttribute("autocomplete", "off");
    input.value = String(widget.value ?? NONE_VALUE);

    const arrow = document.createElement("span");
    arrow.className = "clio-search-arrow";
    arrow.textContent = "▾";

    const menu = document.createElement("div");
    menu.className = "clio-search-menu";

    let filtered = [...values];
    let activeIndex = -1;

    function selectValue(value) {
      input.value = value;
      setWidgetValue(widget, value, node);
      closeOpenMenu();
    }

    function renderMenu(query = "") {
      const normalized = query.trim().toLowerCase();
      filtered = values.filter((value) => value.toLowerCase().includes(normalized));
      activeIndex = -1;
      menu.replaceChildren();

      if (!filtered.length) {
        const empty = document.createElement("div");
        empty.className = "clio-search-empty";
        empty.textContent = "No matches";
        menu.appendChild(empty);
        return;
      }

      for (const value of filtered) {
        const option = document.createElement("button");
        option.type = "button";
        option.className = "clio-search-option";
        option.textContent = value;
        option.dataset.value = value;
        option.addEventListener("mousedown", (event) => {
          event.preventDefault();
          selectValue(value);
        });
        menu.appendChild(option);
      }
    }

    function openWithQuery(query) {
      if (openMenu && openMenu !== menu) closeOpenMenu();
      renderMenu(query);
      menu.classList.add("clio-open");
      openMenu = menu;
    }

    function updateActive() {
      const options = [...menu.querySelectorAll(".clio-search-option")];
      options.forEach((option, index) => option.classList.toggle("clio-active", index === activeIndex));
      options[activeIndex]?.scrollIntoView({ block: "nearest" });
    }

    input.addEventListener("focus", () => {
      input.select();
      openWithQuery("");
    });

    input.addEventListener("input", () => {
      openWithQuery(input.value);
    });

    input.addEventListener("keydown", (event) => {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        if (!menu.classList.contains("clio-open")) openWithQuery(input.value);
        activeIndex = Math.min(activeIndex + 1, filtered.length - 1);
        updateActive();
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        activeIndex = Math.max(activeIndex - 1, 0);
        updateActive();
      } else if (event.key === "Enter") {
        event.preventDefault();
        if (activeIndex >= 0 && filtered[activeIndex]) {
          selectValue(filtered[activeIndex]);
        } else {
          const exact = values.find((value) => value.toLowerCase() === input.value.trim().toLowerCase());
          if (exact) selectValue(exact);
        }
      } else if (event.key === "Escape") {
        closeOpenMenu();
        input.value = String(widget.value ?? NONE_VALUE);
        input.blur();
      }
    });

    input.addEventListener("blur", () => {
      window.setTimeout(() => {
        if (!values.includes(input.value)) input.value = String(widget.value ?? NONE_VALUE);
        if (openMenu === menu) closeOpenMenu();
      }, 120);
    });

    wrap.append(input, arrow, menu);
    return { wrap, input };
  }

  function makeRow(name) {
    const widget = dropdownWidgets[name];
    if (!widget) return null;

    const row = document.createElement("div");
    row.className = "clio-order-row";
    row.dataset.name = name;
    row.draggable = true;

    const handle = document.createElement("span");
    handle.className = "clio-drag-handle";
    handle.textContent = "☰";
    handle.title = "Drag to reorder";

    const label = document.createElement("span");
    label.className = "clio-order-label";
    label.textContent = LABELS[name] || name;
    label.title = label.textContent;

    const search = makeSearchControl(name, widget, label.textContent);
    row.__clioInput = search.input;

    row.addEventListener("dragstart", (event) => {
      if (event.target.closest(".clio-search-wrap")) {
        event.preventDefault();
        return;
      }
      closeOpenMenu();
      draggedRow = row;
      row.classList.add("clio-dragging");
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", name);
    });

    row.addEventListener("dragover", (event) => {
      event.preventDefault();
      if (!draggedRow || draggedRow === row) return;
      row.classList.add("clio-drop-before");
      event.dataTransfer.dropEffect = "move";
    });

    row.addEventListener("dragleave", () => {
      row.classList.remove("clio-drop-before");
    });

    row.addEventListener("drop", (event) => {
      event.preventDefault();
      row.classList.remove("clio-drop-before");
      if (!draggedRow || draggedRow === row) return;

      const rect = row.getBoundingClientRect();
      const insertAfter = event.clientY > rect.top + rect.height / 2;
      list.insertBefore(draggedRow, insertAfter ? row.nextSibling : row);
      saveOrder();
    });

    row.addEventListener("dragend", () => {
      row.classList.remove("clio-dragging");
      for (const item of list.children) item.classList.remove("clio-drop-before");
      draggedRow = null;
      saveOrder();
    });

    row.append(handle, label, search.wrap);
    return row;
  }

  function render(orderValue = orderWidget.value) {
    closeOpenMenu();
    const order = parseOrder(orderValue);
    list.replaceChildren();
    for (const name of order) {
      const row = makeRow(name);
      if (row) list.appendChild(row);
    }
  }

  resetAll.addEventListener("click", () => {
    closeOpenMenu();
    for (const name of DEFAULT_ORDER) {
      const widget = dropdownWidgets[name];
      if (widget) setWidgetValue(widget, NONE_VALUE, node);
    }
    for (const row of list.querySelectorAll(".clio-order-row")) {
      if (row.__clioInput) row.__clioInput.value = NONE_VALUE;
    }
  });

  resetOrder.addEventListener("click", () => {
    render(JSON.stringify(DEFAULT_ORDER));
    saveOrder();
  });

  document.addEventListener("mousedown", (event) => {
    if (!root.contains(event.target)) closeOpenMenu();
  });

  const domWidget = node.addDOMWidget("clio_dropdown_editor", "CLIO_ORDER_EDITOR", root, {
    serialize: false,
    hideOnZoom: false,
  });
  domWidget.computeSize = (width) => [width, Math.max(400, DEFAULT_ORDER.length * 42 + 68)];

  node.__clioEditorReady = true;
  node.__clioRefreshEditor = () => {
    render(orderWidget.value);
    node.setSize?.([Math.max(node.size?.[0] || 390, 420), node.computeSize?.()[1] || 550]);
    node.setDirtyCanvas?.(true, true);
  };

  render();
  requestAnimationFrame(() => node.__clioRefreshEditor());
}

app.registerExtension({
  name: "dearac.ClioPromptBuilder.SearchDragDrop",

  async nodeCreated(node) {
    if (node?.comfyClass !== NODE_CLASS) return;
    buildEditor(node);
  },

  loadedGraphNode(node) {
    if (node?.comfyClass !== NODE_CLASS) return;
    requestAnimationFrame(() => {
      buildEditor(node);
      node.__clioRefreshEditor?.();
    });
  },
});
