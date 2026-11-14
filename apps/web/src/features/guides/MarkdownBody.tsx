import ReactMarkdown from 'react-markdown';

import { cn } from '../../lib/cn';

// Renders Markdown WITHOUT raw HTML. react-markdown builds React elements from the Markdown syntax
// tree and, by default, ignores any HTML written inside the text, so an editor (or an attacker who
// reached the admin) cannot put a <script> or an onerror handler into a guide. No `rehype-raw`
// plugin is installed on purpose. Links keep the library's default URL filter (no `javascript:`).
// Headings start at h2 in the content because the page already has its own h1.
export function MarkdownBody({ source, className }: { source: string; className?: string }) {
  return (
    <div
      className={cn(
        'max-w-[68ch] space-y-5 text-lg leading-relaxed text-ink/90',
        '[&>p:first-child]:text-xl [&>p:first-child]:leading-relaxed [&>p:first-child]:text-ink',
        '[&_h2]:!mt-12 [&_h2]:font-display [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:leading-snug [&_h2]:text-ink sm:[&_h2]:text-3xl',
        '[&_h3]:!mt-8 [&_h3]:font-display [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:text-ink',
        '[&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-6 [&_li]:pl-1 [&_li::marker]:text-primary-strong',
        '[&_strong]:font-semibold [&_strong]:text-ink',
        '[&_blockquote]:rounded-card [&_blockquote]:bg-primary-soft [&_blockquote]:px-6 [&_blockquote]:py-4 [&_blockquote]:italic',
        '[&_hr]:my-10 [&_hr]:border-line',
        '[&_a]:font-semibold [&_a]:text-primary-strong [&_a]:underline [&_a]:underline-offset-2',
        className,
      )}
    >
      <ReactMarkdown>{source}</ReactMarkdown>
    </div>
  );
}
