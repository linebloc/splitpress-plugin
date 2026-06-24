import { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi.js';
import DropdownMenu from '../components/DropdownMenu.jsx';
import { computeSignificance, formatDate } from '../utils/stats.js';

const TABS = ['active', 'paused', 'scheduled', 'draft', 'ended'];

export default function TestList({ config, onOpenTest, onNewTest, onError }) {
  const [tab, setTab] = useState('active');
  const [flushing, setFlushing] = useState(false);
  const { data, loading, error, refresh } = useApi(config, 'splitpress_get_tests', {}, []);

  // Bubble connection errors up to the app-level banner.
  useEffect(() => { onError?.(error ?? null); }, [error]);

  function handleRefresh() {
    setFlushing(true);
    const body = new FormData();
    body.append('action', 'splitpress_flush_manifest');
    body.append('nonce', config.nonce);
    fetch(config.ajax_url, { method: 'POST', body, credentials: 'same-origin' })
      .finally(() => {
        setFlushing(false);
        refresh();
      });
  }

  const tests = data?.tests ?? [];
  const plan  = data?.plan ?? null;

  const filtered = tests.filter((t) => {
    if (tab === 'ended') return ['ended', 'winner'].includes(t.status);
    return t.status === tab;
  });

  return (
    <div className="sp-wrap">
      <div className="sp-header">
        <div className="sp-logo">
          <svg className="sp-logo__icon" width="26" height="26" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="4" y="4" width="40" height="40" rx="11" fill="#2C5A65"/>
            <rect x="13" y="22" width="7" height="16" rx="2.5" fill="#ffffff" fillOpacity="0.75"/>
            <rect x="27" y="12" width="7" height="26" rx="2.5" fill="#ffffff"/>
          </svg>
          <span className="sp-logo__name">Split<span style={{color:'var(--sp-primary)'}}>Press</span></span>
        </div>
        <span className="sp-connected-badge">
          <span className="sp-connected-badge__dot" />
          Connected
        </span>
        <a
          href={`${config.settings_url}`}
          className="sp-btn sp-btn--ghost"
          style={{ marginLeft: 'auto', padding: '7px 14px', fontSize: 12 }}
        >
          Settings
        </a>
      </div>

      {plan && <PlanUsage plan={plan} />}

      <div className="sp-section-header">
        <h2 className="sp-section-title">A/B Tests</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="sp-btn sp-btn--ghost"
            onClick={handleRefresh}
            disabled={flushing || loading}
            title="Flush cache and reload tests"
          >
            {flushing ? 'Refreshing…' : '↻ Refresh'}
          </button>
          <button className="sp-btn sp-btn--primary" onClick={onNewTest}>
            + New Test
          </button>
        </div>
      </div>

      <div className="sp-tabs">
        {TABS.map((t) => (
          <button
            key={t}
            className={`sp-tab ${tab === t ? 'sp-tab--active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
            {data && (
              <span className="sp-tab__count">
                {tests.filter((x) => (t === 'ended' ? ['ended', 'winner'].includes(x.status) : x.status === t)).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading && (
        <div className="sp-loading">
          <div className="sp-spinner" />
          <span>Loading tests…</span>
        </div>
      )}

      {error && (
        <div className="sp-notice sp-notice--error">
          <strong>Could not reach SplitPress API.</strong>
          <span style={{ display: 'block', marginTop: 4, fontSize: 12 }}>
            {error} — <a href={config.settings_url}>Check your connection in Settings</a>.
          </span>
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="sp-empty-state sp-empty-state--inline">
          <p>No {tab} tests found.</p>
        </div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="sp-table-wrapper">
          <table className="sp-table">
            <thead>
              <tr>
                <th>Test</th>
                <th>Goal</th>
                <th>Split</th>
                <th>Visitors</th>
                <th>Started</th>
                <th>Confidence</th>
                <th style={{ width: 36 }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((test) => (
                <TestRow
                  key={test.id}
                  test={test}
                  onOpen={onOpenTest}
                  config={config}
                  onRefresh={refresh}
                  onNavigate={onOpenTest}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="sp-footer-note">
        <span className="sp-footer-note__dot" />
        Assignment runs server-side before <code style={{ fontFamily: 'var(--sp-font-mono)', fontSize: 11, background: 'rgba(70,128,140,.12)', padding: '1px 5px', borderRadius: 3 }}>wp_head</code> — zero flicker, no JS redirect.
      </div>
    </div>
  );
}

const VARIANT_COLORS = ['#6B7280', '#46808C', '#B8862F', '#C2554A', '#5E6AD2'];

function TestRow({ test, onOpen, config, onRefresh, onNavigate }) {
  const [actioning, setActioning] = useState(false);

  const variants    = test.variants ?? [];
  const goals       = test.goals ?? [];
  const control     = variants.find((v) => v.is_control) ?? variants[0];
  const challengers = variants.filter((v) => !v.is_control);

  const primaryGoal = goals.find((g) => g.is_primary) ?? goals[0] ?? null;
  const goalLabel = primaryGoal
    ? (primaryGoal.label || GOAL_TYPE_LABELS[primaryGoal.type] || primaryGoal.type)
    : '—';

  const totalVisitors = variants.reduce((sum, v) => sum + (v.visitors ?? 0), 0);

  const bestConfidence = challengers.reduce((best, v) => {
    const { confidence } = computeSignificance(
      control?.conversions ?? 0, control?.visitors ?? 0,
      v.conversions ?? 0, v.visitors ?? 0
    );
    return confidence > best ? confidence : best;
  }, 0);

  const confCls = bestConfidence >= 95 ? 'high' : bestConfidence >= 80 ? 'mid' : 'low';
  const hasData = totalVisitors > 0;

  async function doAction(action) {
    if (actioning) return;
    if (action === 'delete' && !window.confirm(`Delete "${test.name}"? This cannot be undone.`)) return;

    setActioning(true);
    try {
      const body = new FormData();
      body.append('action', 'splitpress_test_action');
      body.append('nonce', config.nonce);
      body.append('test_id', test.id);
      body.append('test_action', action);
      const res  = await fetch(config.ajax_url, { method: 'POST', body, credentials: 'same-origin' });
      const json = await res.json();
      if (json.success) {
        if (action === 'clone' && json.data?.test_id) {
          onNavigate?.(json.data.test_id);
        } else {
          onRefresh?.();
        }
      } else {
        window.alert(json.data || 'Action failed.');
      }
    } catch (_) {
      window.alert('Network error — please try again.');
    }
    setActioning(false);
  }

  const { status } = test;
  const menuItems = [
    ...(status === 'draft' ? [{ label: 'Start', onClick: () => doAction('start') }] : []),
    ...(status === 'scheduled' ? [{ label: 'Start Now', onClick: () => doAction('start') }] : []),
    ...(status === 'active' ? [
      { label: 'Pause',  onClick: () => doAction('pause')  },
      { label: 'Finish', onClick: () => doAction('finish') },
      { label: 'Stop',   onClick: () => doAction('stop')   },
    ] : []),
    ...(status === 'paused' ? [
      { label: 'Resume', onClick: () => doAction('resume') },
      { label: 'Finish', onClick: () => doAction('finish') },
      { label: 'Stop',   onClick: () => doAction('stop')   },
    ] : []),
    { label: 'Clone', onClick: () => doAction('clone') },
    'separator',
    { label: 'Delete', onClick: () => doAction('delete'), danger: true },
  ];

  return (
    <tr
      className={`sp-table__row sp-table__row--clickable${actioning ? ' sp-table__row--loading' : ''}`}
      onClick={() => onOpen(test.id)}
    >
      <td>
        <span className="sp-test-name">{test.name}</span>
        {test.target_url && (
          <span className="sp-test-url">{(() => { try { return new URL(test.target_url).pathname; } catch { return test.target_url; } })()}</span>
        )}
      </td>
      <td><span className="sp-goal-label">{goalLabel}</span></td>
      <td>
        <div className="sp-split-bars">
          {variants.map((v, i) => (
            <div
              key={v.id ?? i}
              className="sp-split-bars__seg"
              style={{ flex: v.weight ?? 50, background: VARIANT_COLORS[i % VARIANT_COLORS.length] }}
            />
          ))}
        </div>
        <span className="sp-muted" style={{ fontSize: 11, marginTop: 3, display: 'block' }}>
          {variants.map((v) => `${v.weight}%`).join(' / ')}
        </span>
      </td>
      <td style={{ fontVariantNumeric: 'tabular-nums' }}>
        {hasData ? totalVisitors.toLocaleString() : <span className="sp-muted">—</span>}
      </td>
      <td style={{ fontSize: 12, color: 'var(--sp-text-muted)' }}>{formatDate(test.started_at)}</td>
      <td>
        {challengers.length === 0 ? (
          <span className="sp-muted" style={{ fontSize: 11 }}>—</span>
        ) : (
          <div className="sp-conf-wrap">
            <div className="sp-conf-track">
              <div
                className={`sp-conf-track__fill sp-conf-track__fill--${confCls}`}
                style={{ width: `${Math.min(100, bestConfidence)}%` }}
              />
              <span className="sp-conf-track__marker" />
            </div>
            <span className={`sp-conf-pct sp-conf-pct--${confCls}`}>
              {hasData ? `${Math.round(bestConfidence)}%` : '—'}
            </span>
          </div>
        )}
      </td>
      <td onClick={(e) => e.stopPropagation()} style={{ width: 36 }}>
        <DropdownMenu items={menuItems} />
      </td>
    </tr>
  );
}

const GOAL_TYPE_LABELS = {
  page_view:     'Page view',
  page_reached:  'Page reached',
  click:         'Click',
  scroll_depth:  'Scroll depth',
  time_on_page:  'Time on page',
  element_view:  'Element view',
  video_play:    'Video play',
  external_event:'External event',
  engagement:    'Engagement',
};

function formatEndMode(mode, value) {
  if (!mode || mode === 'manual') return 'Manual';
  if (mode === 'confidence') return `${value ?? 95}% confidence`;
  if (mode === 'page_views') return `${Number(value ?? 0).toLocaleString()} views`;
  if (mode === 'datetime') return formatDate(value);
  return mode;
}

function PlanUsage({ plan }) {
  const visitorPct = Math.min(100, Math.round((plan.visitors_used / plan.visitors_limit) * 100));
  const testPct    = plan.tests_limit > 0 ? Math.min(100, Math.round((plan.tests_used / plan.tests_limit) * 100)) : 0;

  return (
    <div className="sp-plan-card">
      <div className="sp-plan-card__section">
        <span className="sp-plan-card__label">Visitors this month</span>
        <div className="sp-plan-card__numbers">
          <span className="sp-plan-card__used">{plan.visitors_used.toLocaleString()}</span>
          <span className="sp-plan-card__limit">/ {plan.visitors_limit.toLocaleString()}</span>
        </div>
        <div className="sp-plan-card__bar">
          <div
            className={`sp-plan-card__fill${visitorPct >= 90 ? ' sp-plan-card__fill--warn' : ''}`}
            style={{ width: `${visitorPct}%` }}
          />
        </div>
      </div>
      {plan.tests_limit > 0 && (
        <div className="sp-plan-card__section">
          <span className="sp-plan-card__label">Active tests</span>
          <div className="sp-plan-card__numbers">
            <span className="sp-plan-card__used">{plan.tests_used}</span>
            <span className="sp-plan-card__limit">/ {plan.tests_limit}</span>
          </div>
          <div className="sp-plan-card__bar">
            <div
              className={`sp-plan-card__fill${testPct >= 90 ? ' sp-plan-card__fill--warn' : ''}`}
              style={{ width: `${testPct}%` }}
            />
          </div>
        </div>
      )}
      <span className="sp-plan-card__name">{plan.name} plan</span>
    </div>
  );
}
