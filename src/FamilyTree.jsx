import { asset, family } from './data.js';
import './family.css';

const generations = ['पहिली पिढी', 'दुसरी पिढी', 'तिसरी पिढी', 'चौथी पिढी'];

function Person({ person }) {
  const details = [person.relation, person.status].filter(Boolean).join(' · ');
  return (
    <div className="tree-person">
      <img src={asset(`family/${person.avatar}.jpg`)} alt="" width="160" height="160" loading="lazy" />
      <div>
        <strong lang="en">{person.name}</strong>
        <span>{details}</span>
        {person.profession && <small lang="en">{person.profession}</small>}
      </div>
    </div>
  );
}

function Couple({ person, spouse, variant }) {
  return (
    <div className={`tree-card ${variant}`}>
      <Person person={person} />
      {spouse && <Person person={spouse} />}
    </div>
  );
}

function Descendant({ person, index }) {
  return (
    <li className={`tree-descendant${person.children ? ' has-children' : ''}`} style={{ '--child-column': index + 1 }}>
      <Couple person={person} spouse={person.spouse && { name: person.spouse, relation: 'पत्नी', avatar: 'woman' }} variant="tree-third" />
      {person.children && (
        <ul className="tree-young" aria-label={`${person.name} यांची मुलं`}>
          {person.children.map((child) => (
            <li key={child.name}><Couple person={child} variant="tree-fourth" /></li>
          ))}
        </ul>
      )}
    </li>
  );
}

export default function FamilyTree() {
  return (
    <section className="section family" id="family" aria-labelledby="family-title">
      <div className="container" data-reveal>
        <p className="kicker"><span aria-hidden="true" /><span lang="en">Family Tree</span></p>
        <h2 id="family-title">जाधव कुटुंबाचा वंशवृक्ष</h2>
        <p className="family-summary">निवृत्ती आणि भीमाबाई जाधव यांच्यापासून चौथ्या पिढीपर्यंत. चित्रांमध्ये प्रातिनिधिक avatars वापरले आहेत.</p>
        <div className="tree-chart">
          {generations.map((generation, index) => (
            <div className="tree-level" key={generation} style={{ gridRow: index + 1 }} aria-hidden="true"><span>{generation}</span></div>
          ))}
          <div className="tree-root">
            <Couple person={family.owner} spouse={family.spouse} variant="tree-first" />
          </div>
          <ul className="tree-branches" aria-label="निवृत्ती आणि भीमाबाई जाधव यांच्या कुटुंबाच्या शाखा">
            {family.branches.map((branch) => (
              <li className="tree-branch" key={branch.name} style={{ '--branch-width': branch.children.length }}>
                <div className="tree-parent">
                  <Couple
                    person={{ name: branch.name, relation: 'मुलगा', avatar: 'man' }}
                    spouse={{ name: branch.spouse, relation: 'पत्नी', avatar: 'woman' }}
                    variant="tree-second"
                  />
                </div>
                <ul className="tree-children" aria-label={`${branch.name} यांची मुलं`}>
                  {branch.children.map((person, index) => <Descendant key={person.name} person={person} index={index} />)}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
