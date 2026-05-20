const SHORTCUT_BLOCKING_LAYER_SELECTOR = [
  '[role="dialog"][data-state="open"]',
  '[role="alertdialog"][data-state="open"]',
  '[data-slot="dropdown-menu-content"][data-state="open"]',
].join(',')

export function isShortcutBlockingLayerOpen(): boolean {
  return document.querySelector(SHORTCUT_BLOCKING_LAYER_SELECTOR) !== null
}
