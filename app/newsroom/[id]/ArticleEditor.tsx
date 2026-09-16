"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Article } from "@/app/news/render";

/**
 * Writing an article: the words, the pictures, and whether it is out.
 *
 * The preview beside the text is the same renderer the public page uses, so
 * what a writer sees here is what readers will see - there is no second idea
 * of how an article looks.
 */

type Draft = {
  id: number;
  slug: string;
  title: string;
  summary: string;
  body: string;
  coverImageId: number | null;
  status: "DRAFT" | "PUBLISHED";
};

/**
 * Shrinks a photo to at most 1600px wide before it is sent. A screenshot
 * straight off a monitor is several megabytes; this makes it a few hundred
 * kilobytes, which is what the database can hold and a phone can load.
 */
async function resizePhoto(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1600 / bitmap.width, 1);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Your browser could not process that picture.");
  context.imageSmoothingQuality = "high";
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL("image/webp", 0.82);
}

export function ArticleEditor({ article, imageIds }: { article: Draft; imageIds: number[] }) {
  const router = useRouter();
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const [title, setTitle] = useState(article.title);
  const [summary, setSummary] = useState(article.summary);
  const [body, setBody] = useState(article.body);
  const [coverImageId, setCoverImageId] = useState(article.coverImageId);
  const [images, setImages] = useState(imageIds);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");

  const unsaved =
    title !== article.title ||
    summary !== article.summary ||
    body !== article.body ||
    coverImageId !== article.coverImageId;

  async function request(method: "PATCH" | "DELETE" | "POST", url: string, payload: unknown) {
    setError("");
    setSaved("");
    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await response.json().catch(() => ({}))) as { error?: string } & Record<string, unknown>;
    if (!response.ok) throw new Error(data.error ?? `Request failed (${response.status})`);
    return data;
  }

  async function save(status: Draft["status"] = article.status) {
    setBusy(status === article.status ? "Saving…" : status === "PUBLISHED" ? "Publishing…" : "Unpublishing…");
    try {
      await request("PATCH", "/api/news", { id: article.id, title, summary, body, coverImageId, status });
      setSaved(
        status === article.status ? "Saved." : status === "PUBLISHED" ? "Published." : "Back to a draft.",
      );
      router.refresh();
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Something went wrong.");
    } finally {
      setBusy("");
    }
  }

  async function upload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setBusy("Uploading…");
    try {
      const dataUrl = await resizePhoto(file);
      const data = await request("POST", "/api/news/images", { articleId: article.id, dataUrl });
      const id = Number(data.id);
      setImages((current) => [...current, id]);
      // The first picture of an article is almost always its cover.
      if (coverImageId === null) setCoverImageId(id);
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "That picture could not be uploaded.");
    } finally {
      setBusy("");
    }
  }

  /** Puts a picture into the text on its own line, where the cursor is. */
  function insert(id: number) {
    const field = bodyRef.current;
    const at = field ? field.selectionStart : body.length;
    const before = body.slice(0, at).replace(/\s*$/, "");
    const after = body.slice(at).replace(/^\s*/, "");
    const line = `!image:${id} `;
    setBody(`${before}${before ? "\n\n" : ""}${line}\n\n${after}`);
    requestAnimationFrame(() => {
      if (!field) return;
      const cursor = (before ? before.length + 2 : 0) + line.length;
      field.focus();
      field.setSelectionRange(cursor, cursor);
    });
  }

  async function remove() {
    if (!confirm(`Delete "${article.title}"? Its comments and pictures go with it, and this cannot be undone.`)) {
      return;
    }
    setBusy("Deleting…");
    try {
      await request("DELETE", "/api/news", { id: article.id });
      router.push("/newsroom");
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Something went wrong.");
      setBusy("");
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <div className="flex min-w-0 flex-col gap-3">
        <label className="flex flex-col gap-1">
          <span className="ui-field-label">Headline</span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={140}
            className="ui-input w-full text-lg font-bold"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="ui-field-label">Summary - one line under the headline</span>
          <input
            value={summary}
            onChange={(event) => setSummary(event.target.value)}
            maxLength={300}
            className="ui-input w-full"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="ui-field-label">Article</span>
          <textarea
            ref={bodyRef}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            rows={22}
            maxLength={40000}
            placeholder={"The Knights needed four games...\n\n## How it turned\n\nA paragraph, then a blank line."}
            className="ui-input w-full resize-y font-mono text-sm leading-relaxed"
          />
        </label>

        <div className="ui-card flex flex-col gap-3 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">Pictures</h3>
            <label className="ui-button ml-auto cursor-pointer">
              Upload a picture
              <input type="file" accept="image/png,image/jpeg,image/webp" onChange={upload} className="sr-only" />
            </label>
          </div>
          {images.length === 0 ? (
            <p className="text-xs text-slate-500">
              None yet. The first one you upload becomes the cover.
            </p>
          ) : (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {images.map((id) => (
                <li key={id} className="flex flex-col gap-1.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/news/image/${id}`}
                    alt=""
                    className={`aspect-video w-full rounded-lg border object-cover ${
                      coverImageId === id ? "border-sky-500" : "border-slate-800"
                    }`}
                  />
                  <div className="flex gap-2 text-xs">
                    <button type="button" onClick={() => insert(id)} className="ui-link">
                      Insert
                    </button>
                    {coverImageId === id ? (
                      <button type="button" onClick={() => setCoverImageId(null)} className="text-sky-300">
                        Cover ✓
                      </button>
                    ) : (
                      <button type="button" onClick={() => setCoverImageId(id)} className="text-slate-400 hover:text-white">
                        Make cover
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => save()} disabled={Boolean(busy) || !unsaved} className="ui-button-primary">
            Save
          </button>
          {article.status === "PUBLISHED" ? (
            <button type="button" onClick={() => save("DRAFT")} disabled={Boolean(busy)} className="ui-button">
              Unpublish
            </button>
          ) : (
            <button
              type="button"
              onClick={() => save("PUBLISHED")}
              disabled={Boolean(busy) || !title.trim()}
              className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-bold text-white transition-colors hover:bg-emerald-500 disabled:opacity-40"
            >
              Publish
            </button>
          )}
          <Link href={`/news/${article.slug}`} className="ui-link text-sm">
            {article.status === "PUBLISHED" ? "View live" : "View draft"}
          </Link>
          <button type="button" onClick={remove} disabled={Boolean(busy)} className="ml-auto text-sm text-slate-500 hover:text-rose-400">
            Delete article
          </button>
        </div>
        <p aria-live="polite" className="text-sm">
          {busy && <span className="text-slate-400">{busy}</span>}
          {!busy && saved && <span className="text-emerald-400">{saved}</span>}
          {!busy && !saved && unsaved && <span className="text-amber-300">Unsaved changes.</span>}
          {error && <span role="alert" className="text-rose-400">{error}</span>}
        </p>
      </div>

      {/* How it will read. Same renderer as the public page. */}
      <div className="min-w-0">
        <p className="ui-field-label mb-2">Preview</p>
        <div className="ui-card p-5">
          {coverImageId && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`/api/news/image/${coverImageId}`} alt="" className="mb-4 aspect-video w-full rounded-lg border border-slate-800 object-cover" />
          )}
          <h1 className="text-2xl font-black tracking-tight">{title || "Untitled"}</h1>
          {summary && <p className="mt-1 text-slate-400">{summary}</p>}
          <div className="mt-4">
            <Article body={body} />
          </div>
        </div>
      </div>
    </div>
  );
}
