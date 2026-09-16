"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { RichEditor, type RichEditorHandle } from "./RichEditor";

/**
 * Writing an article: the headline, the words, the pictures, and whether it
 * is out.
 *
 * The page is laid out like the article it makes - a big headline, the line
 * under it, then the words - with everything that is not writing (pictures,
 * saving, publishing) kept to one side, out of the way.
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
  const editor = useRef<RichEditorHandle>(null);
  const [title, setTitle] = useState(article.title);
  const [summary, setSummary] = useState(article.summary);
  const [body, setBody] = useState(article.body);
  const [coverImageId, setCoverImageId] = useState(article.coverImageId);
  const [images, setImages] = useState(imageIds);
  // What is on the server, as the editor reads it back. Compared against to
  // say whether there is anything to save.
  const [savedState, setSavedState] = useState({
    title: article.title,
    summary: article.summary,
    body: article.body,
    coverImageId: article.coverImageId,
  });
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const unsaved =
    title !== savedState.title ||
    summary !== savedState.summary ||
    body !== savedState.body ||
    coverImageId !== savedState.coverImageId;

  async function request(method: "PATCH" | "DELETE" | "POST", url: string, payload: unknown) {
    setError("");
    setNotice("");
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
      setSavedState({ title, summary, body, coverImageId });
      setNotice(
        status === article.status ? "Saved." : status === "PUBLISHED" ? "Published. It is on the news page now." : "Unpublished. Only you can see it.",
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
    setBusy("Uploading picture…");
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

  const published = article.status === "PUBLISHED";

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="flex min-w-0 flex-col gap-4">
        {/* The headline and summary are typed where they will appear, in the
            size they will appear at, rather than into labelled boxes. */}
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={140}
          placeholder="Headline"
          aria-label="Headline"
          className="w-full rounded-lg border border-transparent bg-transparent px-1 text-3xl font-black tracking-tight text-slate-100 outline-none placeholder:text-slate-700 hover:border-slate-800 focus:border-slate-700"
        />
        <input
          value={summary}
          onChange={(event) => setSummary(event.target.value)}
          maxLength={300}
          placeholder="A line under the headline - what the piece is about"
          aria-label="Summary"
          className="-mt-2 w-full rounded-lg border border-transparent bg-transparent px-1 text-lg text-slate-400 outline-none placeholder:text-slate-700 hover:border-slate-800 focus:border-slate-700"
        />

        {coverImageId && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/news/image/${coverImageId}`}
            alt=""
            className="aspect-video w-full rounded-xl border border-slate-800 object-cover"
          />
        )}

        <RichEditor
          ref={editor}
          initialBody={article.body}
          onChange={setBody}
          // The editor tidies the stored text as it reads it in; that tidy
          // version is the starting point, so opening an article does not
          // count as changing it.
          onReady={(normalized) => {
            setBody(normalized);
            setSavedState((current) => ({ ...current, body: normalized }));
          }}
        />
      </div>

      <aside className="flex flex-col gap-4 xl:sticky xl:top-[calc(var(--site-nav)+1rem)] xl:self-start">
        <div className="ui-card flex flex-col gap-3 p-4">
          <div className="flex items-center gap-2">
            <span
              className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                published ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-300"
              }`}
            >
              {published ? "Published" : "Draft"}
            </span>
            <Link href={`/news/${article.slug}`} className="ui-link ml-auto text-sm">
              {published ? "View on the site" : "Preview on the site"}
            </Link>
          </div>

          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => save()} disabled={Boolean(busy) || !unsaved} className="ui-button-primary">
              Save
            </button>
            {published ? (
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
          </div>

          <p aria-live="polite" className="min-h-5 text-sm">
            {busy && <span className="text-slate-400">{busy}</span>}
            {!busy && error && <span role="alert" className="text-rose-400">{error}</span>}
            {/* New changes outrank the last "Saved": it is no longer true. */}
            {!busy && !error && unsaved && <span className="text-amber-300">You have unsaved changes.</span>}
            {!busy && !error && !unsaved && notice && <span className="text-emerald-400">{notice}</span>}
          </p>
        </div>

        <div className="ui-card flex flex-col gap-3 p-4">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">Pictures</h3>
            <label className="ui-button ml-auto cursor-pointer">
              Upload
              <input type="file" accept="image/png,image/jpeg,image/webp" onChange={upload} className="sr-only" />
            </label>
          </div>
          {images.length === 0 ? (
            <p className="text-xs leading-relaxed text-slate-500">
              Upload a picture, then click where it should go in the article and press Add to article.
              The first one becomes the cover.
            </p>
          ) : (
            <ul className="grid grid-cols-2 gap-3">
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
                  <button type="button" onClick={() => editor.current?.insertImage(id)} className="ui-link text-left text-xs">
                    Add to article
                  </button>
                  {coverImageId === id ? (
                    <button type="button" onClick={() => setCoverImageId(null)} className="text-left text-xs text-sky-300">
                      Cover ✓
                    </button>
                  ) : (
                    <button type="button" onClick={() => setCoverImageId(id)} className="text-left text-xs text-slate-400 hover:text-white">
                      Use as cover
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <button type="button" onClick={remove} disabled={Boolean(busy)} className="self-start text-sm text-slate-500 hover:text-rose-400">
          Delete this article
        </button>
      </aside>
    </div>
  );
}
