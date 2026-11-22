import { useEffect, useRef, useState } from 'react';

/* CHANGE #1 — shared translator */
const t = (lang, en, mr) => (lang === 'mr' ? mr : en);

/* CHANGE #2 — friendly labels for every state, both languages */
const STATE_LABELS = {
  ready:     { en: 'Ready',    mr: 'पूर्ण' },
  running:   { en: 'Running',  mr: 'सुरू' },
  error:     { en: 'Error',    mr: 'त्रुटी' },
  building:  { en: 'Building', mr: 'बिल्ड सुरू' },
  uploading: { en: 'Uploading', mr: 'अपलोड सुरू' },
};

function stateLabel(state, lang) {
  if (!state) return '—';
  return STATE_LABELS[state]?.[lang] ?? state;
}

function formatDate(value, lang) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString(lang === 'mr' ? 'mr-IN' : 'en-IN');
}

/* CHANGE #3 — accepts `loading` so "not loaded" ≠ "unavailable" */
function ActivityTable({ title, rows, lang, loading }) {
  const empty = loading
    ? t(lang, 'Loading…', 'लोड होत आहे…')
    : rows
      ? t(lang, 'No activity yet.', 'अजून नोंदी नाहीत.')
      : t(lang, 'Data unavailable from Netlify.', 'Netlify कडून माहिती उपलब्ध नाही.');

  return (
    <div className="min-w-0 overflow-hidden rounded-2xl border border-indigo-100 bg-white">
      <h3 className="border-b border-indigo-100 px-4 py-3 text-base font-bold">{title}</h3>
      {rows?.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-80 text-left text-sm">
            <caption className="sr-only">{title}</caption>
            <thead className="bg-indigo-50 text-indigo-900">
              <tr>
                <th scope="col" className="px-4 py-2">{t(lang, 'ID / Branch', 'आयडी / ब्रँच')}</th>
                <th scope="col" className="px-4 py-2">{t(lang, 'Status', 'स्थिती')}</th>
                <th scope="col" className="px-4 py-2">{t(lang, 'Time', 'वेळ')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr className="border-t border-slate-100" key={row.id}>
                  {/* CHANGE #4 — safe id fallback */}
                  <td className="px-4 py-2">
                    {row.branch || (row.id ? String(row.id).slice(0, 10) : '—')}
                  </td>
                  <td className="px-4 py-2">
                    <span className="rounded-full bg-indigo-50 px-2 py-1 text-indigo-900">
                      {stateLabel(row.state, lang)}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-2">
                    {row.created_at
                      ? <time dateTime={row.created_at}>{formatDate(row.created_at, lang)}</time>
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="p-4 text-sm text-slate-600">{empty}</p>
      )}
    </div>
  );
}

export default function NetlifyActivity({ lang }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [probe, setProbe] = useState(null);
  const [loading, setLoading] = useState(true);       /* CHANGE #5 */
  const errorRef = useRef('');
  errorRef.current = error;

  useEffect(() => {
    let active = true;
    let busy = false;

    async function refresh() {
      if (busy || document.visibilityState === 'hidden') return;
      busy = true;
      try {
        /* CHANGE #6 — probe timing captured inside the homepage promise */
        const homepage = fetch('/', {
          method: 'HEAD',
          cache: 'no-store',
          signal: AbortSignal.timeout(8000),
        }).then((result) => {
          if (!active) return;
          if (!result.ok) { setProbe(null); return; }
          // start was captured just before this fetch; measured on response
          setProbe(Math.round(performance.now() - probeStart));
        }).catch(() => { if (active) setProbe(null); });
        const probeStart = performance.now();

        const response = await fetch('/api/admin/activity', {
          cache: 'no-store',
          signal: AbortSignal.timeout(12_000),
        });

        /* CHANGE #7 — tolerate non-JSON responses */
        const result = await response.json().catch(() => null);

        if (active) {
          if (response.ok && result) {
            setData(result);
            setError('');
          } else {
            const message = typeof result?.error === 'string' ? result.error : 'telemetry_unavailable';
            setError(message);
          }
        }
        await homepage;
      } catch {
        if (active) setError('telemetry_unavailable');
      } finally {
        busy = false;
        if (active) setLoading(false);
      }
    }

    void refresh();
    const timer = setInterval(refresh, 60_000);        /* CHANGE #8 — gentler polling */
    document.addEventListener('visibilitychange', refresh);
    return () => {
      active = false;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);

  const bytes = data?.files?.bytes;
  const metrics = [
    [t(lang, 'Published file size', 'प्रकाशित फाइल्सचा आकार'),
      bytes == null ? '—' : `${(bytes / 1048576).toFixed(2)} MiB`],
    [t(lang, 'Published files', 'प्रकाशित फाइल्स'),
      data?.files?.count ?? '—'],
    [t(lang, 'Homepage response from this browser', 'या ब्राउझरमधून मुख्यपृष्ठाचा प्रतिसाद'),
      probe == null ? '—' : `${probe} ms`],
  ];

  /* CHANGE #9 — a setup error hides the metrics/tables that would otherwise be empty */
  if (error === 'telemetry_setup') {
    return (
      <section className="grid gap-4" aria-labelledby="netlify-title">
        <div>
          <h2 id="netlify-title" className="text-2xl font-bold text-slate-900">{t(lang, 'Netlify activity', 'Netlify वरील घडामोडी')}</h2>
          <p className="mt-2 text-sm text-slate-600">{t(lang, 'Refreshes while this tab is visible.', 'हा टॅब उघडा असताना माहिती अपडेट होते.')}</p>
        </div>
        <p role="alert" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-950">
          {t(lang, 'Set the Netlify API token and site ID to load activity.', 'माहिती लोड करण्यासाठी Netlify API token आणि site ID सेट करा.')}
        </p>
      </section>
    );
  }

  return (
    <section className="grid gap-4" aria-labelledby="netlify-title">
      <div>
        <h2 id="netlify-title" className="text-2xl font-bold text-slate-900">
          {t(lang, 'Netlify activity', 'Netlify वरील घडामोडी')}
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          {t(lang, 'Refreshes every 60 seconds while this tab is visible.', 'हा टॅब उघडा असताना दर ६० सेकंदांनी माहिती अपडेट होते.')}
        </p>
      </div>

      {error && (
        <p role="status" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-950">
          {t(
            lang,
            'Netlify data could not be refreshed. Any visible data is from the last successful check.',
            'Netlify ची नवीन माहिती मिळाली नाही. दिसणारी माहिती शेवटच्या यशस्वी तपासणीची आहे.'
          )}
        </p>
      )}

      <dl className="grid gap-3 sm:grid-cols-3">
        {metrics.map(([label, value]) => (
          <div className="rounded-2xl border border-indigo-100 bg-white p-4" key={label}>
            <dt className="text-sm text-slate-700">{label}</dt>
            <dd className="mt-2 text-2xl font-bold text-indigo-900">{value}</dd>
          </div>
        ))}
      </dl>

      {data?.checkedAt && (
        <p className="text-sm text-slate-600">
          {t(lang, 'Last checked', 'शेवटची तपासणी')} ·{' '}
          <time dateTime={data.checkedAt}>{formatDate(data.checkedAt, lang)}</time>
        </p>
      )}

      <div className="grid min-w-0 gap-4 xl:grid-cols-2">
        <ActivityTable
          title={t(lang, 'Recent deploys', 'अलीकडील deploys')}
          rows={data?.deploys}
          lang={lang}
          loading={loading}
        />
        <ActivityTable
          title={t(lang, 'Recent builds', 'अलीकडील builds')}
          rows={data?.builds}
          lang={lang}
          loading={loading}
        />
      </div>
    </section>
  );
}