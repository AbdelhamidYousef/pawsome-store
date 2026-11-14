import { describe, expect, it } from 'vitest';

import { loadContentFile, loadHelpTranslations } from './content-translations.ts';
import { loadContent } from './content.ts';
import { pdpFor, sizeGuides } from './pdp.ts';
import { products } from './products.ts';
import { SEED_LANGS } from './translations.ts';

// Guards the content translation files themselves, no database: every English text the seed
// generates has a German and a French counterpart, and the structure (numbers, list items,
// paragraphs) survived the translation.
const files = { de: loadContentFile('de'), fr: loadContentFile('fr') };
const help = { de: loadHelpTranslations('de'), fr: loadHelpTranslations('fr') };
const english = loadContent();

describe('content translation files', () => {
  it('cover every spec label, spec value, FAQ, delivery note and size guide the seed generates', () => {
    for (const lang of SEED_LANGS) {
      const f = files[lang];
      const missing: string[] = [];
      for (const p of products) {
        const pdp = pdpFor(p);
        for (const s of pdp.specs) {
          if (!f.specLabels[s.label]) missing.push(`label ${s.label}`);
          if (!f.specValues[s.value]) missing.push(`value ${s.value}`);
        }
        for (const q of pdp.faqs) if (!f.faqs[q.question]) missing.push(`faq ${q.question}`);
        if (pdp.deliveryNote && !f.deliveryNotes[pdp.deliveryNote])
          missing.push(`note ${pdp.deliveryNote}`);
      }
      for (const g of sizeGuides) if (!f.sizeGuides[g.slug]) missing.push(`guide ${g.slug}`);
      expect([...new Set(missing)], lang).toEqual([]);
    }
  });

  it('has no unused entries (a typo in an English key would silently translate nothing)', () => {
    const labels = new Set<string>();
    const values = new Set<string>();
    const questions = new Set<string>();
    const notes = new Set<string>();
    for (const p of products) {
      const pdp = pdpFor(p);
      pdp.specs.forEach((s) => (labels.add(s.label), values.add(s.value)));
      pdp.faqs.forEach((q) => questions.add(q.question));
      if (pdp.deliveryNote) notes.add(pdp.deliveryNote);
    }
    for (const lang of SEED_LANGS) {
      const f = files[lang];
      expect(Object.keys(f.specLabels).filter((k) => !labels.has(k))).toEqual([]);
      expect(Object.keys(f.specValues).filter((k) => !values.has(k))).toEqual([]);
      expect(Object.keys(f.faqs).filter((k) => !questions.has(k))).toEqual([]);
      expect(Object.keys(f.deliveryNotes).filter((k) => !notes.has(k))).toEqual([]);
    }
  });

  it('keeps each size chart the same shape and the same numbers as English', () => {
    for (const lang of SEED_LANGS) {
      for (const g of sizeGuides) {
        const t = files[lang].sizeGuides[g.slug]!;
        expect(t.table.columns).toHaveLength(g.table.columns.length);
        expect(t.table.rows.map((r) => r.size)).toEqual(g.table.rows.map((r) => r.size));
        g.table.rows.forEach((row, i) => {
          const digits = (v: string[]) => v.join(' ').match(/\d+/g);
          expect(digits(t.table.rows[i]!.values), `${lang} ${g.slug} row ${i}`).toEqual(
            digits(row.values),
          );
        });
        const items = (md: string) => md.split('\n').filter((l) => /^\d+\. /.test(l)).length;
        expect(items(t.howtoMd)).toBe(items(g.howtoMd));
      }
    }
  });

  it('has a translated help article for every English one, with the same paragraph count', () => {
    for (const lang of SEED_LANGS) {
      expect(help[lang].map((h) => h.slug).sort(), lang).toEqual(
        english.help.map((h) => h.slug).sort(),
      );
      for (const h of help[lang]) {
        const en = english.help.find((e) => e.slug === h.slug)!;
        const paragraphs = (md: string) => md.split(/\n\s*\n/).length;
        expect(paragraphs(h.answerMd), `${lang} ${h.slug}`).toBe(paragraphs(en.answerMd));
        expect(h.question).not.toBe(en.question);
        expect(h.answerMd).not.toBe(en.answerMd);
      }
    }
  });

  it('has no German text identical to its French counterpart (over 12 characters)', () => {
    const same: string[] = [];
    const cmp = (kind: string, a: Record<string, string>, b: Record<string, string>) => {
      for (const [k, v] of Object.entries(a))
        if (v.length > 12 && v === b[k]) same.push(`${kind} ${k}`);
    };
    cmp('value', files.de.specValues, files.fr.specValues);
    cmp('note', files.de.deliveryNotes, files.fr.deliveryNotes);
    for (const h of help.de) {
      const f = help.fr.find((x) => x.slug === h.slug);
      if (f && f.answerMd === h.answerMd) same.push(`help ${h.slug}`);
    }
    expect(same).toEqual([]);
  });
});
