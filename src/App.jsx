import { useEffect, useRef, useState } from 'react';
import { asset, crops, varieties } from './data.js';
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

function Hero() {
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
          <Kicker>ऐश्वर्य फार्म्स · कुंभारी, महाराष्ट्र</Kicker>
          <h1 id="hero-title" lang="en">Rooted in <em>Kumbhari.</em></h1>
          <p>कुंभारीतली जाधव कुटुंबाची १० एकर शेती. आमच्या द्राक्षबागेची, इतर पिकांची आणि शेती सांभाळणाऱ्या कुटुंबाची ओळख.</p>
          <div className="actions">
            <a className="pill primary" href="#farm" lang="en">Explore the farm <span aria-hidden="true">↓</span></a>
            <a className="quiet-link" href="#family">आमचं कुटुंब <span aria-hidden="true">↗</span></a>
          </div>
        </div>
        <figure className="hero-art">
          <img src={asset('farm/73.jpg')} alt="ऐश्वर्य फार्म्समधील द्राक्षवेलींच्या रांगा आणि हिरवे घड" fetchPriority="high" />
          <figcaption className="glass"><span aria-hidden="true">●</span> ऐश्वर्य फार्म्सची द्राक्षबाग</figcaption>
        </figure>
      </section>
      <div className="container hero-bottom">
        <dl className="farm-stats glass">
          <div><dt lang="en">Total farmland</dt><dd>10 <small>एकर</small></dd></div>
          <div><dt lang="en">Grape plots</dt><dd>7 <small>एकर</small></dd></div>
          <div><dt lang="en">Other crops</dt><dd>3 <small>एकर</small></dd></div>
        </dl>
        <button className="sky-toggle glass" type="button" onClick={() => setPaused(!paused)} lang="en">
          <span aria-hidden="true">{paused ? '▶' : 'Ⅱ'}</span>{paused ? 'Play sky' : 'Pause sky'}
        </button>
      </div>
    </div>
  );
}

function Farm() {
  return (
    <section className="container section farm" id="farm" aria-labelledby="farm-title" data-reveal>
      <figure className="farm-photo">
        <img src={asset('farm/78.jpg')} alt="ऐश्वर्य फार्म्सच्या शेतावरचं इंद्रधनुष्य" loading="lazy" />
      </figure>
      <div className="farm-copy">
        <Kicker><span lang="en">The Farm</span></Kicker>
        <h2 id="farm-title">कुंभारीतली आमची शेती</h2>
        <p>एकूण १० एकरांपैकी ७ एकरांवर द्राक्षबाग आहे. उरलेल्या ३ एकरांत गहू, टोमॅटो आणि कांदा पिकवतो. शेतातील सर्व प्लॉट्सचं व्यवस्थापन <strong lang="en">Sachin Madhukar Jadhav</strong> पाहतात.</p>
        <div className="variety-block">
          <h3>द्राक्षांचे वाण <span lang="en">Grape Varieties</span></h3>
          <ul lang="en">{varieties.map((variety) => <li key={variety}>{variety}</li>)}</ul>
        </div>
      </div>
    </section>
  );
}

function Crops() {
  return (
    <section className="crop-section section" id="crops" aria-labelledby="crop-title">
      <div className="container" data-reveal>
        <Kicker><span lang="en">Our Crops</span></Kicker>
        <h2 id="crop-title">आमच्या शेतात काय पिकतं?</h2>
        <div className="crop-grid">
          {crops.map((crop) => (
            <article className="crop-card glass" key={crop.english}>
              <figure>
                <img src={asset(crop.photo)} alt={crop.alt} loading="lazy" />
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
      <Hero />
      <main id="main">
        <Farm />
        <Crops />
        <Gallery />
        <FamilyTree />
        <Visit />
      </main>
      <footer className="container footer">
        <p lang="en">© 2026 Aishwary Farms</p>
        <a href="#top">वर जा <span aria-hidden="true">↑</span></a>
      </footer>
    </>
  );
}
