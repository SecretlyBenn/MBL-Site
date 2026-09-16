import Link from "next/link";

/**
 * Turns what a writer typed into the article on the page.
 *
 * Deliberately not HTML. Anything a writer types is text, and this reads it
 * for a few plain conventions rather than trusting markup: a stray script tag
 * in an article is a stray script tag on the screen, never a script. That is
 * why nothing here uses dangerouslySetInnerHTML.
 *
 * Writers never see this format - the newsroom editor writes it for them from
 * its toolbar - but it is what is stored, one block per line:
 *
 *   ## A heading
 *   > A pull quote
 *   - A bullet
 *   !image:12 Caption goes here
 *   A paragraph, with [a link](https://example.com), **bold** and *italic*.
 *
 * A blank line ends a paragraph. Everything else is prose.
 */

type Block =
  | { kind: "heading"; text: string }
  | { kind: "quote"; text: string }
  | { kind: "bullets"; items: string[] }
  | { kind: "image"; id: number; caption: string }
  | { kind: "paragraph"; text: string };

export function parseArticle(body: string): Block[] {
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  let bullets: string[] = [];

  const flush = () => {
    if (paragraph.length) {
      blocks.push({ kind: "paragraph", text: paragraph.join(" ") });
      paragraph = [];
    }
    if (bullets.length) {
      blocks.push({ kind: "bullets", items: bullets });
      bullets = [];
    }
  };

  for (const raw of body.replace(/\r\n/g, "\n").split("\n")) {
    const line = raw.trim();
    if (!line) {
      flush();
      continue;
    }
    const image = line.match(/^!image:(\d+)\s*(.*)$/);
    if (image) {
      flush();
      blocks.push({ kind: "image", id: Number(image[1]), caption: image[2] });
    } else if (line.startsWith("## ")) {
      flush();
      blocks.push({ kind: "heading", text: line.slice(3) });
    } else if (line.startsWith("> ")) {
      flush();
      blocks.push({ kind: "quote", text: line.slice(2) });
    } else if (line.startsWith("- ")) {
      if (paragraph.length) flush();
      bullets.push(line.slice(2));
    } else {
      if (bullets.length) flush();
      paragraph.push(line);
    }
  }
  flush();
  return blocks;
}

/** Whether a link may be followed: web addresses and pages on this site only. */
export function isSafeHref(href: string) {
  return /^https?:\/\//i.test(href) || (href.startsWith("/") && !href.startsWith("//"));
}

/**
 * The marks a sentence can carry, in the order they are looked for: a link,
 * then bold, then italic. The editor writes these for the writer - nobody
 * types them - and this is the one place that reads them back.
 */
export const INLINE = /\[([^\]]+)\]\(([^)\s]+)\)|\*\*([^*]+)\*\*|\*([^*\s][^*]*)\*/g;

/**
 * Prose, with its links, bold and italic.
 *
 * Only http, https and addresses on this site become links; anything else
 * (javascript:, data:) is left as the text the writer typed, so a link can
 * never run something.
 */
function Prose({ text }: { text: string }) {
  const pieces: React.ReactNode[] = [];
  const pattern = new RegExp(INLINE.source, "g");
  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) pieces.push(text.slice(last, match.index));
    const [whole, label, href, bold, italic] = match;
    const key = `${match.index}-${whole.length}`;
    if (label !== undefined) {
      pieces.push(
        isSafeHref(href) ? (
          <Link
            key={key}
            href={href}
            className="ui-link"
            {...(href.startsWith("/") ? {} : { target: "_blank", rel: "noreferrer noopener" })}
          >
            {label}
          </Link>
        ) : (
          whole
        ),
      );
    } else if (bold !== undefined) {
      pieces.push(
        <strong key={key} className="font-bold text-slate-100">
          <Prose text={bold} />
        </strong>,
      );
    } else {
      pieces.push(
        <em key={key}>
          <Prose text={italic} />
        </em>,
      );
    }
    last = match.index + whole.length;
  }
  if (last < text.length) pieces.push(text.slice(last));
  return <>{pieces}</>;
}

export function Article({ body }: { body: string }) {
  const blocks = parseArticle(body);
  if (blocks.length === 0) {
    return <p className="text-sm text-slate-500">This article has no words in it yet.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {blocks.map((block, index) => {
        switch (block.kind) {
          case "heading":
            return (
              <h2 key={index} className="mt-4 text-xl font-black tracking-tight text-slate-100">
                {block.text}
              </h2>
            );
          case "quote":
            return (
              <blockquote
                key={index}
                className="border-l-2 border-sky-500/60 pl-4 text-lg font-medium italic text-slate-200"
              >
                <Prose text={block.text} />
              </blockquote>
            );
          case "bullets":
            return (
              <ul key={index} className="ml-5 flex list-disc flex-col gap-1.5 text-slate-300">
                {block.items.map((item, itemIndex) => (
                  <li key={itemIndex}>
                    <Prose text={item} />
                  </li>
                ))}
              </ul>
            );
          case "image":
            return (
              <figure key={index} className="my-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/news/image/${block.id}`}
                  alt={block.caption || ""}
                  loading="lazy"
                  className="w-full rounded-xl border border-slate-800"
                />
                {block.caption && (
                  <figcaption className="mt-1.5 text-xs text-slate-500">{block.caption}</figcaption>
                )}
              </figure>
            );
          default:
            return (
              <p key={index} className="text-[15px] leading-relaxed text-slate-300">
                <Prose text={block.text} />
              </p>
            );
        }
      })}
    </div>
  );
}
