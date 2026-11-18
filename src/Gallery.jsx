import { useEffect, useRef, useState } from 'react';
import { asset, galleryGroups } from './data.js';

const initialPhotoCount = 6;

function fileName(id, extension) {
  return `${String(id).padStart(2, '0')}.${extension}`;
}

function label(group, index) {
  return `${group.description} (${index + 1}/${group.ids.length})`;
}

export default function Gallery() {
  const [active, setActive] = useState(2);
  const [expanded, setExpanded] = useState(false);
  const [selected, setSelected] = useState(null);
  const dialog = useRef(null);
  const grid = useRef(null);
  const showNextPhoto = useRef(false);
  const group = galleryGroups[active];
  const ids = expanded ? group.ids : group.ids.slice(0, initialPhotoCount);

  useEffect(() => {
    if (selected !== null && !dialog.current.open) dialog.current.showModal();
  }, [selected]);

  useEffect(() => {
    if (expanded && showNextPhoto.current) {
      grid.current.children[initialPhotoCount]?.focus();
      showNextPhoto.current = false;
    }
  }, [expanded]);

  function selectGroup(index) {
    if (index === active) return;
    setActive(index);
    setExpanded(false);
  }

  function stepPhoto(step) {
    setSelected((index) => (index + step + group.ids.length) % group.ids.length);
  }

  return (
    <section className="container section gallery" id="gallery" aria-labelledby="gallery-title" data-reveal>
      <div className="section-heading">
        <div>
          <p className="kicker"><span aria-hidden="true" /><span lang="en">Farm Gallery</span></p>
          <h2 id="gallery-title">पालवीपासून तोडणीपर्यंत</h2>
        </div>
        <p>नवी पालवी, वेलीवरचे घड आणि तोडणीनंतरची क्रेट्स. शेतातले खरे फोटो आणि व्हिडिओ.</p>
      </div>
      <div className="gallery-controls" role="group" aria-label="फोटो आणि व्हिडिओचे गट">
        {galleryGroups.map(({ label }, index) => (
          <button className="pill" key={label} type="button" aria-controls="gallery-items" aria-pressed={index === active} onClick={() => selectGroup(index)}>
            {label}
          </button>
        ))}
      </div>
      <div className="gallery-grid" id="gallery-items" key={active} ref={grid}>
        {ids.map((id, index) => group.video ? (
          <figure className="video-tile" key={id}>
            <video src={asset(`farm/${fileName(id, 'mp4')}`)} controls playsInline preload="metadata" aria-label={label(group, index)} />
            <figcaption>{label(group, index)}</figcaption>
          </figure>
        ) : (
          <button className="photo-tile" key={id} type="button" onClick={() => setSelected(index)}>
            <img src={asset(`thumb/${fileName(id, 'jpg')}`)} alt={label(group, index)} loading="lazy" decoding="async" />
            <span aria-hidden="true">↗</span>
          </button>
        ))}
      </div>
      {group.ids.length > initialPhotoCount && (
        <button className="pill gallery-more" type="button" aria-controls="gallery-items" aria-expanded={expanded} onClick={() => {
          showNextPhoto.current = !expanded;
          setExpanded(!expanded);
        }}>
          {expanded ? 'कमी फोटो दाखवा ↑' : `सर्व ${group.ids.length} फोटो पाहा ↓`}
        </button>
      )}
      <p className="sr-only" role="status">{group.label} · {ids.length}/{group.ids.length}</p>

      <dialog ref={dialog} className="viewer" aria-labelledby="viewer-caption" onClose={() => setSelected(null)} onClick={(event) => {
        if (event.target === dialog.current) dialog.current.close();
      }} onKeyDown={(event) => {
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
          event.preventDefault();
          stepPhoto(event.key === 'ArrowLeft' ? -1 : 1);
        }
      }}>
        {selected !== null && (
          <div className="viewer-inner">
            <button className="viewer-close" type="button" aria-label="फोटो बंद करा" autoFocus onClick={() => dialog.current.close()}>×</button>
            <button type="button" aria-label="मागचा फोटो" onClick={() => stepPhoto(-1)}>‹</button>
            <figure>
              <img src={asset(`farm/${fileName(group.ids[selected], 'jpg')}`)} alt={group.description} />
              <figcaption id="viewer-caption" aria-live="polite">{label(group, selected)}</figcaption>
            </figure>
            <button type="button" aria-label="पुढचा फोटो" onClick={() => stepPhoto(1)}>›</button>
          </div>
        )}
      </dialog>
    </section>
  );
}
