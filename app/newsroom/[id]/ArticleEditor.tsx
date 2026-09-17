"use client";

import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
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

/** How long a draft waits after the last keystroke before saving itself. */
const AUTOSAVE_MS = 2500;

export function ArticleEditor({ article, imageIds }: { article: Draft; imageIds: number[] }) {
  const router = useRouter();
  const editor = useRef<RichEditorHandle>(null);
  const [title, setTitle] = useState(article.title);
  const [summary, setSummary] = useState(article.summary);
  const [body, setBody] = useState(article.body);
  const [coverImageId, setCoverImageId] = useState(article.coverImageId);
  const [images, setImages] = useState(imageIds);
  // Kept here rather than read from the page, so publishing does not have to
  // reload the editor to say so.
  const [status, setStatus] = useState(article.status);
  // What is on the server, as the editor reads it back. Compared against to
  // say whether there is anything to save.
  const [savedState, setSavedState] = useState({
    title: article.title,
    summary: article.summary,
    body: article.body,
    coverImageId: article.coverImageId,
  });
  const [busy, setBusy] = useState("");
  const [autosaving, setAutosaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const unsaved =
    title !== savedState.title ||
    summary !== savedState.summary ||
    body !== savedState.body ||
    coverImageId !== savedState.coverImageId;
  const draft = status === "DRAFT";

  async function request(method: "PATCH" | "DELETE" | "POST", url: string, payload: unknown) {
    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await response.json().catch(() => ({}))) as { error?: string } & Record<string, unknown>;
    if (!response.ok) throw new Error(data.error ?? `Request failed (${response.status})`);
    return data;
  }

  /**
   * Saves what is on screen, and optionally changes whether it is published.
   * A quiet save is the draft saving itself: it says nothing unless it fails.
   * Returns whether it worked, so previewing and leaving can wait on it.
   */
  async function save(nextStatus: Draft["status"] = status, quiet = false) {
    // What is being sent, so typing that lands while it is on its way still
    // counts as unsaved afterwards.
    const sent = { title, summary, body, coverImageId };
    if (quiet) setAutosaving(true);
    else setBusy(nextStatus === status ? "Saving…" : nextStatus === "PUBLISHED" ? "Publishing…" : "Unpublishing…");
    if (!quiet) {
      setError("");
      setNotice("");
    }
    try {
      await request("PATCH", "/api/news", { id: article.id, ...sent, status: nextStatus });
      setSavedState(sent);
      setError("");
      if (!quiet) {
        setNotice(
          nextStatus === status
            ? "Saved."
            : nextStatus === "PUBLISHED"
              ? "Published. It is on the news page now."
              : "Unpublished. Only you can see it.",
        );
      }
      setStatus(nextStatus);
      return true;
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Something went wrong.");
      return false;
    } finally {
      if (quiet) setAutosaving(false);
      else setBusy("");
    }
  }

  // The latest of everything, for the listeners below, which are attached once
  // and would otherwise only ever see the article as it was when they were.
  // Updated as part of the render itself rather than after it, so a click on
  // a link straight after a keystroke sees that keystroke as unsaved.
  const latest = useRef({ unsaved, draft, save });
  useLayoutEffect(() => {
    latest.current = { unsaved, draft, save };
  });

  // A page brought back by the browser's Back button can be the copy it held
  // from before, older than what has been saved since. Asking for the page
  // again replaces it - the editor is keyed on when the article last changed,
  // so a newer copy starts it afresh and an identical one changes nothing.
  useEffect(() => {
    router.refresh();
  }, [router]);

  // A draft saves itself once the writing pauses. Published articles do not:
  // their changes go out to readers, so that waits for Save.
  useEffect(() => {
    if (!draft || !unsaved || busy || autosaving || !title.trim()) return;
    const timer = setTimeout(() => void latest.current.save("DRAFT", true), AUTOSAVE_MS);
    return () => clearTimeout(timer);
  }, [draft, unsaved, busy, autosaving, title, summary, body, coverImageId]);

  useEffect(() => {
    // Leaving the site, closing the tab or reloading. A draft is sent on its
    // way as the page goes; a published article with changes asks first.
    const beforeUnload = (event: BeforeUnloadEvent) => {
      const { unsaved: dirty, draft: isDraft, save: saveNow } = latest.current;
      if (!dirty) return;
      if (isDraft) {
        void saveNow("DRAFT", true);
        return;
      }
      event.preventDefault();
      event.returnValue = "";
    };
    // Switching to another tab - to look something up, or at a preview - is
    // the moment most likely to be followed by closing this one.
    const hidden = () => {
      const { unsaved: dirty, draft: isDraft, save: saveNow } = latest.current;
      if (document.visibilityState === "hidden" && dirty && isDraft) void saveNow("DRAFT", true);
    };
    // A link inside the site changes page without unloading it, so nothing
    // above sees it. It is caught here instead, before the page changes.
    const click = (event: MouseEvent) => {
      const { unsaved: dirty, draft: isDraft, save: saveNow } = latest.current;
      if (!dirty || event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = (event.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      // Links being written inside the article are text, not a way out.
      if (!link || link.target === "_blank" || link.closest("[contenteditable='true']")) return;
      const destination = new URL(link.href, window.location.href);
      if (destination.origin !== window.location.origin) return;
      event.preventDefault();
      event.stopPropagation();
      if (isDraft) {
        void saveNow("DRAFT", true).then((saved) => {
          if (saved) router.push(destination.pathname + destination.search + destination.hash);
        });
      } else if (confirm("Your changes to this article are not saved. Leave without saving them?")) {
        router.push(destination.pathname + destination.search + destination.hash);
      }
    };
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("visibilitychange", hidden);
    document.addEventListener("click", click, true);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("visibilitychange", hidden);
      document.removeEventListener("click", click, true);
    };
  }, [router]);

  /**
   * Opens the article as readers see it, in a tab of its own so the editor
   * stays exactly as it was. A draft is saved first - the preview can only
   * show what the site has, and what it had was the last time Save was pressed,
   * which is how a draft previewed before being saved came back empty.
   */
  async function preview() {
    // Opened now, while the click still counts as the reason: a tab opened
    // after waiting on a save is treated as a pop-up and blocked.
    const tab = window.open("about:blank", "_blank");
    if (tab) tab.opener = null;
    if (draft && unsaved) {
      const saved = await save("DRAFT", true);
      if (!saved) {
        tab?.close();
        return;
      }
    }
    const address = `/news/${article.slug}`;
    if (tab) {
      tab.location.href = address;
      return;
    }
    // No new tab allowed, so the preview takes this one. A draft has just been
    // saved and comes back as it was; unsaved changes to a published article
    // would not, so those are asked about first.
    if (draft || !unsaved || confirm("Your changes to this article are not saved. Leave without saving them?")) {
      router.push(address);
    }
  }

  async function upload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setBusy("Uploading picture…");
    setError("");
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
    setError("");
    try {
      await request("DELETE", "/api/news", { id: article.id });
      router.push("/newsroom");
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Something went wrong.");
      setBusy("");
    }
  }

  const published = !draft;

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
            <button type="button" onClick={() => void preview()} disabled={Boolean(busy)} className="ui-link ml-auto text-sm">
              {published ? "View on the site ↗" : "Preview on the site ↗"}
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => save()}
              disabled={Boolean(busy) || autosaving || !unsaved}
              className="ui-button-primary"
            >
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
            {/* New changes outrank the last "Saved": it is no longer true. A
                draft is about to save itself, so it says that instead of
                asking the writer to. */}
            {!busy && !error && (autosaving || (draft && unsaved)) && (
              <span className="text-slate-400">Saving…</span>
            )}
            {!busy && !error && published && unsaved && (
              <span className="text-amber-300">Unsaved changes. Readers see them once you press Save.</span>
            )}
            {!busy && !error && !autosaving && !unsaved && (
              <span className="text-emerald-400">{notice || (draft ? "Draft saved." : "")}</span>
            )}
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
