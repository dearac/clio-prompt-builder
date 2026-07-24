import { app } from "../../scripts/app.js";

const NODE_CLASS = "ClioPromptBuilder";
const ORDER_WIDGET = "dropdown_order";
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
  if (Array.isArray(widget?.options?.values)) return widget.options.values;
  if (Array.isArray(widget?.options)) return widget.options;
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
    }
    .clio-reset-order {
      border: 1px solid var(--border-color, #666);
      border-radius: 5px;
      background: var(--comfy-input-bg, #222);
      color: inherit;
      padding: 3px 7px;
      cursor: pointer;
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
    .clio-order-select {
      box-sizing: border-box;
      min-width: 0;
      width: 100%;
      border: 1px solid var(--border-color, #666);
      border-radius: 5px;
      background: var(--comfy-input-bg, #181818);
      color: inherit;
      padding: 4px 6px;
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
  help.textContent = "Drag rows to set dropdown and prompt priority.";

  const reset = document.createElement("button");
  reset.type = "button";
  reset.className = "clio-reset-order";
  reset.textContent = "Reset order";

  toolbar.append(help, reset);

  const list = document.createElement("div");
  list.className = "clio-order-list";
  root.append(toolbar, list);

  let draggedRow = null;

  function saveOrder() {
    const order = [...list.querySelectorAll(".clio-order-row")].map((row) => row.dataset.name);
    setWidgetValue(orderWidget, JSON.stringify(order), node);
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

    const select = document.createElement("select");
    select.className = "clio-order-select";
    select.setAttribute("aria-label", label.textContent);

    for (const value of comboValues(widget)) {
      const option = document.createElement("option");
      option.value = String(value);
      option.textContent = String(value);
      select.appendChild(option);
    }
    select.value = String(widget.value ?? "");

    select.addEventListener("change", () => {
      setWidgetValue(widget, select.value, node);
    });

    row.addEventListener("dragstart", (event) => {
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

    row.append(handle, label, select);
    return row;
  }

  function render(orderValue = orderWidget.value) {
    const order = parseOrder(orderValue);
    list.replaceChildren();
    for (const name of order) {
      const row = makeRow(name);
      if (row) list.appendChild(row);
    }
  }

  reset.addEventListener("click", () => {
    render(JSON.stringify(DEFAULT_ORDER));
    saveOrder();
  });

  const domWidget = node.addDOMWidget("clio_dropdown_editor", "CLIO_ORDER_EDITOR", root, {
    serialize: false,
    hideOnZoom: false,
  });
  domWidget.computeSize = (width) => [width, Math.max(380, DEFAULT_ORDER.length * 42 + 52)];

  node.__clioEditorReady = true;
  node.__clioRefreshEditor = () => {
    for (const name of DEFAULT_ORDER) {
      const row = list.querySelector(`[data-name="${name}"]`);
      const select = row?.querySelector("select");
      const widget = dropdownWidgets[name];
      if (select && widget) select.value = String(widget.value ?? "");
    }
    render(orderWidget.value);
    node.setSize?.([Math.max(node.size?.[0] || 360, 390), node.computeSize?.()[1] || 520]);
    node.setDirtyCanvas?.(true, true);
  };

  render();
  requestAnimationFrame(() => node.__clioRefreshEditor());
}

app.registerExtension({
  name: "dearac.ClioPromptBuilder.DragDropOrder",

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
