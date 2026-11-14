// The panel's state for this browser tab: open, folded to a pill, or closed. sessionStorage, so a
// closed panel stays closed while the visitor clicks around and comes back in a new tab. Storage
// can be missing or throw (private mode, blocked site data): then the panel simply starts open.

export type PanelState = 'open' | 'collapsed' | 'closed';

const KEY = 'pawsome.demo-helper';

export function readPanelState(): PanelState {
  try {
    const value = window.sessionStorage.getItem(KEY);
    return value === 'collapsed' || value === 'closed' ? value : 'open';
  } catch {
    return 'open';
  }
}

export function writePanelState(state: PanelState): void {
  try {
    window.sessionStorage.setItem(KEY, state);
  } catch {
    // Not remembered; the panel still does what was asked for this page view.
  }
}
