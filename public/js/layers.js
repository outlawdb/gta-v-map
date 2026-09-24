export function renderStyleOptions(select, mapConfig) {
  for (const [key, style] of Object.entries(mapConfig.styles)) {
    const option = document.createElement("option");
    option.value = key;
    option.textContent = style.label;
    if (key === mapConfig.defaultStyle) option.selected = true;
    select.append(option);
  }
}

export function renderCategories(select, categories) {
  for (const category of categories) {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    select.append(option);
  }
}
