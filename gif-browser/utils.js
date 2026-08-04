export function normalize(value) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function debounce(fn, ms) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

export function preventScrollChaining(element, axis = "y") {
  element.addEventListener(
    "wheel",
    (event) => {
      const delta = axis === "y" ? event.deltaY : event.deltaX || event.deltaY;
      if (delta === 0) return;

      if (axis === "y") {
        const { scrollTop, scrollHeight, clientHeight } = element;
        const maxScroll = scrollHeight - clientHeight;
        if (maxScroll <= 0) {
          event.preventDefault();
          return;
        }

        const atTop = scrollTop <= 0;
        const atBottom = scrollTop >= maxScroll - 1;
        if ((delta < 0 && atTop) || (delta > 0 && atBottom)) {
          event.preventDefault();
        }
        return;
      }

      const { scrollLeft, scrollWidth, clientWidth } = element;
      const maxScroll = scrollWidth - clientWidth;
      if (maxScroll <= 0) {
        event.preventDefault();
        return;
      }

      const atStart = scrollLeft <= 0;
      const atEnd = scrollLeft >= maxScroll - 1;
      if ((delta < 0 && atStart) || (delta > 0 && atEnd)) {
        event.preventDefault();
      }
    },
    { passive: false }
  );
}
