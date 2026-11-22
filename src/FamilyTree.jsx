import { family } from './data.js';
import './family.css';

const generations = ['पहिली पिढी', 'दुसरी पिढी', 'तिसरी पिढी', 'चौथी पिढी'];
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
        decoding="async"
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

/* Derive spouse label/avatar from the person's gender */
function spousePerson(person) {
  if (!person.spouse) return null;
  const personIsFemale =
    person.avatar === 'woman' ||
    person.avatar === 'girl' ||
    person.relation === 'मुलगी';
  return {
    name: person.spouse,
    relation: personIsFemale ? 'पती' : 'पत्नी',
    avatar: personIsFemale ? 'man' : 'woman',
  };
}

function Descendant({ person }) {
  const children = Array.isArray(person.children) ? person.children : [];
  return (
    <li className={`tree-descendant${children.length ? ' has-children' : ''}`}>
      <Couple person={person} spouse={spousePerson(person)} variant="tree-third" />
      {children.length > 0 && (
        <ul className="tree-young" aria-label={`${person.name} यांची मुलं`}>
          {children.map((child, i) => (
            <li key={`${child.name}-${i}`}>
              <Couple person={child} variant="tree-fourth" />
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

export default function FamilyTree({ title, labels = {} }) {
  const rename = (person) => ({
    ...person,
    name: labels?.[person?.name]?.trim() || person?.name,
  });
  const renameSpouse = (name) =>
    name ? labels?.[name]?.trim() || name : undefined;

  const branchList = Array.isArray(family?.branches) ? family.branches : [];

  const branches = branchList.map((branch) => {
    const children = Array.isArray(branch.children) ? branch.children : [];
    return {
      ...rename(branch),
      spouse: renameSpouse(branch.spouse),
      /* Preserve each child's original relation so a daughter who heads a
         branch is not relabelled as 'मुलगा'. spousePerson() uses this. */
      children: children.map((person) => ({
        ...rename(person),
        spouse: renameSpouse(person.spouse),
        relation: person.relation,                 /* keep original */
        children: Array.isArray(person.children)
          ? person.children.map((child) => rename(child))
          : [],
      })),
    };
  });

  const owner = rename(family?.owner ?? { name: '' });
  const spouse = rename(family?.spouse ?? { name: '' });

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
            <div
              className="tree-level"
              key={generation}
              style={{ gridRow: index + 1 }}
              aria-hidden="true"
            >
              <span>{generation}</span>
            </div>
          ))}

          <div className="tree-root">
            <Couple person={owner} spouse={spouse} variant="tree-first" />
          </div>

          <ul className="tree-branches" aria-label="निवृत्ती आणि भीमाबाई जाधव यांच्या कुटुंबाच्या शाखा">
            {branches.map((branch, i) => {
              const branchPerson = {
                name: branch.name,
                relation: branch.relation || 'मुलगा',
                avatar: branch.avatar || 'man',
              };
              const branchSpouse = branch.spouse
                ? {
                    name: branch.spouse,
                    relation: branchPerson.relation === 'मुलगी' ? 'पती' : 'पत्नी',
                    avatar: branchPerson.relation === 'मुलगी' ? 'man' : 'woman',
                  }
                : null;

              return (
                <li
                  className="tree-branch"
                  key={`${branch.name}-${i}`}
                  style={{ '--branch-width': Math.max(1, branch.children.length) }}
                >
                  <div className="tree-parent">
                    <Couple person={branchPerson} spouse={branchSpouse} variant="tree-second" />
                  </div>
                  <ul className="tree-children" aria-label={`${branch.name} यांची मुलं`}>
                    {branch.children.map((person, index) => (
                      <Descendant key={`${person.name}-${index}`} person={person} />
                    ))}
                  </ul>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}