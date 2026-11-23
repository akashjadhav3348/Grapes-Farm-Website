import { useEffect, useMemo, useRef, useState } from 'react';
import AdminAccess from './AdminAccess.jsx';
import { browserChannel, browserContent, initialContent, parseContent, photoSource, readPublishedContent } from './content.js';
import Gallery from './Gallery.jsx';
import FamilyTree from './FamilyTree.jsx';
import Visit from './Visit.jsx';
import { FarmingStory } from './FarmRegister.jsx';
import './landing.css';
import './reference-design.css';
import './dashboard-reference.css';
import './dashboard-forms.css';

function isAdminPath(pathname = window.location.pathname, search = window.location.search) {
  const path = pathname.replace(/\/+$/, '') || '/';
  if (path === '/login' || path === '/admin' || path.startsWith('/admin/')) return true;
  return new URLSearchParams(search).get('admin') === '1';
}

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
          <a href="#story">Story</a>
          <a href="#crops">Crops</a>
          <a href="#gallery">Gallery</a>
          <a href="#family">Family</a>
        </nav>
        <div className="nav-visit flex flex-wrap justify-end gap-2" lang="en">
          <a className="pill" href="#visit">Find us <span aria-hidden="true">↗</span></a>
          <a className="pill primary" href="/login">Login</a>
        </div>
      </div>
    </header>
  );
}

function Hero({ content }) {
  const sky = useRef(null);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const element = sky.current;
    if (!element) return;
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
          <strong lang="en">Aishwary Farms — Rooted in Tradition, Growing with Love</strong>
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
        <img src={photoSource(content.image)} alt={content.alt ?? 'ऐश्वर्य फार्म्स'} loading="lazy" />
      </figure>
      <div className="farm-copy">
        <Kicker><span lang="en">The Farm</span></Kicker>
        <h2 id="farm-title">{content.title}</h2>
        <p>{content.description}</p>
        <div className="variety-block">
          <h3>द्राक्षांचे वाण <span lang="en">Grape Varieties</span></h3>
          <ul lang="en">
            {content.varieties.filter(Boolean).map((variety, index) => <li key={index}>{variety}</li>)}
          </ul>
        </div>
      </div>
    </section>
  );
}

function Crops({ title, crops }) {
  const visible = crops.filter(crop => crop && crop.visible !== false);
  return (
    <section className="crop-section section" id="crops" aria-labelledby="crop-title">
      <div className="container" data-reveal>
        <Kicker><span lang="en">Our Crops</span></Kicker>
        <h2 id="crop-title">{title}</h2>
        <div className="mt-7 grid grid-cols-1 gap-4 min-[366px]:grid-cols-2 min-[1001px]:grid-cols-4">
          {visible.map((crop) => (
            <article className="crop-card glass" key={crop.id}>
              {crop.photo && <figure>
                <img src={photoSource(crop.photo)} alt={crop.alt} loading="lazy" />
                {crop.illustrative && <figcaption>प्रातिनिधिक छायाचित्र</figcaption>}
              </figure>}
              <div className="crop-copy">
                <p className="small-caps" lang="en">{crop.english}</p>
                <h3>{crop.name}</h3>
                <p>{crop.description}</p>
                {crop.season && <p>{crop.season}</p>}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function App() {
  const [admin, setAdmin] = useState(() => isAdminPath());
  const [content, setContent] = useState(initialContent);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    function sync() { setAdmin(isAdminPath()); }
    window.addEventListener('popstate', sync);
    return () => window.removeEventListener('popstate', sync);
  }, []);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    async function load() {
      const local = await browserContent()
        .then((value) => value && parseContent(value))
        .catch((err) => {
          console.warn('[App] Local content is corrupt; falling back.', err);
          return null;
        });
      const next = local ?? await readPublishedContent({ signal: controller.signal })
        .catch((err) => {
          if (err.name !== 'AbortError') console.warn('[App] Could not load published content.', err);
          return null;
        });
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
      controller.abort();
      channel?.close();
    };
  }, [admin]);

  useEffect(() => {
    if (admin) return;
    const sectionId = window.location.hash.slice(1);
    if (sectionId) document.getElementById(sectionId)?.scrollIntoView({ behavior: 'auto' });

    if (!window.IntersectionObserver || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.remove('awaiting-reveal');
        observer.unobserve(entry.target);
      }
    }, { rootMargin: '0px 0px 8% 0px', threshold: 0.1 });

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
  }, [admin, ready]);

  const adminView = useMemo(
    () => <AdminAccess content={content} onChange={setContent} ready={ready} />,
    [content, ready]
  );

  if (admin) return adminView;

  return (
    <div className="public-site" id="top">
      <a className="skip-link" href="#main">मुख्य मजकुराकडे जा</a>
      <Hero content={content.hero} />
      <main id="main">
        <Farm content={content.farm} />
        <FarmingStory content={content} />
        <Crops title={content.cropTitle} crops={content.crops} />
        <Gallery title={content.galleryTitle} description={content.galleryDescription} groups={content.gallery.map(group => ({...group, items:group.items.filter(item=>item.visible !== false)})).filter(group=>group.items.length)} />
        <FamilyTree title={content.familyTitle} labels={content.familyLabels} />
        <Visit content={content.visit} />
      </main>
      <footer className="container footer">
        <p lang="en">© 2026 Aishwary Farms</p>
        <a href="#top">वर जा <span aria-hidden="true">↑</span></a>
      </footer>
    </div>
  );
}
