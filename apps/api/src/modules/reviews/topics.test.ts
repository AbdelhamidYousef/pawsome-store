import { describe, expect, it } from 'vitest';

import { extractTopics, topicsOfText } from './topics.ts';

describe('topicsOfText', () => {
  it('lowercases, strips punctuation and stopwords, and builds adjacent pairs', () => {
    const t = topicsOfText("Love the memory foam! It's SO soft, and my dog's happy.");
    expect(t).toContain('memory');
    expect(t).toContain('foam');
    expect(t).toContain('memory foam');
    expect(t).toContain('soft');
    expect(t).not.toContain('the');
    expect(t).not.toContain('and');
    expect(t).not.toContain('foam it');
  });

  it('skips filler words that say nothing about the product', () => {
    const t = topicsOfText(
      'Light enough to carry. Picked it up every day, looks great, works well.',
    );
    for (const w of ['enough', 'picked', 'every', 'looks', 'great', 'well', 'day']) {
      expect(t).not.toContain(w);
    }
    expect(t).toContain('carry');
    expect(t).toContain('light');
  });

  it('never builds a pair across a sentence break', () => {
    const t = topicsOfText('Great foam. Soft cover.');
    expect(t).not.toContain('foam soft');
    expect(t).toContain('soft cover');
  });
});

describe('extractTopics', () => {
  const reviews = (n: number, text: string) => Array.from({ length: n }, () => text);

  it('keeps only topics found in at least three different reviews', () => {
    const topics = extractTopics([...reviews(2, 'washable cover'), ...reviews(3, 'sturdy zipper')]);
    const names = topics.map((t) => t.topic);
    expect(names).toContain('sturdy zipper');
    expect(names).not.toContain('washable cover');
  });

  it('counts a word once per review, however often it is repeated', () => {
    const texts = ['soft soft soft soft', 'soft', 'cozy'];
    expect(extractTopics(texts)).toEqual([]);
  });

  it('drops a word swallowed by a pair with the same count, keeps one with a higher count', () => {
    const texts = [...reviews(3, 'memory foam'), 'foam', ...reviews(0, '')];
    const names = extractTopics(texts).map((t) => t.topic);
    expect(names).toContain('memory foam');
    expect(names).toContain('foam');
    expect(names).not.toContain('memory');
  });

  it('returns at most eight, most common first, ties alphabetical', () => {
    const words = [
      'alpha',
      'bravo',
      'charlie',
      'delta',
      'echo',
      'foxtrot',
      'golf',
      'hotel',
      'india',
      'juliet',
    ];
    const texts = reviews(3, words.join(' '))
      .concat(reviews(1, 'zulu'))
      .concat(['juliet', 'juliet x']);
    const out = extractTopics(texts);
    expect(out).toHaveLength(8);
    expect(out[0]).toEqual({ topic: 'juliet', count: 5 });
    const rest = out.slice(1).map((t) => t.topic);
    expect(rest).toEqual([...rest].sort());
  });

  it('is empty for no reviews', () => {
    expect(extractTopics([])).toEqual([]);
  });
});
