import { useEffect, useRef, useState } from 'react';
import { photoSource } from './content.js';

const initialPhotoCount = 6;

export default function Gallery({ title, description, groups }) {
  const safeGroups = groups ?? [];
  const [active, setActive] = useState(() => safeGroups[0]?.id ?? '');
  const [expanded, setExpanded] = useState(false);
  const [selected, setSelected] = useState(null);
  const dialog = useRef(null);
  const grid = useRef(null);
  const showNextPhoto = useRef(false);

  const group = safeGroups.find((entry) => entry.id === active) ?? safeGroups[0];
  const items = group?.items ?? [];
  const photos = items.filter((item) => !item.video);

  const selectedIndex = photos.findIndex((photo) => photo.id === selected);
  const selectedPhoto = selectedIndex >= 0 ? photos[selectedIndex] : null;

  const visible = expanded ? items : items.slice(0, initialPhotoCount);

  /* Caption for a photo — numbered against photos, not videos */
  const photoLabel = (photo) => {
    const i = photos.indexOf(photo);
    return photo.caption
      || `${group?.description || group?.label || 'Gallery'} (${i + 1}/${photos.length})`;
  };
  /* Caption for any item (photo or video) in the grid */
  const itemLabel = (item, index) =>
    item.caption
      || `${group?.description || group?.label || 'Gallery'} (${index + 1}/${items.length})`;

  /* Open/close dialog in sync with selection */
  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (selectedPhoto && !element.open) element.showModal();
    if (!selectedPhoto && element.open) element.close();
  }, [selectedPhoto]);

  /* After expanding, focus the first newly-shown tile */
  useEffect(() => {
    if (!expanded || !showNextPhoto.current) return;
    showNextPhoto.current = false;
    const firstNew = grid.current?.children?.[initialPhotoCount];
    if (!firstNew) return;
    const focusable = firstNew.querySelector('button, video, [tabindex]') ?? firstNew;
    focusable.focus?.();
  }, [expanded]);

  function stepPhoto(step) {
    if (!selectedPhoto || photos.length < 2) return;
    setSelected(photos[(selectedIndex + step + photos.length) % photos.length].id);
  }

  function jumpPhoto(target) {
    if (photos.length < 2) return;
    setSelected(target.id);
  }

  function closeViewer() {
    dialog.current?.close();
    setSelected(null);
  }

  return (
    <section className="container section gallery" id="gallery" aria-labelledby="gallery-title" data-reveal>
      <div className="section-heading">
        <div>
          <p className="kicker"><span aria-hidden="true" /><span lang="en">Farm Gallery</span></p>
          <h2 id="gallery-title">{title}</h2>
        </div>
        <p>{description}</p>
      </div>

      <div className="gallery-controls" role="group" aria-label="फोटो आणि व्हिडिओचे गट">
        {safeGroups.map((entry) => (
          <button
            className="pill"
            key={entry.id}
            type="button"
            aria-controls="gallery-items"
            aria-pressed={entry.id === group?.id}
            onClick={() => {
              if (entry.id === active) return;
              setActive(entry.id);
              setExpanded(false);
              setSelected(null);
            }}
          >
            {entry.label}
          </button>
        ))}
      </div>

      <div className="gallery-grid" id="gallery-items" key={group?.id} ref={grid}>
        {visible.map((item, index) => item.video ? (
          <figure className="video-tile" key={item.id}>
            <video
              src={photoSource(item.src)}
              poster={item.thumb ? photoSource(item.thumb) : undefined}
              controls
              playsInline
              preload="metadata"
            />
            <figcaption>{itemLabel(item, index)}</figcaption>
          </figure>
        ) : (
          <button
            className="photo-tile"
            key={item.id}
            type="button"
            onClick={() => setSelected(item.id)}
            aria-label={itemLabel(item, index)}
          >
            <span className="photo-tile-media">
              <img
                src={photoSource(item.thumb || item.src)}
                alt=""
                loading="lazy"
                decoding="async"
              />
            </span>
            <span className="photo-tile-zoom" aria-hidden="true">↗</span>
          </button>
        ))}
      </div>

      {!items.length && <p className="gallery-empty">या गटात अजून फोटो किंवा व्हिडिओ नाहीत.</p>}

      {items.length > initialPhotoCount && (
        <button
          className="pill gallery-more"
          type="button"
          aria-controls="gallery-items"
          aria-expanded={expanded}
          onClick={() => {
            showNextPhoto.current = !expanded;
            setExpanded(!expanded);
          }}
        >
          {expanded ? 'कमी फोटो दाखवा' : `सर्व ${items.length} पाहा`}
        </button>
      )}

      {group && (
        <p className="sr-only" role="status" aria-live="polite">
          {group.label} · {visible.length}/{items.length}
        </p>
      )}

      <dialog
        ref={dialog}
        className="viewer"
        aria-labelledby="viewer-caption"
        onClose={() => setSelected(null)}
        onClick={(event) => {
          /* Close only when the click lands on the dialog's own backdrop,
             not on any descendant (fixes accidental closes on padding). */
          if (event.target === event.currentTarget) closeViewer();
        }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowLeft') { event.preventDefault(); stepPhoto(-1); }
          else if (event.key === 'ArrowRight') { event.preventDefault(); stepPhoto(1); }
          else if (event.key === 'Home') { event.preventDefault(); if (photos[0]) jumpPhoto(photos[0]); }
          else if (event.key === 'End') { event.preventDefault(); if (photos.length) jumpPhoto(photos[photos.length - 1]); }
        }}
      >
        {selectedPhoto && (
          <div className="viewer-inner">
            <button className="viewer-close" type="button" aria-label="फोटो बंद करा" onClick={closeViewer}>×</button>

            {photos.length > 1 && (
              <button type="button" className="viewer-nav viewer-prev" aria-label="मागचा फोटो" onClick={() => stepPhoto(-1)}>‹</button>
            )}

            <figure>
              <img
                src={photoSource(selectedPhoto.src)}
                alt={selectedPhoto.caption || group?.description || ''}
              />
              <figcaption id="viewer-caption">
                {photoLabel(selectedPhoto)}
              </figcaption>
            </figure>

            {photos.length > 1 && (
              <button type="button" className="viewer-nav viewer-next" aria-label="पुढचा फोटो" onClick={() => stepPhoto(1)}>›</button>
            )}

            {/* Announce photo changes (not the initial open — figcaption is read on focus) */}
            <p className="sr-only" aria-live="polite">
              {photoLabel(selectedPhoto)}
            </p>
          </div>
        )}
      </dialog>
    </section>
  );
}