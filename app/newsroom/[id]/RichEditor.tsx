"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { INLINE, isSafeHref, parseArticle } from "@/app/news/render";

/**
 * The article editor: write the way you would in a document.
 *
 * Writers select words and press Bold, or put the cursor in a line and press
 * Heading. Nobody types a symbol to get formatting. Underneath, the editor
 * keeps turning what is on the screen back into the league's plain article
 * text (see app/news/render.tsx), and that text is what gets saved. So the
 * public page never receives markup from here, whatever is pasted in.
 */

export type RichEditorHandle = {
  /** Places a picture at the cursor, or at the end if the editor was never clicked. */
  insertImage: (id: number) => void;
};

/* ------------------------------------------------------ text -> screen */

const escapeHtml = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** A sentence's links, bold and italic, as editor markup. Everything else is escaped text. */
function inlineHtml(text: string): string {
  const pattern = new RegExp(INLINE.source, "g");
  let html = "";
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    html += escapeHtml(text.slice(last, match.index));
    const [whole, label, href, bold, italic] = match;
    if (label !== undefined) {
      html += isSafeHref(href) ? `<a href="${escapeHtml(href)}">${escapeHtml(label)}</a>` : escapeHtml(whole);
    } else if (bold !== undefined) {
      html += `<strong>${inlineHtml(bold)}</strong>`;
    } else {
      html += `<em>${inlineHtml(italic)}</em>`;
    }
    last = match.index + whole.length;
  }
  return html + escapeHtml(text.slice(last));
}

function figureHtml(id: number, caption = "") {
  return (
    `<figure data-image-id="${id}" contenteditable="false">` +
    `<img src="/api/news/image/${id}" alt="">` +
    `<button type="button" data-remove-figure title="Remove picture">Remove</button>` +
    `<figcaption contenteditable="true" data-placeholder="Add a caption (optional)">${escapeHtml(caption)}</figcaption>` +
    `</figure>`
  );
}

function toHtml(body: string) {
  return parseArticle(body)
    .map((block) => {
      switch (block.kind) {
        case "heading":
          return `<h2>${inlineHtml(block.text)}</h2>`;
        case "quote":
          return `<blockquote>${inlineHtml(block.text)}</blockquote>`;
        case "bullets":
          return `<ul>${block.items.map((item) => `<li>${inlineHtml(item)}</li>`).join("")}</ul>`;
        case "image":
          return figureHtml(block.id, block.caption);
        default:
          return `<p>${inlineHtml(block.text)}</p>`;
      }
    })
    .join("");
}

/* ------------------------------------------------------ screen -> text */

/** One line of prose from whatever is inside a block, with its marks written out. */
function inlineText(node: Node): string {
  let out = "";
  node.childNodes.forEach((child) => {
    if (child.nodeType === Node.TEXT_NODE) {
      out += (child.textContent ?? "").replace(/\s+/g, " ");
      return;
    }
    if (!(child instanceof HTMLElement)) return;
    const inner = inlineText(child);
    const tag = child.tagName;
    if (tag === "BR") out += " ";
    else if ((tag === "B" || tag === "STRONG") && inner.trim()) out += `**${inner.trim()}**`;
    else if ((tag === "I" || tag === "EM") && inner.trim()) out += `*${inner.trim()}*`;
    else if (tag === "A") {
      const href = child.getAttribute("href") ?? "";
      out += isSafeHref(href) && inner.trim() ? `[${inner.trim()}](${href})` : inner;
    } else out += inner;
  });
  return out;
}

const BLOCK_TAGS = new Set(["P", "DIV", "H1", "H2", "H3", "H4", "H5", "H6", "BLOCKQUOTE", "UL", "OL", "FIGURE", "SECTION", "ARTICLE"]);

/** The article text for everything in the editor, one block per paragraph. */
function toBody(root: HTMLElement) {
  const blocks: string[] = [];
  let loose = "";

  const flushLoose = () => {
    if (loose.trim()) blocks.push(loose.trim());
    loose = "";
  };

  const walk = (parent: Node) => {
    parent.childNodes.forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        loose += (node.textContent ?? "").replace(/\s+/g, " ");
        return;
      }
      if (!(node instanceof HTMLElement)) return;
      const tag = node.tagName;

      if (!BLOCK_TAGS.has(tag)) {
        // Words or a bold run sitting directly in the editor, outside any
        // paragraph - it happens when a browser is left to itself.
        if (tag === "BR") flushLoose();
        else loose += inlineText({ childNodes: [node] } as unknown as Node);
        return;
      }
      flushLoose();

      if (tag === "FIGURE") {
        const id = node.getAttribute("data-image-id");
        const caption = node.querySelector("figcaption")?.textContent?.replace(/\s+/g, " ").trim() ?? "";
        if (id) blocks.push(`!image:${id}${caption ? ` ${caption}` : ""}`);
      } else if (/^H[1-6]$/.test(tag)) {
        const text = inlineText(node).trim();
        if (text) blocks.push(`## ${text}`);
      } else if (tag === "BLOCKQUOTE") {
        const text = inlineText(node).trim();
        if (text) blocks.push(`> ${text}`);
      } else if (tag === "UL" || tag === "OL") {
        const items = [...node.querySelectorAll(":scope > li")]
          .map((item) => inlineText(item).trim())
          .filter(Boolean)
          .map((item) => `- ${item}`);
        if (items.length) blocks.push(items.join("\n"));
      } else if ([...node.children].some((child) => BLOCK_TAGS.has(child.tagName))) {
        // A wrapper holding its own paragraphs: read what is inside it.
        walk(node);
      } else {
        // A paragraph. A line break inside one starts a new paragraph, since
        // an article has no other kind of break. The nodes are grouped as they
        // are rather than re-read from HTML, which would load whatever an
        // element in it points at.
        let run: Node[] = [];
        const flushRun = () => {
          const text = inlineText({ childNodes: run } as unknown as Node).trim();
          if (text) blocks.push(text);
          run = [];
        };
        node.childNodes.forEach((child) => {
          if (child instanceof HTMLElement && child.tagName === "BR") flushRun();
          else run.push(child);
        });
        flushRun();
      }
    });
  };

  walk(root);
  flushLoose();
  return blocks.join("\n\n");
}

/* ------------------------------------------------------------- editor */

type Block = "p" | "h2" | "blockquote";

export const RichEditor = forwardRef<
  RichEditorHandle,
  { initialBody: string; onChange: (body: string) => void; onReady?: (body: string) => void }
>(function RichEditor({ initialBody, onChange, onReady }, ref) {
  const rootRef = useRef<HTMLDivElement>(null);
  // Where the cursor last was inside the editor, so a toolbar button or the
  // picture panel acts there even after focus has moved to them.
  const savedRange = useRef<Range | null>(null);
  const [active, setActive] = useState({ bold: false, italic: false, list: false, block: "p" as string, link: false });
  const [linking, setLinking] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkError, setLinkError] = useState("");

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    // Filled once, from escaped text. Nothing typed by anyone reaches this as
    // markup - toHtml escapes every character of it.
    // An empty editor stays truly empty, so its "Start writing" prompt shows.
    root.innerHTML = toHtml(initialBody);
    onReady?.(toBody(root));
    // Enter makes a new paragraph rather than an unlabelled <div>.
    document.execCommand("defaultParagraphSeparator", false, "p");
    // Only once: after this, the page is the editor's to change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onSelection = () => {
      const root = rootRef.current;
      const selection = document.getSelection();
      if (!root || !selection || selection.rangeCount === 0) return;
      const range = selection.getRangeAt(0);
      if (!root.contains(range.commonAncestorContainer)) return;
      savedRange.current = range.cloneRange();

      let element: Node | null = range.startContainer;
      let inLink = false;
      while (element && element !== root) {
        if (element instanceof HTMLElement && element.tagName === "A") inLink = true;
        element = element.parentNode;
      }
      const block = String(document.queryCommandValue("formatBlock") || "p").toLowerCase();
      setActive({
        bold: document.queryCommandState("bold"),
        italic: document.queryCommandState("italic"),
        list: document.queryCommandState("insertUnorderedList"),
        block,
        link: inLink,
      });
    };
    document.addEventListener("selectionchange", onSelection);
    return () => document.removeEventListener("selectionchange", onSelection);
  }, []);

  const changed = () => {
    if (rootRef.current) onChange(toBody(rootRef.current));
  };

  /** Puts the cursor back where it was in the editor before a button took focus. */
  const restore = () => {
    const root = rootRef.current;
    if (!root) return;
    root.focus();
    const selection = document.getSelection();
    if (savedRange.current && selection) {
      selection.removeAllRanges();
      selection.addRange(savedRange.current);
    }
  };

  const run = (command: string, value?: string) => {
    restore();
    document.execCommand(command, false, value);
    changed();
  };

  const setBlock = (block: Block) => {
    // Pressing Heading on a heading turns it back into a paragraph.
    const current = active.block;
    run("formatBlock", current === block && block !== "p" ? "p" : block);
  };

  useImperativeHandle(ref, () => ({
    insertImage(id: number) {
      const root = rootRef.current;
      if (!root) return;
      if (savedRange.current) restore();
      else {
        root.focus();
        const range = document.createRange();
        range.selectNodeContents(root);
        range.collapse(false);
        document.getSelection()?.removeAllRanges();
        document.getSelection()?.addRange(range);
      }
      document.execCommand("insertHTML", false, `${figureHtml(id)}<p><br></p>`);
      changed();
    },
  }));

  const openLink = () => {
    setLinkError("");
    setLinkUrl("");
    setLinking(true);
  };

  const addLink = (event: React.FormEvent) => {
    event.preventDefault();
    let url = linkUrl.trim();
    if (!url) return;
    // People paste "discord.gg/abc" as often as a full address.
    if (!/^https?:\/\//i.test(url) && !url.startsWith("/")) url = `https://${url}`;
    if (!isSafeHref(url)) {
      setLinkError("That doesn't look like a web address.");
      return;
    }
    restore();
    const selection = document.getSelection();
    if (selection && !selection.isCollapsed) {
      document.execCommand("createLink", false, url);
    } else {
      // Nothing selected: the address itself becomes the link's words.
      document.execCommand("insertHTML", false, `<a href="${escapeHtml(url)}">${escapeHtml(url)}</a>&nbsp;`);
    }
    setLinking(false);
    changed();
  };

  /** Pasted text arrives as plain paragraphs, never as another site's formatting. */
  const paste = (event: React.ClipboardEvent<HTMLDivElement>) => {
    event.preventDefault();
    const text = event.clipboardData.getData("text/plain");
    if (!text) return;
    const paragraphs = text
      .replace(/\r\n/g, "\n")
      .split(/\n\s*\n/)
      .map((paragraph) => paragraph.replace(/\s*\n\s*/g, " ").trim())
      .filter(Boolean);
    if (paragraphs.length <= 1) document.execCommand("insertText", false, paragraphs[0] ?? "");
    else document.execCommand("insertHTML", false, paragraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join(""));
    changed();
  };

  /** Only plain words may be dragged in; pictures come from the panel beside the editor. */
  const drop = (event: React.DragEvent<HTMLDivElement>) => {
    const types = [...event.dataTransfer.types];
    if (types.includes("Files") || (types.includes("text/html") && !types.includes("text/plain"))) {
      event.preventDefault();
    }
  };

  const click = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest("[data-remove-figure]")) {
      event.preventDefault();
      target.closest("figure")?.remove();
      changed();
    }
  };

  // Buttons keep the editor's selection: pressing one must not move the cursor
  // out of the text it is meant to change.
  const keep = (event: React.MouseEvent) => event.preventDefault();
  const button = (on: boolean) =>
    `rounded-md px-2.5 py-1.5 text-sm font-semibold transition-colors ${
      on ? "bg-sky-500/20 text-sky-200" : "text-slate-300 hover:bg-slate-800 hover:text-white"
    }`;

  return (
    // Not clipped: a clipping box would become what the toolbar sticks to,
    // and it would hang in the middle of the text instead of under the site
    // bar while a long article scrolls.
    <div className="rounded-xl border border-slate-800 bg-slate-900/40">
      <div
        role="toolbar"
        aria-label="Formatting"
        className="sticky top-[var(--site-nav)] z-10 flex flex-wrap items-center gap-1 rounded-t-xl border-b border-slate-800 bg-slate-900/95 px-2 py-1.5 backdrop-blur"
      >
        <button type="button" onMouseDown={keep} onClick={() => setBlock("p")} className={button(active.block === "p" && !active.list)}>
          Text
        </button>
        <button type="button" onMouseDown={keep} onClick={() => setBlock("h2")} className={button(active.block === "h2")}>
          Heading
        </button>
        <button type="button" onMouseDown={keep} onClick={() => setBlock("blockquote")} className={button(active.block === "blockquote")}>
          Quote
        </button>
        <button type="button" onMouseDown={keep} onClick={() => run("insertUnorderedList")} className={button(active.list)}>
          • List
        </button>
        <span className="mx-1 h-5 w-px bg-slate-700" aria-hidden />
        <button type="button" onMouseDown={keep} onClick={() => run("bold")} className={`${button(active.bold)} font-black`} title="Bold (Ctrl+B)">
          B
        </button>
        <button type="button" onMouseDown={keep} onClick={() => run("italic")} className={`${button(active.italic)} italic`} title="Italic (Ctrl+I)">
          I
        </button>
        <span className="mx-1 h-5 w-px bg-slate-700" aria-hidden />
        {active.link ? (
          <button type="button" onMouseDown={keep} onClick={() => run("unlink")} className={button(true)}>
            Remove link
          </button>
        ) : (
          <button type="button" onMouseDown={keep} onClick={openLink} className={button(linking)} title="Select some words first">
            Link
          </button>
        )}
      </div>

      {linking && (
        <form onSubmit={addLink} className="flex flex-wrap items-center gap-2 border-b border-slate-800 bg-slate-900 px-3 py-2">
          <input
            autoFocus
            value={linkUrl}
            onChange={(event) => setLinkUrl(event.target.value)}
            placeholder="Paste a web address"
            className="ui-input min-w-0 flex-1"
          />
          <button type="submit" className="ui-button-primary">
            Add link
          </button>
          <button type="button" onClick={() => setLinking(false)} className="ui-button">
            Cancel
          </button>
          {linkError && <p role="alert" className="w-full text-xs text-rose-400">{linkError}</p>}
        </form>
      )}

      <div
        ref={rootRef}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline
        aria-label="Article"
        data-placeholder="Start writing…"
        onInput={changed}
        onPaste={paste}
        onDrop={drop}
        onClick={click}
        onKeyUp={changed}
        className="article-editor min-h-[28rem] px-5 py-4 outline-none"
      />
    </div>
  );
});
