import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const t = (lang, en, mr) => (lang === 'mr' ? mr : en);

const STATE_LABELS = {
  ready:     { en: 'Ready',     mr: 'पूर्ण',      tone: 'green' },
  running:   { en: 'Running',   mr: 'सुरू',       tone: 'amber' },
  building:  { en: 'Building',  mr: 'बिल्ड सुरू', tone: 'blue' },
  uploading: { en: 'Uploading', mr: 'अपलोड सुरू', tone: 'amber' },
  error:     { en: 'Error',     mr: 'त्रुटी',     tone: 'red' },
};

const TONE = {
  green: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  amber: 'bg-amber-50 text-amber-800 ring-amber-200',
  blue:  'bg-sky-50 text-sky-800 ring-sky-200',
  red:   'bg-rose-50 text-rose-800 ring-rose-200',
  muted: 'bg-slate-50 text-slate-700 ring-slate-200',
};

function stateLabel(state, lang) {
  if (!state) return '—';
  return STATE_LABELS[state]?.[lang] ?? state;
}

function stateTone(state) {
  return TONE[STATE_LABELS[state]?.tone ?? 'muted'];
}

function formatDate(value, lang) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString(lang === 'mr' ? 'mr-IN' : 'en-IN');
}

function relativeTime(value, lang) {
  if (!value) return '—';
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return '—';
  const diff = Math.max(0, Date.now() - then);
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return t(lang, 'just now', 'आत्ताच');
  if (mins < 60) return t(lang, `${mins} min ago`, `${mins} मिनिटांपूर्वी`);
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return t(lang, `${hrs} hr ago`, `${hrs} तासांपूर्वी`);
  const days = Math.floor(hrs / 24);
  return t(lang, `${days} d ago`, `${days} दिवसांपूर्वी`);
}

/* ── Status pill ── */
function StatusPill({ state, lang }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${stateTone(state)}`}>
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />
      {stateLabel(state, lang)}
    </span>
  );
}

/* ── Skeleton row ── */
function SkeletonRow() {
  return (
    <tr className="border-t border-slate-100">
      <td className="px-4 py-3"><div className="h-3.5 w-24 animate-pulse rounded bg-slate-200" /></td>
      <td className="px-4 py-3"><div className="h-5 w-16 animate-pulse rounded-full bg-slate-200" /></td>
      <td className="px-4 py-3"><div className="h-3.5 w-28 animate-pulse rounded bg-slate-200" /></td>
    </tr>
  );
}

/* ── Card-wrapped activity table ── */
function ActivityCard({ title, subtitle, rows, lang, loading }) {
  const empty = loading
    ? t(lang, 'Loading…', 'लोड होत आहे…')
    : rows
      ? t(lang, 'No activity yet.', 'अजून नोंदी नाहीत.')
      : t(lang, 'Data unavailable from Netlify.', 'Netlify कडून माहिती उपलब्ध नाही.');

  return (
    <article className="group min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,.04),0_8px_24px_rgba(15,23,42,.06)] transition-shadow hover:shadow-[0_10px_30px_rgba(15,23,42,.12)]">
      <header className="flex items-center justify-between gap-3 border-b border-slate-100 bg-gradient-to-br from-indigo-50/70 to-white px-4 py-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
        </div>
        {rows?.length > 0 && (
          <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-900">
            {rows.length}
          </span>
        )}
      </header>

      {rows?.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-80 text-left text-sm">
            <caption className="sr-only">{title}</caption>
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th scope="col" className="px-4 py-2 font-semibold">{t(lang, 'ID / Branch', 'आयडी / ब्रँच')}</th>
                <th scope="col" className="px-4 py-2 font-semibold">{t(lang, 'Status', 'स्थिती')}</th>
                <th scope="col" className="px-4 py-2 font-semibold">{t(lang, 'Time', 'वेळ')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr className="border-t border-slate-100 transition-colors hover:bg-slate-50/60" key={row.id ?? `${row.branch}-${row.created_at}`}>
                  <td className="px-4 py-2.5 font-mono text-xs text-slate-700">
                    {row.branch || (row.id ? String(row.id).slice(0, 10) : '—')}
                  </td>
                  <td className="px-4 py-2.5"><StatusPill state={row.state} lang={lang} /></td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-slate-600">
                    {row.created_at
                      ? <time dateTime={row.created_at} title={formatDate(row.created_at, lang)}>{relativeTime(row.created_at, lang)}</time>
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : loading ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-80"><tbody><SkeletonRow /><SkeletonRow /><SkeletonRow /></tbody></table>
        </div>
      ) : (
        <p className="p-4 text-sm text-slate-600">{empty}</p>
      )}
    </article>
  );
}

/* ── Metric card ── */
function MetricCard({ icon, label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,.04)]">
      <div className="flex items-center gap-2 text-slate-500">
        <span aria-hidden="true" className="grid h-7 w-7 place-items-center rounded-lg bg-indigo-50 text-indigo-700">{icon}</span>
        <dt className="text-xs font-semibold uppercase tracking-wide">{label}</dt>
      </div>
      <dd className="mt-3 text-2xl font-bold tabular-nums text-slate-900">{value}</dd>
    </div>
  );
}

import { isLocalWorkspace } from './localFamily.js';
export default function NetlifyActivity({ lang }) {
  if (isLocalWorkspace()) return <section><h2>Netlify Activity</h2><p>Deployment information is available in the signed-in workspace.</p></section>;
  return <HostedActivity lang={lang}/>;
}
function HostedActivity({ lang }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [probe, setProbe] = useState(null);
  const [loading, setLoading] = useState(true);
  const busyRef = useRef(false);
  const activeRef = useRef(true);
  const timerRef = useRef(null);

  /* Adaptive interval: hot when a deploy is in flight, cool otherwise */
  const hot = useMemo(() => {
    const rows = [...(data?.deploys ?? []), ...(data?.builds ?? [])];
    return rows.some((r) => r.state === 'running' || r.state === 'building' || r.state === 'uploading');
  }, [data]);

  const refresh = useCallback(async () => {
    if (busyRef.current || document.visibilityState === 'hidden') return;
    busyRef.current = true;
    try {
      const probeStart = performance.now();
      const homepage = fetch('/', {
        method: 'HEAD',
        cache: 'no-store',
        signal: AbortSignal.timeout(8000),
      }).then((result) => {
        if (!activeRef.current) return;
        if (!result.ok) { setProbe(null); return; }
        setProbe(Math.round(performance.now() - probeStart));
      }).catch(() => { if (activeRef.current) setProbe(null); });

      const response = await fetch('/api/admin/activity', {
        cache: 'no-store',
        signal: AbortSignal.timeout(12_000),
      });
      const result = await response.json().catch(() => null);

      if (activeRef.current) {
        if (response.ok && result) {
          setData(result);
          setError('');
        } else {
          setError(typeof result?.error === 'string' ? result.error : 'telemetry_unavailable');
        }
      }
      await homepage;
    } catch {
      if (activeRef.current) setError('telemetry_unavailable');
    } finally {
      busyRef.current = false;
      if (activeRef.current) setLoading(false);
    }
  }, []);

  /* Adaptive polling loop */
  useEffect(() => {
    activeRef.current = true;
    void refresh();

    const schedule = () => {
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(async () => {
        await refresh();
        schedule();
      }, hot ? 5_000 : 30_000);
    };
    schedule();

    const onVisibility = () => {
      if (document.visibilityState === 'visible') { void refresh(); schedule(); }
      else clearTimeout(timerRef.current);
    };
    document.addEventListener('visibilitychange', onVisibility);

    /* Real-time push: any code calling
       new BroadcastChannel('netlify-activity').postMessage(...) triggers a refetch */
    let channel;
    if ('BroadcastChannel' in window) {
      channel = new BroadcastChannel('netlify-activity');
      channel.onmessage = () => void refresh();
    }

    return () => {
      activeRef.current = false;
      clearTimeout(timerRef.current);
      document.removeEventListener('visibilitychange', onVisibility);
      channel?.close();
    };
  }, [refresh, hot]);

  const bytes = data?.files?.bytes;
  const metrics = [
    {
      icon: '▤',
      label: t(lang, 'Published file size', 'प्रकाशित फाइल्सचा आकार'),
      value: bytes == null ? '—' : `${(bytes / 1048576).toFixed(2)} MiB`,
    },
    {
      icon: '#',
      label: t(lang, 'Published files', 'प्रकाशित फाइल्स'),
      value: data?.files?.count ?? '—',
    },
    {
      icon: '⏱',
      label: t(lang, 'Homepage response', 'मुख्यपृष्ठाचा प्रतिसाद'),
      value: probe == null ? '—' : `${probe} ms`,
    },
  ];

  if (error === 'telemetry_setup') {
    return (
      <section className="grid gap-4" aria-labelledby="netlify-title">
        <div>
          <h2 id="netlify-title" className="text-2xl font-bold text-slate-900">
            {t(lang, 'Netlify activity', 'Netlify वरील घडामोडी')}
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            {t(lang, 'Refreshes live while this tab is visible.', 'हा टॅब उघडा असताना माहिती थेट अपडेट होते.')}
          </p>
        </div>
        <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
          {t(lang, 'Set the Netlify API token and site ID to load activity.', 'माहिती लोड करण्यासाठी Netlify API token आणि site ID सेट करा.')}
        </p>
      </section>
    );
  }

  return (
    <section className="grid gap-4" aria-labelledby="netlify-title">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="netlify-title" className="text-2xl font-bold text-slate-900">
            {t(lang, 'Netlify activity', 'Netlify वरील घडामोडी')}
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            {hot
              ? t(lang, 'Live · a deploy is in progress', 'थेट · deploy सुरू आहे')
              : t(lang, 'Live · updates as things change', 'थेट · बदलांनुसार अपडेट होते')}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 active:translate-y-px"
        >
          <span aria-hidden="true" className={busyRef.current ? 'animate-spin' : ''}>↻</span>
          {t(lang, 'Refresh', 'रिफ्रेश')}
        </button>
      </header>

      {error && (
        <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
          {t(
            lang,
            'Live data paused. Showing the last successful check.',
            'थेट माहिती थांबली. शेवटची यशस्वी तपासणी दाखवत आहे.'
          )}
        </p>
      )}

      <dl className="grid gap-3 sm:grid-cols-3">
        {metrics.map((m) => <MetricCard key={m.label} {...m} />)}
      </dl>

      {data?.checkedAt && (
        <p className="text-xs text-slate-500">
          {t(lang, 'Last checked', 'शेवटची तपासणी')} ·{' '}
          <time dateTime={data.checkedAt} title={formatDate(data.checkedAt, lang)}>
            {relativeTime(data.checkedAt, lang)}
          </time>
        </p>
      )}

      <div className="grid min-w-0 gap-4 xl:grid-cols-2">
        <ActivityCard
          title={t(lang, 'Recent deploys', 'अलीकडील deploys')}
          subtitle={t(lang, 'Pushed to Netlify', 'Netlify वर पाठवलेले')}
          rows={data?.deploys}
          lang={lang}
          loading={loading}
        />
        <ActivityCard
          title={t(lang, 'Recent builds', 'अलीकडील builds')}
          subtitle={t(lang, 'Build & upload queue', 'बिल्ड आणि अपलोड रांग')}
          rows={data?.builds}
          lang={lang}
          loading={loading}
        />
      </div>
    </section>
  );
}
