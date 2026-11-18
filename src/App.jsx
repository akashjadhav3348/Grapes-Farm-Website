import { useEffect, useRef, useState } from 'react';
import { asset, crops, family, varieties } from './data.js';
import Gallery from './Gallery.jsx';

const directions = 'https://www.google.com/maps/search/?api=1&query=Aishwary+Farms%2C+Kumbhari%2C+Maharashtra';

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
          <Kicker>कुंभारी, महाराष्ट्र</Kicker>
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
        <p>एकूण १० एकरांपैकी ७ एकरांवर द्राक्षबाग आहे. उरलेल्या ३ एकरांत गहू, टोमॅटो आणि कांदा पिकवतो. शेतातील सर्व प्लॉट्सचं व्यवस्थापन <strong lang="en">Sachin Jadhav</strong> पाहतात.</p>
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

function Family() {
  return (
    <section className="section family" id="family" aria-labelledby="family-title">
      <div className="container" data-reveal>
        <Kicker><span lang="en">Family Tree</span></Kicker>
        <h2 id="family-title">जाधव कुटुंब</h2>
        <div className="family-root glass">
          <p className="small-caps">कुटुंबप्रमुख व शेतमालक</p>
          <h3 lang="en">{family.owner}</h3>
          <p lang="en">{family.spouse}</p>
        </div>
        <ul className="family-branches">
          {family.branches.map((branch) => (
            <li className="branch glass" key={branch.name}>
              <h3 lang="en">{branch.name}</h3>
              <p className="branch-spouse" lang="en">{branch.spouse}</p>
              <ul className="branch-children" aria-label="मुलं">
                {branch.children.map((person) => (
                  <li className="person" key={person.name}>
                    <h4 lang="en">{person.name}</h4>
                    {person.profession && <p className="profession" lang="en">{person.profession}</p>}
                    {person.spouse && <p className="person-meta">पत्नी <span lang="en">{person.spouse}</span></p>}
                    {person.status && <p className="person-meta">{person.status}</p>}
                    {person.children && (
                      <ul className="next-generation" aria-label="पुढची पिढी">
                        {person.children.map(({ name, relation }) => (
                          <li key={name}><span lang="en">{name}</span><small>{relation}</small></li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Visit() {
  return (
    <section className="container section" id="visit" aria-labelledby="visit-title" data-reveal>
      <div className="visit glass">
        <div>
          <Kicker><span lang="en">Find Us</span></Kicker>
          <h2 id="visit-title">कुंभारीत भेटूया</h2>
          <address>Aishwary Farms · कुंभारी, महाराष्ट्र</address>
          <p>शेताला भेट देण्यापूर्वी किंवा पिकांच्या उपलब्धतेसाठी फोन करा.</p>
        </div>
        <div className="actions">
          <a className="pill primary" href="tel:+917218794501">फोन करा <span lang="en">072187 94501</span></a>
          <a className="quiet-link" href={directions}>Maps वर शोधा <span aria-hidden="true">↗</span></a>
        </div>
      </div>
    </section>
  );
}

export default function App() {
  useEffect(() => {
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
        <Family />
        <Visit />
      </main>
      <footer className="container footer">
        <p lang="en">© 2026 Aishwary Farms</p>
        <a href="#top">वर जा <span aria-hidden="true">↑</span></a>
      </footer>
    </>
  );
}
