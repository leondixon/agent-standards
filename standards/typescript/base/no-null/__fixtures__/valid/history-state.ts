export function goToHash(slug: string) {
  window.history.replaceState(null, '', `#${slug}`);
  window.history.pushState(null, '', `#${slug}`);
}
