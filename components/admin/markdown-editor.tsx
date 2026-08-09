"use client";

import { useRef, useState, useId } from "react";
import { cn } from "@/lib/utils";

/**
 * The article body editor.
 *
 * A markdown textarea with a formatting toolbar, plus a live preview rendered
 * with the public site's typography. Chosen over a rich-text/contenteditable
 * editor for three concrete reasons:
 *
 *   1. No dependency. A WYSIWYG editor means adding a package, and this build
 *      cannot install one.
 *   2. The database already stores markdown and derives paragraph blocks from it
 *      via the sync_article_body trigger. Round-tripping HTML through that would
 *      lose fidelity.
 *   3. Markdown cannot carry a script tag or an event handler, so the stored
 *      body is inert by construction rather than by sanitising afterwards.
 *
 * The toolbar wraps the selection, so nobody has to remember the syntax.
 */

interface Action {
  label: string;
  title: string;
  wrap?: [string, string];
  prefix?: string;
}

const ACTIONS: Action[] = [
  { label: "H2", title: "Heading", prefix: "## " },
  { label: "H3", title: "Subheading", prefix: "### " },
  { label: "B", title: "Bold", wrap: ["**", "**"] },
  { label: "I", title: "Italic", wrap: ["_", "_"] },
  { label: "Link", title: "Link", wrap: ["[", "](https://)"] },
  { label: "List", title: "Bulleted list", prefix: "- " },
  { label: "1.", title: "Numbered list", prefix: "1. " },
  { label: "Quote", title: "Quotation", prefix: "> " },
  { label: "Image", title: "Image", wrap: ["![", "](https://)"] },
];

/**
 * Minimal markdown renderer for the preview.
 *
 * Escapes HTML first, so a pasted script tag renders as text rather than
 * executing in the admin's own browser. Only the constructs the toolbar can
 * produce are supported — a preview that rendered more than the site does would
 * be misleading.
 */
function renderPreview(markdown: string): string {
  const escaped = markdown
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  const inline = (text: string) =>
    text
      .replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, '<img src="$2" alt="$1" class="my-4 rounded-md" />')
      .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2" class="underline underline-offset-4">$1</a>')
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/_([^_]+)_/g, "<em>$1</em>");

  const blocks = escaped.split(/\n\s*\n/);
  const html: string[] = [];

  for (const block of blocks) {
    const trimmed = block.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith("### ")) {
      html.push(`<h3 class="mt-6 font-display text-xl">${inline(trimmed.slice(4))}</h3>`);
    } else if (trimmed.startsWith("## ")) {
      html.push(`<h2 class="mt-8 font-display text-2xl">${inline(trimmed.slice(3))}</h2>`);
    } else if (trimmed.startsWith("&gt; ")) {
      html.push(
        `<blockquote class="my-5 border-l-2 border-orchid-500 pl-4 italic">${inline(trimmed.slice(5))}</blockquote>`
      );
    } else if (/^- /.test(trimmed)) {
      const items = trimmed.split("\n").map((l) => `<li>${inline(l.replace(/^- /, ""))}</li>`).join("");
      html.push(`<ul class="my-4 list-disc space-y-1.5 pl-5">${items}</ul>`);
    } else if (/^\d+\. /.test(trimmed)) {
      const items = trimmed.split("\n").map((l) => `<li>${inline(l.replace(/^\d+\. /, ""))}</li>`).join("");
      html.push(`<ol class="my-4 list-decimal space-y-1.5 pl-5">${items}</ol>`);
    } else {
      html.push(`<p class="mt-4 leading-relaxed">${inline(trimmed)}</p>`);
    }
  }

  return html.join("");
}

export function MarkdownEditor({
  name, defaultValue, label,
}: {
  name: string;
  defaultValue?: string;
  label: string;
}) {
  const [value, setValue] = useState(defaultValue ?? "");
  const [tab, setTab] = useState<"write" | "preview">("write");
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const id = useId();

  function apply(action: Action) {
    const area = areaRef.current;
    if (!area) return;

    const start = area.selectionStart;
    const end = area.selectionEnd;
    const selected = value.slice(start, end);

    let next: string;
    let caret: number;

    if (action.wrap) {
      const [open, close] = action.wrap;
      next = value.slice(0, start) + open + selected + close + value.slice(end);
      caret = start + open.length + selected.length;
    } else {
      // Prefix every selected line, so applying a list to three lines works.
      const lineStart = value.lastIndexOf("\n", start - 1) + 1;
      const target = value.slice(lineStart, end) || "";
      const prefixed = target
        .split("\n")
        .map((line) => (line.startsWith(action.prefix!) ? line : action.prefix! + line))
        .join("\n");
      next = value.slice(0, lineStart) + prefixed + value.slice(end);
      caret = lineStart + prefixed.length;
    }

    setValue(next);
    // Restore focus and caret after React re-renders.
    requestAnimationFrame(() => {
      area.focus();
      area.setSelectionRange(caret, caret);
    });
  }

  const words = value.trim() === "" ? 0 : value.trim().split(/\s+/).length;

  return (
    <div className="sm:col-span-2">
      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
        <label htmlFor={id} className="text-sm font-medium">{label}</label>
        <div className="flex gap-1 rounded-full bg-surface-50 p-0.5 dark:bg-night-950" role="tablist">
          {(["write", "preview"] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={cn(
                "rounded-full px-3 py-1 text-xs capitalize transition-colors",
                tab === t ? "bg-white font-medium shadow-e-1 dark:bg-night-800" : "text-mist-500"
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* The value always posts, whichever tab is showing. */}
      <input type="hidden" name={name} value={value} />

      {tab === "write" ? (
        <>
          <div className="flex flex-wrap gap-1 rounded-t-sm bg-surface-50 p-1.5 dark:bg-night-950">
            {ACTIONS.map((action) => (
              <button
                key={action.label}
                type="button"
                title={action.title}
                aria-label={action.title}
                onClick={() => apply(action)}
                className="h-8 min-w-8 rounded-sm px-2 text-xs font-medium transition-colors hover:bg-ink-900/[0.06] dark:hover:bg-surface-0/[0.08]"
              >
                {action.label}
              </button>
            ))}
          </div>
          <textarea
            ref={areaRef}
            id={id}
            rows={18}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-full rounded-b-sm bg-surface-50 p-3.5 font-mono text-[0.8125rem] leading-relaxed outline-none ring-orchid-500 focus-visible:ring-2 dark:bg-night-950"
          />
        </>
      ) : (
        <div className="rounded-sm bg-white p-6 shadow-e-1 dark:bg-night-900">
          {value.trim() === "" ? (
            <p className="text-sm text-mist-500">Nothing to preview yet.</p>
          ) : (
            // Rendered from markdown that was HTML-escaped first, so no pasted
            // markup can execute here.
            <div
              className="max-w-reading text-[1rem]"
              dangerouslySetInnerHTML={{ __html: renderPreview(value) }}
            />
          )}
        </div>
      )}

      <p className="mt-1.5 text-xs text-mist-500">
        {words} words · about {Math.max(1, Math.round(words / 200))} min read ·
        Markdown: ## heading, **bold**, _italic_, - list, &gt; quote
      </p>
    </div>
  );
}
