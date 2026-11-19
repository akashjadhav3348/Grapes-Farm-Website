const map = 'https://www.google.com/maps?cid=14735875485989078467';
const mapEmbed = 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3745.306375244361!2d74.0887357!3d20.1629652!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bddcf658e490c6d%3A0xcc8058ae34c405c3!2sAishwary%20Farms!5e0!3m2!1sen!2sin!4v1795012605741!5m2!1sen!2sin';

export default function Visit({ content }) {
  return (
    <section className="container section visit-section" id="visit" aria-labelledby="visit-title" data-reveal>
      <div className="visit glass">
        <div className="visit-info">
          <p className="kicker"><span aria-hidden="true" /><span lang="en">Visit &amp; Contact</span></p>
          <h2 id="visit-title">{content.title}</h2>
          <address>{content.address}</address>
          <p>{content.description}</p>
          <ul className="phone-links" aria-label="संपर्क क्रमांक">
            {content.phones.filter((phone) => /\d/.test(phone)).map((display, index) => (
              <li key={index}><a href={`tel:${display.startsWith("+") ? "" : "+91"}${display.replace(/[^+\d]/g, "")}`}><span aria-hidden="true">☎</span><span lang="en">{display}</span></a></li>
            ))}
          </ul>
          <div className="farm-security">
            <span className="security-icon" aria-hidden="true">◉</span>
            <div><strong lang="en">CCTV Security</strong><p>{content.security}</p></div>
          </div>
        </div>
        <div className="visit-map">
          <iframe src={mapEmbed} title="ऐश्वर्य फार्म्सचा Google Maps नकाशा" loading="lazy" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen />
          <a className="pill primary" href={map}>Google Maps वर दिशा पाहा <span aria-hidden="true">↗</span></a>
        </div>
      </div>
    </section>
  );
}
