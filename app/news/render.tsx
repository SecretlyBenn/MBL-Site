import Link from "next/link";

/**
 * Turns what a writer typed into the article on the page.
 *
 * Deliberately not HTML. Anything a writer types is text, and this reads it
 * for a few plain conventions rather than trusting markup: a stray script tag
 * in an article is a stray script tag on the screen, never a script. That is
 * why nothing here uses dangerouslySetInnerHTML.
 *
 * What a writer can use, one per line:
 *
 *   ## A heading
 *   > A pull quote
 *   - A bullet
 *   !image:12 Caption goes here      (from the picture's Insert button)
 *   A plain paragraph, with [a link](https://example.com) inside it.
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

/**
 * Prose, with [text](url) turned into links.
 *
 * Only http, https and addresses on this site become links; anything else
 * (javascript:, data:) is left as the text the writer typed, so a link can
 * never run something.
 */
function Prose({ text }: { text: string }) {
  const pieces: React.ReactNode[] = [];
  const pattern = /\[([^\]]+)\]\(([^)\s]+)\)/g;
  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) pieces.push(text.slice(last, match.index));
    const [whole, label, href] = match;
    const safe = /^https?:\/\//i.test(href) || href.startsWith("/");
    pieces.push(
      safe ? (
        <Link
          key={`${match.index}-${href}`}
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
