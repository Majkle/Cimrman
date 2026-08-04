import { normalize, preventScrollChaining } from "./utils.js";

export function createMultiSelect(container, { placeholder, ariaLabel, options, onChange }) {
  const selected = new Set();
  let allOptions = [...options];
  let open = false;

  const control = document.createElement("div");
  control.className = "multiselect__control";
  control.setAttribute("role", "combobox");
  control.setAttribute("aria-haspopup", "listbox");
  control.setAttribute("aria-expanded", "false");
  control.setAttribute("aria-label", ariaLabel);
  control.tabIndex = 0;

  const chips = document.createElement("div");
  chips.className = "multiselect__chips";

  const placeholderEl = document.createElement("span");
  placeholderEl.className = "multiselect__placeholder";
  placeholderEl.textContent = placeholder;

  const toggleBtn = document.createElement("button");
  toggleBtn.type = "button";
  toggleBtn.className = "multiselect__toggle";
  toggleBtn.setAttribute("aria-label", `Otevřít ${ariaLabel.toLowerCase()}`);

  const chevron = document.createElement("span");
  chevron.className = "multiselect__chevron";
  chevron.setAttribute("aria-hidden", "true");
  toggleBtn.appendChild(chevron);

  const dropdown = document.createElement("div");
  dropdown.className = "multiselect__dropdown";
  dropdown.hidden = true;

  const search = document.createElement("input");
  search.type = "search";
  search.className = "multiselect__search";
  search.placeholder = "Hledat...";
  search.setAttribute("aria-label", `${ariaLabel} — hledat`);

  const list = document.createElement("ul");
  list.className = "multiselect__list";
  list.setAttribute("role", "listbox");
  list.setAttribute("aria-multiselectable", "true");

  control.append(chips, toggleBtn);
  dropdown.append(search, list);
  container.append(control, dropdown);

  preventScrollChaining(list, "y");
  preventScrollChaining(chips, "x");

  function setOpen(next) {
    open = next;
    control.classList.toggle("open", open);
    control.setAttribute("aria-expanded", String(open));
    dropdown.hidden = !open;
    if (open) {
      search.value = "";
      renderList();
      search.focus();
    }
  }

  function toggleOption(value) {
    if (selected.has(value)) {
      selected.delete(value);
    } else {
      selected.add(value);
    }
    render();
    onChange?.();
  }

  function removeOption(value, event) {
    event.stopPropagation();
    selected.delete(value);
    render();
    onChange?.();
  }

  function renderChips() {
    chips.replaceChildren();
    if (selected.size === 0) {
      chips.appendChild(placeholderEl);
      return;
    }

    for (const value of selected) {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "multiselect__chip";
      chip.setAttribute("aria-label", `Odebrat ${value}`);
      chip.title = value;
      chip.addEventListener("click", (event) => removeOption(value, event));

      const label = document.createElement("span");
      label.className = "multiselect__chip-label";
      label.textContent = value;

      const removeIcon = document.createElement("span");
      removeIcon.className = "multiselect__chip-remove";
      removeIcon.setAttribute("aria-hidden", "true");
      removeIcon.textContent = "×";

      chip.append(label, removeIcon);
      chips.appendChild(chip);
    }
  }

  function renderList() {
    const query = normalize(search.value.trim());
    const visible = allOptions.filter((option) => !query || normalize(option).includes(query));

    list.replaceChildren();
    if (visible.length === 0) {
      const empty = document.createElement("div");
      empty.className = "multiselect__empty";
      empty.textContent = "Nic nenalezeno";
      list.appendChild(empty);
      return;
    }

    for (const option of visible) {
      const item = document.createElement("li");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "multiselect__option";
      btn.setAttribute("role", "option");
      btn.setAttribute("aria-selected", String(selected.has(option)));
      if (selected.has(option)) btn.classList.add("selected");

      const check = document.createElement("span");
      check.className = "multiselect__check";
      check.textContent = selected.has(option) ? "✓" : "";

      const label = document.createElement("span");
      label.textContent = option;

      btn.append(check, label);
      btn.addEventListener("click", () => toggleOption(option));
      item.appendChild(btn);
      list.appendChild(item);
    }
  }

  function render() {
    renderChips();
    if (open) renderList();
  }

  control.addEventListener("click", (event) => {
    if (event.target.closest(".multiselect__chip")) return;
    setOpen(!open);
  });

  control.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setOpen(!open);
    }
  });

  toggleBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    setOpen(!open);
  });

  search.addEventListener("input", renderList);
  search.addEventListener("click", (event) => event.stopPropagation());
  search.addEventListener("keydown", (event) => event.stopPropagation());
  dropdown.addEventListener("click", (event) => event.stopPropagation());

  document.addEventListener("click", (event) => {
    if (!container.contains(event.target)) setOpen(false);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && open) {
      setOpen(false);
      control.focus();
    }
  });

  render();

  return {
    getSelected: () => [...selected],
    setOptions(newOptions) {
      allOptions = [...newOptions];
      for (const value of [...selected]) {
        if (!allOptions.includes(value)) selected.delete(value);
      }
      render();
    },
  };
}
