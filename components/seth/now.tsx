import Image from "next/image";
import { sethNow } from "@/lib/copy/seth";
import { getLastPlayed } from "@/lib/spotify";
import s from "./now.module.css";

/**
 * Listening & Reading, after melon.studio's footer: "Last played" from Spotify (server-side, cached
 * ~5 minutes in lib/spotify.ts) and "Reading" from lib/copy/seth.ts. Each slot hides when it has no
 * data; the whole block renders nothing when both are empty. No audio anywhere: the track links out.
 */
export async function NowWidget() {
  const played = await getLastPlayed();
  const book = sethNow.reading;
  if (!played && !book) return null;

  return (
    <div className={s.now} role="group" aria-label={sethNow.label}>
      <p className={s.label}>{sethNow.label}</p>
      <div className={s.list}>
        {played ? (
          <a className={s.item} href={played.url} target="_blank" rel="noopener noreferrer">
            <span className={s.cover}>
              {played.albumArt ? <Image src={played.albumArt} alt="" fill sizes="(max-width: 720px) 48px, 54px" /> : null}
            </span>
            <span className={s.meta}>
              <span className={s.kicker}>
                <span className={s.eq} aria-hidden>
                  <i />
                  <i />
                  <i />
                  <i />
                </span>
                {sethNow.played}
              </span>
              <span className={s.title}>
                <span>{played.track}</span>
              </span>
              <span className={s.by}>{played.artist}</span>
              <span className="sr-only">(opens Spotify)</span>
            </span>
          </a>
        ) : null}
        {book ? (
          <div className={s.item}>
            {book.cover ? (
              <span className={`${s.cover} ${s.book}`}>
                <Image src={book.cover} alt={`Cover of ${book.title}`} fill sizes="(max-width: 720px) 48px, 54px" />
              </span>
            ) : (
              <span className={`${s.cover} ${s.book}`} aria-hidden>
                <span className={s.bookAuthor}>{book.author}</span>
                <span className={s.bookDot} />
                <span className={s.bookTitle}>{book.title}</span>
              </span>
            )}
            <span className={s.meta}>
              <span className={s.kicker}>{sethNow.readingKicker}</span>
              <span className={s.title}>
                <span>{book.title}</span>
              </span>
              <span className={s.by}>{book.author}</span>
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
