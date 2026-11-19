import { useEffect, useRef, useState } from 'react';
import { photoSource } from './content.js';

const initialPhotoCount = 6;

export default function Gallery({ title, description, groups }) {
  const [active, setActive] = useState('gallery-2');
  const [expanded, setExpanded] = useState(false);
  const [selected, setSelected] = useState(null);
  const dialog = useRef(null);
  const grid = useRef(null);
  const showNextPhoto = useRef(false);
  const group = groups.find((entry) => entry.id === active) ?? groups[0];
  const items = group?.items ?? [];
  const photos = items.filter((item) => !item.video);
  const selectedIndex = photos.findIndex((photo) => photo.id === selected);
  const selectedPhoto = photos[selectedIndex];
  const visible = expanded ? items : items.slice(0, initialPhotoCount);
  const label = (item, index) => item.caption || `${group.description || group.label} (${index + 1}/${items.length})`;

  useEffect(() => {
    if (selectedPhoto && !dialog.current.open) dialog.current.showModal();
    if (!selectedPhoto && dialog.current.open) dialog.current.close();
  }, [selectedPhoto]);

  useEffect(() => {
    if (expanded && showNextPhoto.current) {
      grid.current.children[initialPhotoCount]?.focus();
      showNextPhoto.current = false;
    }
  }, [expanded]);

  function stepPhoto(step) {
    if (photos.length) setSelected(photos[(selectedIndex + step + photos.length) % photos.length].id);
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
        {groups.map((entry) => (
          <button className="pill" key={entry.id} type="button" aria-controls="gallery-items" aria-pressed={entry.id === group?.id} onClick={() => {
            setActive(entry.id);
            setExpanded(false);
            setSelected(null);
          }}>{entry.label}</button>
        ))}
      </div>
      <div className="gallery-grid" id="gallery-items" key={group?.id} ref={grid}>
        {visible.map((item, index) => item.video ? (
          <figure className="video-tile" key={item.id}>
            <video src={photoSource(item.src)} controls playsInline preload="metadata" aria-label={label(item, index)} />
            <figcaption>{label(item, index)}</figcaption>
          </figure>
        ) : (
          <button className="photo-tile" key={item.id} type="button" onClick={() => setSelected(item.id)}>
            <img src={photoSource(item.thumb || item.src)} alt={label(item, index)} loading="lazy" decoding="async" />
            <span aria-hidden="true">↗</span>
          </button>
        ))}
      </div>
      {!items.length && <p>या गटात अजून फोटो किंवा व्हिडिओ नाहीत.</p>}
      {items.length > initialPhotoCount && (
        <button className="pill gallery-more" type="button" aria-controls="gallery-items" aria-expanded={expanded} onClick={() => {
          showNextPhoto.current = !expanded;
          setExpanded(!expanded);
        }}>{expanded ? 'कमी फोटो दाखवा' : `सर्व ${items.length} पाहा`}</button>
      )}
      {group && <p className="sr-only" role="status">{group.label} · {visible.length}/{items.length}</p>}
      <dialog ref={dialog} className="viewer" aria-labelledby="viewer-caption" onClose={() => setSelected(null)} onClick={(event) => {
        if (event.target === dialog.current) dialog.current.close();
      }} onKeyDown={(event) => {
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
          event.preventDefault();
          stepPhoto(event.key === 'ArrowLeft' ? -1 : 1);
        }
      }}>
        {selectedPhoto && (
          <div className="viewer-inner">
            <button className="viewer-close" type="button" aria-label="फोटो बंद करा" autoFocus onClick={() => dialog.current.close()}>×</button>
            <button type="button" aria-label="मागचा फोटो" onClick={() => stepPhoto(-1)}>‹</button>
            <figure>
              <img src={photoSource(selectedPhoto.src)} alt={selectedPhoto.caption || group.description} />
              <figcaption id="viewer-caption" aria-live="polite">{label(selectedPhoto, items.indexOf(selectedPhoto))}</figcaption>
            </figure>
            <button type="button" aria-label="पुढचा फोटो" onClick={() => stepPhoto(1)}>›</button>
          </div>
        )}
      </dialog>
    </section>
  );
}
