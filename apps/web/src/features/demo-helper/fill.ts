// Filling a React-controlled form from outside it. Setting `input.value` directly is invisible to
// React (it tracks the last value it wrote), so the value goes through the element's native setter
// and then the same `input`/`change` events a keystroke fires: react-hook-form runs its onChange,
// so its state and (after a failed submit) its validation update exactly as if the shopper typed.
//
// Forms opt in with `data-demo-form="<name>"`; fields are found by their `name` attribute, which
// react-hook-form's `register()` already sets. No component has to expose anything else.

type Field = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

export type DemoForm = 'register' | 'login' | 'checkout-details';

export function demoForm(name: DemoForm): HTMLElement | null {
  return document.querySelector<HTMLElement>(`[data-demo-form="${name}"]`);
}

export function setFieldValue(field: Field, value: string): void {
  const descriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(field), 'value');
  if (descriptor?.set) descriptor.set.call(field, value);
  else field.value = value;
  field.dispatchEvent(new Event('input', { bubbles: true }));
  field.dispatchEvent(new Event('change', { bubbles: true }));
}

/** Fills the named fields that exist in the form; returns how many it filled. */
export function fillForm(name: DemoForm, values: Record<string, string>): number {
  const form = demoForm(name);
  if (!form) return 0;
  let filled = 0;
  for (const [field, value] of Object.entries(values)) {
    const el = form.querySelector<Field>(`[name="${field}"]`);
    if (!el) continue;
    setFieldValue(el, value);
    filled++;
  }
  return filled;
}

export function fieldValue(name: DemoForm, field: string): string {
  return demoForm(name)?.querySelector<Field>(`[name="${field}"]`)?.value ?? '';
}

/** Moves focus to the first match inside the form (or the page); the browser scrolls if needed. */
export function focusIn(selector: string, name?: DemoForm): void {
  const root: ParentNode = (name && demoForm(name)) || document;
  root.querySelector<HTMLElement>(selector)?.focus();
}
