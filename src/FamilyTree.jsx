import { family } from './data.js';
import './family.css';

const generations = ['पहिली पिढी', 'दुसरी पिढी', 'तिसरी पिढी', 'चौथी पिढी'];

/* CHANGE #1 — inline asset helper (data.js no longer exports it) */
const asset = (path) => `${import.meta.env.BASE_URL}assets/${path}`;

function Person({ person }) {
  const details = [person.relation, person.status].filter(Boolean).join(' · ');
  const avatar = person.avatar || 'man';
  return (
    <div className="tree-person">
      <img
        src={asset(`family/${avatar}.jpg`)}
        alt=""
        width="160"
        height="160"
        loading="lazy"
      />
      <div>
        <strong>{person.name}</strong>
        {details && <span>{details}</span>}
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

/* CHANGE #2 — derive spouse label/avatar from the child's gender */
function spousePerson(person) {
  if (!person.spouse) return null;
  const personIsFemale = person.avatar === 'woman' || person.avatar === 'girl' || person.relation === 'मुलगी';
  return {
    name: person.spouse,
    relation: personIsFemale ? 'पती' : 'पत्नी',
    avatar: personIsFemale ? 'man' : 'woman',
  };
}

function Descendant({ person, index }) {
  const children = Array.isArray(person.children) ? person.children : [];
  return (
    <li
      className={`tree-descendant${children.length ? ' has-children' : ''}`}
      style={{ '--child-column': index + 1 }}
    >
      <Couple
        person={person}
        spouse={spousePerson(person)}   /* CHANGE #3 — renamed spouse survives */
        variant="tree-third"
      />
      {children.length > 0 && (                  /* CHANGE #4 — [] is not "has children" */
        <ul className="tree-young" aria-label={`${person.name} यांची मुलं`}>
          {children.map((child, childIndex) => (
            <li key={`${child.name}-${childIndex}`}>
              <Couple person={child} variant="tree-fourth" />
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

export default function FamilyTree({ title, labels = {} }) {
  /* CHANGE #5 — optional chaining so a missing labels object is safe */
  const rename = (person) => ({
    ...person,
    name: labels?.[person.name]?.trim() || person.name,
  });

  const renameSpouse = (name) => labels?.[name]?.trim() || name;

  const branches = family.branches.map((branch) => ({
    ...rename(branch),
    spouse: renameSpouse(branch.spouse),
    children: branch.children.map((person) => ({
      ...rename(person),
      spouse: renameSpouse(person.spouse),
      children: person.children?.map((child) => rename(child)),  /* CHANGE #6 — explicit arrow, not `.map(rename)` */
    })),
  }));

  return (
    <section className="section family" id="family" aria-labelledby="family-title">
      <div className="container" data-reveal>
        <p className="kicker"><span aria-hidden="true" /><span lang="en">Family Tree</span></p>
        <h2 id="family-title">{title || 'कुटुंबाचा वंशवृक्ष'}</h2>
        <p className="family-summary">
          निवृत्ती आणि भीमाबाई जाधव यांच्यापासून चौथ्या पिढीपर्यंत. चित्रांमध्ये प्रातिनिधिक avatars वापरले आहेत.
        </p>
        <div className="tree-chart">
          {generations.map((generation, index) => (
            <div className="tree-level" key={generation} style={{ gridRow: index + 1 }} aria-hidden="true">
              <span>{generation}</span>
            </div>
          ))}
          <div className="tree-root">
            <Couple person={rename(family.owner)} spouse={rename(family.spouse)} variant="tree-first" />
          </div>
          <ul className="tree-branches" aria-label="निवृत्ती आणि भीमाबाई जाधव यांच्या कुटुंबाच्या शाखा">
            {branches.map((branch) => (
              <li
                className="tree-branch"
                key={branch.name}
                /* CHANGE #7 — span at least 1 column so the grid doesn't collapse */
                style={{ '--branch-width': Math.max(1, branch.children.length) }}
              >
                <div className="tree-parent">
                  <Couple
                    person={{ name: branch.name, relation: 'मुलगा', avatar: 'man' }}
                    spouse={branch.spouse && {
                      name: branch.spouse,
                      relation: 'पत्नी',
                      avatar: 'woman',
                    }}
                    variant="tree-second"
                  />
                </div>
                <ul className="tree-children" aria-label={`${branch.name} यांची मुलं`}>
                  {branch.children.map((person, index) => (
                    <Descendant key={person.name} person={person} index={index} />
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}