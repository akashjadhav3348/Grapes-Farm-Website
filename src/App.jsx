import { useEffect, useRef, useState } from 'react';
import Admin from './Admin.jsx';
import { browserChannel, browserContent, initialContent, parseContent, photoSource, readPublishedContent } from './content.js';
import Gallery from './Gallery.jsx';
import FamilyTree from './FamilyTree.jsx';
import Visit from './Visit.jsx';


function Kicker({ children }) {
  return <p className="kicker"><span aria-hidden="true" />{children}</p>;
}

function Brand() {
  return (
    <a className="brand" href="#top" aria-label="Aishwary Farms मुख्यपृष्ठ">
      <span className="brand-mark" aria-hidden="true"><i /><i /><i /><i /><i /><i /></span>
      <span><strong lang="en">Aishwary Farms</strong><small>ऐश्वर्य फार्म्स</small></span>
    </a>
  );
}

function Header() {
  return (
    <header className="header">
      <div className="container masthead glass">
        <Brand />
        <nav aria-label="मुख्य मेनू" lang="en">
          <a href="#farm">The Farm</a>
          <a href="#crops">Crops</a>
          <a href="#gallery">Gallery</a>
          <a href="#family">Family</a>
        </nav>
        <a className="pill nav-visit" href="#visit" lang="en">Find us <span aria-hidden="true">↗</span></a>
      </div>
    </header>
  );
}

function Hero({ content }) {
  const sky = useRef(null);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const element = sky.current;
    if (paused || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let frame;
    function update() {
      frame = undefined;
      element.style.setProperty('--sky-offset', `${Math.min(window.scrollY * 0.32, 250)}px`);
    }
    function onScroll() {
      if (frame === undefined) frame = requestAnimationFrame(update);
    }
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame !== undefined) cancelAnimationFrame(frame);
    };
  }, [paused]);

  return (
    <div className="sky-scene" ref={sky} data-paused={paused}>
      <div className="sky" aria-hidden="true">
        <span className="cloud cloud-one" />
        <span className="cloud cloud-two" />
        <span className="cloud cloud-three" />
      </div>
      <Header />
      <section className="container hero" aria-labelledby="hero-title">
        <div className="hero-copy">
          <Kicker>{content.eyebrow}</Kicker>
          <h1 id="hero-title">{content.title} <em>{content.accent}</em></h1>
          <p>{content.description}</p>
          <div className="actions">
            <a className="pill primary" href="#farm" lang="en">Explore the farm <span aria-hidden="true">↓</span></a>
            <a className="quiet-link" href="#family">आमचं कुटुंब <span aria-hidden="true">↗</span></a>
          </div>
        </div>
        <figure className="hero-art">
          <img src={photoSource(content.image)} alt={content.caption} fetchPriority="high" />
          <figcaption className="glass"><span aria-hidden="true">●</span> {content.caption}</figcaption>
        </figure>
      </section>
      <div className="container hero-bottom">
        <dl className="farm-stats glass">
          <div><dt lang="en">Total farmland</dt><dd>{content.acres[0]} <small>एकर</small></dd></div>
          <div><dt lang="en">Grape plots</dt><dd>{content.acres[1]} <small>एकर</small></dd></div>
          <div><dt lang="en">Other crops</dt><dd>{content.acres[2]} <small>एकर</small></dd></div>
        </dl>
        <button className="sky-toggle glass" type="button" onClick={() => setPaused(!paused)} lang="en">
          <span aria-hidden="true">{paused ? '▶' : 'Ⅱ'}</span>{paused ? 'Play sky' : 'Pause sky'}
        </button>
      </div>
    </div>
  );
}

function Farm({ content }) {
  return (
    <section className="container section farm" id="farm" aria-labelledby="farm-title" data-reveal>
      <figure className="farm-photo">
        <img src={photoSource(content.image)} alt="ऐश्वर्य फार्म्स" loading="lazy" />
      </figure>
      <div className="farm-copy">
        <Kicker><span lang="en">The Farm</span></Kicker>
        <h2 id="farm-title">{content.title}</h2>
        <p>{content.description}</p>
        <div className="variety-block">
          <h3>द्राक्षांचे वाण <span lang="en">Grape Varieties</span></h3>
          <ul lang="en">{content.varieties.filter(Boolean).map((variety, index) => <li key={index}>{variety}</li>)}</ul>
        </div>
      </div>
    </section>
  );
}

function Crops({ title, crops }) {
  return (
    <section className="crop-section section" id="crops" aria-labelledby="crop-title">
      <div className="container" data-reveal>
        <Kicker><span lang="en">Our Crops</span></Kicker>
        <h2 id="crop-title">{title}</h2>
        <div className="mt-7 grid grid-cols-1 gap-4 min-[366px]:grid-cols-2 min-[1001px]:grid-cols-4">
          {crops.map((crop) => (
            <article className="crop-card glass" key={crop.id}>
              <figure>
                <img src={photoSource(crop.photo)} alt={crop.alt} loading="lazy" />
                {crop.illustrative && <figcaption>प्रातिनिधिक छायाचित्र</figcaption>}
              </figure>
              <div className="crop-copy">
                <p className="small-caps" lang="en">{crop.english}</p>
                <h3>{crop.name}</h3>
                <p>{crop.description}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function App() {
  const admin = new URLSearchParams(window.location.search).get('admin') === '1';
  const [content, setContent] = useState(initialContent);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      const local = await browserContent().then((value) => value && parseContent(value)).catch(() => null);
      const next = local ?? await readPublishedContent().catch(() => null);
      if (active) {
        setContent(next ?? initialContent);
        setReady(true);
      }
    }
    const channel = 'BroadcastChannel' in window ? new BroadcastChannel(browserChannel) : null;
    if (channel && !admin) channel.onmessage = load;
    void load();
    return () => {
      active = false;
      channel?.close();
    };
  }, [admin]);

  useEffect(() => {
    const sectionId = window.location.hash.slice(1);
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'instant' });

    if (!window.IntersectionObserver || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.remove('awaiting-reveal');
        observer.unobserve(entry.target);
      }
    }, { rootMargin: '0px 0px 8% 0px' });
    const sections = document.querySelectorAll('[data-reveal]');
    for (const section of sections) {
      if (section.getBoundingClientRect().top < window.innerHeight) continue;
      section.classList.add('awaiting-reveal');
      observer.observe(section);
    }
    return () => {
      observer.disconnect();
      sections.forEach((section) => section.classList.remove('awaiting-reveal'));
    };
  }, []);

  return (
    <>
      <a className="skip-link" href="#main">मुख्य मजकुराकडे जा</a>
      {admin && <Admin content={content} onChange={setContent} ready={ready} />}
      <div id="live-preview">
      <Hero content={content.hero} />
      <main id="main">
        <Farm content={content.farm} />
        <Crops title={content.cropTitle} crops={content.crops} />
        <Gallery title={content.galleryTitle} description={content.galleryDescription} groups={content.gallery} />
        <FamilyTree title={content.familyTitle} labels={content.familyLabels} />
        <Visit content={content.visit} />
      </main>
      <footer className="container footer">
        <p lang="en">© 2026 Aishwary Farms</p>
        <a href={admin ? "./" : "?admin=1"}>{admin ? "मुख्य साइट" : "Admin"}</a>
      </footer>
      </div>
    </>
  );
}
