import { useEffect, useMemo, useRef, useState } from 'react';
import { useApi } from '../hooks/useApi.js';
import StatusBadge from '../components/StatusBadge.jsx';
import ConfidenceMeter from '../components/ConfidenceMeter.jsx';
import DropdownMenu from '../components/DropdownMenu.jsx';
import TimeSeriesChart from '../components/TimeSeriesChart.jsx';
import { computeSignificance, conversionRate, relativeUplift, formatDate, daysRunning } from '../utils/stats.js';

const VARIANT_COLORS = ['#6B7280', '#46808C', '#B8862F', '#C2554A', '#5E6AD2'];

const GOAL_LABELS = {
  page_view:     'Page view',
  page_reached:  'Page reached',
  click:         'Click',
  scroll_depth:  'Scroll depth',
  time_on_page:  'Time on page',
  element_view:  'Element view',
  video_play:    'Video playback',
  external_event:'External event',
  engagement:    'Engagement',
};

const TYPE_OVERRIDES = {
  php_snippet: 'PHP snippet',
  js_snippet:  'JavaScript snippet',
  css_snippet: 'CSS snippet',
};

function formatType(type) {
  if (!type) return '—';
  if (TYPE_OVERRIDES[type]) return TYPE_OVERRIDES[type];
  return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function endLabel(mode, value, threshold) {
  if (!mode || mode === 'manual') return 'No end date';
  if (mode === 'confidence') return `At ${value ?? threshold ?? 95}% confidence`;
  if (mode === 'page_views') return `After ${Number(value ?? 0).toLocaleString()} views`;
  if (mode === 'datetime') return `On ${formatDate(value)}`;
  return mode;
}

function goalLabel(g) {
  return g?.label || GOAL_LABELS[g?.type] || g?.type || '—';
}

function goalDetail(g) {
  if (!g) return null;
  if (g.percent)    return `${g.percent}% scroll depth`;
  if (g.seconds)    return `${g.seconds}s on page`;
  if (g.event_name) return g.event_name;
  if (g.selector)   return g.selector;
  if (g.url) {
    try { return new URL(g.url).pathname; } catch { return g.url; }
  }
  return null;
}

function buildTimeline(test) {
  const synthetic = [];
  if (test.created_at) synthetic.push({ event: 'test_created',   data: {}, created_at: test.created_at });
  if (test.started_at) synthetic.push({ event: 'test_activated', data: {}, created_at: test.started_at });
  if (test.ended_at)   synthetic.push({ event: 'test_ended',     data: {}, created_at: test.ended_at });
  return [...synthetic, ...(test.history ?? [])].sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at)
  );
}

function SortHeader({ label, field, sortKey, sortDir, onSort, align = 'left' }) {
  const active = sortKey === field;
  return (
    <button
      onClick={() => onSort(field)}
      className={`sp-sort-header ${align === 'right' ? 'sp-sort-header--right' : ''}`}
    >
      {label}
      <span className={`sp-sort-header__icon ${active ? 'sp-sort-header__icon--active' : ''}`}>
        {active ? (sortDir === 'desc' ? '▼' : '▲') : '⇅'}
      </span>
    </button>
  );
}

export default function TestDetail({ config, testId, onBack, onError, onOpenTest }) {
  const { data: test, loading, error, refresh } = useApi(
    config,
    'splitpress_get_test',
    { test_id: testId },
    [testId]
  );

  const [sortKey, setSortKey]         = useState(null);
  const [sortDir, setSortDir]         = useState('desc');
  const [actioning, setActioning]     = useState(false);
  const [actionError, setActionError] = useState(null);

  // Inline rename
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput]     = useState('');
  const nameInputRef = useRef(null);

  // Split popover — 'header' | 'card' | null
  const [splitAnchor, setSplitAnchor] = useState(null);
  const [splitValue, setSplitValue]   = useState(50);
  const splitHeaderRef = useRef(null);
  const splitCardRef   = useRef(null);

  // Derive safe values before early returns so all hooks run unconditionally.
  const variants = test?.variants ?? [];
  const goals    = test?.goals ?? [];
  const control  = variants.find((v) => v.is_control) ?? variants[0] ?? {};

  // Stable color mapping by variant ID so colors don't shift on sort.
  const colorMap = useMemo(
    () => Object.fromEntries(variants.map((v, i) => [v.id, VARIANT_COLORS[i % VARIANT_COLORS.length]])),
    [variants]
  );

  // Pre-compute significance for all challengers so sorting by confidence works.
  const sigMap = useMemo(() => {
    const map = {};
    variants.forEach((v) => {
      if (!v.is_control) {
        map[v.id] = computeSignificance(
          control.conversions ?? 0, control.visitors ?? 0,
          v.conversions ?? 0,       v.visitors ?? 0
        );
      }
    });
    return map;
  }, [variants, control]);

  const sortedVariants = useMemo(() => {
    if (!sortKey) return variants;
    return [...variants].sort((a, b) => {
      let va, vb;
      if (sortKey === 'visitors') {
        va = a.visitors ?? 0; vb = b.visitors ?? 0;
      } else if (sortKey === 'conversions') {
        va = a.conversions ?? 0; vb = b.conversions ?? 0;
      } else if (sortKey === 'rate') {
        va = conversionRate(a.conversions ?? 0, a.visitors ?? 0);
        vb = conversionRate(b.conversions ?? 0, b.visitors ?? 0);
      } else if (sortKey === 'confidence') {
        // Control has no significance value; push it to the bottom when sorting.
        va = a.is_control ? -1 : (sigMap[a.id]?.confidence ?? 0);
        vb = b.is_control ? -1 : (sigMap[b.id]?.confidence ?? 0);
      } else {
        return 0;
      }
      return sortDir === 'desc' ? vb - va : va - vb;
    });
  }, [variants, sortKey, sortDir, sigMap]);

  useEffect(() => { onError?.(error ?? null); }, [error]);

  // Close split popover on outside click.
  useEffect(() => {
    if (!splitAnchor) return;
    function handleClick(e) {
      const inHeader = splitHeaderRef.current?.contains(e.target);
      const inCard   = splitCardRef.current?.contains(e.target);
      if (!inHeader && !inCard) setSplitAnchor(null);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [splitAnchor]);

  async function updateTest(fields) {
    const body = new FormData();
    body.append('action', 'splitpress_test_action');
    body.append('nonce', config.nonce);
    body.append('test_id', testId);
    body.append('test_action', 'update');
    Object.entries(fields).forEach(([k, v]) => body.append(k, String(v)));
    try {
      const res  = await fetch(config.ajax_url, { method: 'POST', body, credentials: 'same-origin' });
      const json = await res.json();
      if (json.success) {
        refresh();
        return true;
      }
    } catch (_) {}
    return false;
  }

  function startEditName() {
    setNameInput(test.name);
    setEditingName(true);
    setTimeout(() => nameInputRef.current?.select(), 0);
  }

  async function commitRename() {
    const trimmed = nameInput.trim();
    setEditingName(false);
    if (trimmed && trimmed !== test.name) {
      await updateTest({ name: trimmed });
    }
  }

  async function commitSplit() {
    setSplitAnchor(null);
    const challenger = variants.find((v) => !v.is_control);
    if (challenger && splitValue !== challenger.weight) {
      await updateTest({ split: splitValue });
    }
  }

  async function doAction(action) {
    if (actioning) return;
    if (action === 'delete' && !window.confirm(`Delete "${test?.name}"? This cannot be undone.`)) return;

    setActioning(true);
    setActionError(null);
    try {
      const body = new FormData();
      body.append('action', 'splitpress_test_action');
      body.append('nonce', config.nonce);
      body.append('test_id', testId);
      body.append('test_action', action);
      const res  = await fetch(config.ajax_url, { method: 'POST', body, credentials: 'same-origin' });
      const json = await res.json();
      if (json.success) {
        if (action === 'delete') {
          onBack();
        } else if (action === 'clone' && json.data?.test_id) {
          onOpenTest?.(json.data.test_id);
        } else {
          refresh();
        }
      } else {
        setActionError(json.data || 'Action failed.');
      }
    } catch (_) {
      setActionError('Network error — please try again.');
    }
    setActioning(false);
  }

  async function applyVariant(variantPostId, variantLabel) {
    if (!window.confirm(
      `Apply "${variantLabel}" to the original post?\n\nThis will permanently replace the original post's content and SEO settings. This cannot be undone.`
    )) return;

    setActioning(true);
    setActionError(null);
    try {
      const body = new FormData();
      body.append('action', 'splitpress_test_action');
      body.append('nonce', config.nonce);
      body.append('test_id', testId);
      body.append('test_action', 'apply');
      body.append('variant_post_id', variantPostId);
      const res  = await fetch(config.ajax_url, { method: 'POST', body, credentials: 'same-origin' });
      const json = await res.json();
      if (json.success) {
        onBack();
      } else {
        setActionError(json.data || 'Apply failed.');
      }
    } catch (_) {
      setActionError('Network error — please try again.');
    }
    setActioning(false);
  }

  function handleSort(key) {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir('desc');
    } else if (sortDir === 'desc') {
      setSortDir('asc');
    } else {
      // Third click: clear sort back to default order.
      setSortKey(null);
      setSortDir('desc');
    }
  }

  if (loading) {
    return (
      <div className="sp-wrap">
        <div className="sp-loading"><div className="sp-spinner" /><span>Loading…</span></div>
      </div>
    );
  }

  if (error || !test) {
    return (
      <div className="sp-wrap">
        <button className="sp-btn sp-btn--ghost" onClick={onBack}>← Back</button>
        <div className="sp-notice sp-notice--error" style={{ marginTop: 16 }}>{error || 'Test not found.'}</div>
      </div>
    );
  }

  const primaryGoal = goals.find((g) => g.is_primary) ?? goals[0] ?? null;

  const totalVisitors    = variants.reduce((s, v) => s + (v.visitors ?? 0), 0);
  const totalConversions = variants.reduce((s, v) => s + (v.conversions ?? 0), 0);
  const splitLabel       = variants.map((v) => `${v.weight}%`).join(' / ');
  const days             = daysRunning(test.started_at);

  const chartSeries = variants.map((v) => ({
    label:  v.label || (v.is_control ? 'Control' : 'Variant'),
    color:  colorMap[v.id],
    points: v.daily_stats ?? [],
  }));

  const bestChallenger = variants
    .filter((v) => !v.is_control)
    .reduce((best, v) => {
      const conf = sigMap[v.id]?.confidence ?? 0;
      return conf > (best._conf ?? -1) ? { ...v, _conf: conf } : best;
    }, {});

  const hasWinner = (bestChallenger._conf ?? 0) >= (test.confidence_threshold ?? 95);

  const controlRate = conversionRate(control.conversions ?? 0, control.visitors ?? 0);

  const hasUneditedVariants = variants.some((v) => !v.is_control && v.needs_edit);

  return (
    <div className="sp-wrap">

      {/* ── Header ── */}
      <div className="sp-header">
        <button className="sp-btn sp-btn--ghost" onClick={onBack}>← Tests</button>
        <div className="sp-header__title-group">
          <div className="sp-header__title-row">
            {editingName ? (
              <input
                ref={nameInputRef}
                className="sp-header__title-input"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onBlur={commitRename}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.target.blur(); }
                  if (e.key === 'Escape') { setEditingName(false); }
                }}
                autoFocus
              />
            ) : (
              <h1 className="sp-header__title sp-header__title--editable" onClick={startEditName} title="Click to rename">
                {test.name}
              </h1>
            )}
            <StatusBadge status={test.status} />
          </div>
          {test.target_url && (
            <a href={test.target_url} target="_blank" rel="noopener noreferrer" className="sp-header__url">
              {test.target_url}
            </a>
          )}
        </div>
        <div className="sp-test-actions">
          {test.status === 'draft' && (
            <button
              className="sp-btn sp-btn--primary"
              disabled={actioning || hasUneditedVariants}
              title={hasUneditedVariants ? 'Edit all variant content before starting' : undefined}
              onClick={() => doAction('start')}
            >
              Start Test
            </button>
          )}
          {test.status === 'scheduled' && (
            <button
              className="sp-btn sp-btn--primary"
              disabled={actioning || hasUneditedVariants}
              title={hasUneditedVariants ? 'Edit all variant content before starting' : undefined}
              onClick={() => doAction('start')}
            >
              Start Now
            </button>
          )}
          {test.status === 'active' && (<>
            <div className="sp-split-wrap" ref={splitHeaderRef}>
              <button
                className="sp-btn sp-btn--ghost sp-btn--icon"
                title="Adjust split"
                onClick={() => {
                  const challenger = variants.find((v) => !v.is_control);
                  setSplitValue(challenger?.weight ?? 50);
                  setSplitAnchor((a) => a === 'header' ? null : 'header');
                }}
              >
                <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
                  <line x1="3" y1="5"  x2="17" y2="5"  />
                  <circle cx="7"  cy="5"  r="2" fill="white" />
                  <line x1="3" y1="10" x2="17" y2="10" />
                  <circle cx="13" cy="10" r="2" fill="white" />
                  <line x1="3" y1="15" x2="17" y2="15" />
                  <circle cx="9"  cy="15" r="2" fill="white" />
                </svg>
              </button>
              {splitAnchor === 'header' && <SplitPopover splitValue={splitValue} setSplitValue={setSplitValue} onClose={() => setSplitAnchor(null)} onSave={commitSplit} align="end" />}
            </div>
            <button className="sp-btn sp-btn--ghost" disabled={actioning} onClick={() => doAction('pause')}>Pause</button>
            <button className="sp-btn sp-btn--primary" disabled={actioning} onClick={() => doAction('finish')}>Finish</button>
          </>)}
          {test.status === 'paused' && (<>
            <button className="sp-btn sp-btn--primary" disabled={actioning} onClick={() => doAction('resume')}>Resume</button>
            <button className="sp-btn sp-btn--ghost" disabled={actioning} onClick={() => doAction('finish')}>Finish</button>
          </>)}
          <DropdownMenu items={[
            { label: 'Duplicate test', onClick: () => doAction('clone'), disabled: actioning },
            ...(['active', 'paused'].includes(test.status) ? ['separator', { label: 'Stop', onClick: () => doAction('stop'), disabled: actioning }] : []),
            'separator',
            { label: 'Delete', onClick: () => doAction('delete'), danger: true, disabled: actioning },
          ]} />
        </div>
      </div>

      {actionError && (
        <div className="sp-notice sp-notice--error" style={{ marginBottom: 16 }}>{actionError}</div>
      )}

      {hasUneditedVariants && ['draft', 'scheduled'].includes(test.status) && (
        <div className="sp-banner sp-banner--warning">
          <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" style={{ flexShrink: 0 }}>
            <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
          </svg>
          <span>Variant content hasn't been edited yet — click <strong>Edit content</strong> on each variant below before starting the test.</span>
        </div>
      )}

      {/* ── Winner banner ── */}
      {hasWinner && (
        <div className="sp-banner sp-banner--winner">
          <span className="sp-banner__badge">A</span>
          <span style={{ flex: 1 }}>
            <strong>{bestChallenger.label ?? 'Variant A'}</strong> is winning —{' '}
            {conversionRate(bestChallenger.conversions ?? 0, bestChallenger.visitors ?? 0)}% conv. rate
            at {Math.round(bestChallenger._conf)}% confidence.
          </span>
          {['ended', 'winner'].includes(test.status) && bestChallenger.post_id && (
            <button
              className="sp-btn sp-btn--primary sp-btn--sm"
              disabled={actioning}
              onClick={() => applyVariant(bestChallenger.post_id, bestChallenger.label ?? 'this variant')}
            >
              Apply to site
            </button>
          )}
        </div>
      )}

      {/* ── Info cards ── */}
      <div className="sp-info-cards">
        <InfoCard label="Started"      value={formatDate(test.started_at)} sub={days > 0 ? `${days} day${days !== 1 ? 's' : ''} running` : 'Started today'} />
        <InfoCard label="Ends"         value={endLabel(test.end_mode, test.end_value, test.confidence_threshold)} />
        <div className="sp-split-wrap" ref={splitCardRef}>
          <InfoCard
            label="Split"
            value={`${control.weight ?? 50}% / ${variants.find((v) => !v.is_control)?.weight ?? 50}%`}
            sub="Control / Variant A"
            onEdit={!['ended', 'winner'].includes(test.status) ? () => {
              const challenger = variants.find((v) => !v.is_control);
              setSplitValue(challenger?.weight ?? 50);
              setSplitAnchor((a) => a === 'card' ? null : 'card');
            } : undefined}
          />
          {splitAnchor === 'card' && <SplitPopover splitValue={splitValue} setSplitValue={setSplitValue} onClose={() => setSplitAnchor(null)} onSave={commitSplit} />}
        </div>
        {primaryGoal && (
          <InfoCard label="Primary goal" value={goalLabel(primaryGoal)} sub={goalDetail(primaryGoal)} />
        )}
        {totalVisitors > 0 && (
          <InfoCard label="Total visitors" value={totalVisitors.toLocaleString()} sub={`${totalConversions.toLocaleString()} conversion${totalConversions !== 1 ? 's' : ''}`} />
        )}
      </div>

      {/* ── Performance (chart + variants table) ── */}
      <div className="sp-card sp-card--flush">
        <div className="sp-chart-section">
          <h2 className="sp-card__title">Performance</h2>
          <TimeSeriesChart series={chartSeries} metric="Visitors" />
        </div>

        {/* Variants table */}
        <div style={{ borderTop: '1px solid #f3f4f6' }}>

          {/* Column headers */}
          <div className="sp-perf-header">
            <span>Variant</span>
            <SortHeader label="Visitors"    field="visitors"    sortKey={sortKey} sortDir={sortDir} onSort={handleSort} align="right" />
            <SortHeader label="Conversions" field="conversions" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} align="right" />
            <SortHeader label="Conv. Rate"  field="rate"        sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
            <SortHeader label="Confidence"  field="confidence"  sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
            <span />
          </div>

          {/* Variant rows */}
          {sortedVariants.map((v) => {
            const isControl = !!v.is_control;
            const sig = isControl ? null : sigMap[v.id];
            const rate = conversionRate(v.conversions ?? 0, v.visitors ?? 0);
            const uplift = isControl ? null : relativeUplift(rate, controlRate);
            const viewUrl = isControl ? test.target_url : null;
            const editUrl = !isControl && v.post_id && test.status !== 'active'
              ? `${config.admin_url}post.php?post=${v.post_id}&action=edit`
              : null;
            const canApply = !isControl && v.post_id && ['ended', 'winner'].includes(test.status);

            return (
              <div
                key={v.id}
                className={`sp-perf-row ${isControl ? 'sp-perf-row--control' : ''}`}
              >
                {/* Variant name */}
                <div className="sp-variant-cell">
                  <span className="sp-variant-dot" style={{ background: colorMap[v.id] }} />
                  <span className="sp-variant-label">
                    {v.label ?? (isControl ? 'Control' : 'Variant')}
                  </span>
                  {isControl && <span className="sp-badge sp-badge--gray">Control</span>}
                </div>

                {/* Visitors */}
                <span className="sp-perf-num">{(v.visitors ?? 0).toLocaleString()}</span>

                {/* Conversions */}
                <span className="sp-perf-num">{(v.conversions ?? 0).toLocaleString()}</span>

                {/* Conv. Rate + relative uplift */}
                <div className="sp-conv-rate">
                  <span className={`sp-conv-rate__value ${rate > 0 ? 'sp-conv-rate__value--positive' : ''}`}>
                    {rate}%
                  </span>
                  {isControl && <span className="sp-conv-rate__baseline">Baseline</span>}
                  {uplift !== null && (
                    <span className={`sp-conv-rate__uplift ${uplift > 0 ? 'sp-conv-rate__uplift--up' : uplift < 0 ? 'sp-conv-rate__uplift--down' : ''}`}>
                      {uplift > 0 ? '↑' : uplift < 0 ? '↓' : ''}{Math.abs(uplift).toFixed(1)}%
                    </span>
                  )}
                </div>

                {/* Confidence */}
                <div>
                  {isControl ? (
                    <span className="sp-conv-rate__baseline">Baseline</span>
                  ) : (
                    <ConfidenceMeter value={sig?.confidence ?? 0} lowData={sig?.insufficientData ?? true} />
                  )}
                </div>

                {/* View / Edit / Apply */}
                <div className="sp-perf-view">
                  {viewUrl && (
                    <a href={viewUrl} target="_blank" rel="noopener noreferrer" className="sp-btn sp-btn--ghost sp-btn--sm">
                      View →
                    </a>
                  )}
                  {editUrl && v.needs_edit && (
                    <a href={editUrl} target="_blank" rel="noopener noreferrer" className="sp-btn sp-btn--primary sp-btn--sm">
                      Edit content →
                    </a>
                  )}
                  {editUrl && !v.needs_edit && (
                    <a href={editUrl} target="_blank" rel="noopener noreferrer" className="sp-btn sp-btn--ghost sp-btn--sm">
                      Edit →
                    </a>
                  )}
                  {canApply && (
                    <button
                      className="sp-btn sp-btn--primary sp-btn--sm"
                      disabled={actioning}
                      onClick={() => applyVariant(v.post_id, v.label ?? 'this variant')}
                    >
                      Apply
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── History ── */}
      <div className="sp-card">
        <h2 className="sp-card__title">History</h2>
        <ul className="sp-history-list">
          {buildTimeline(test).map((h, i) => (
            <li key={i} className="sp-history-item">
              <span className={`sp-history-item__dot ${h.event.startsWith('test_') ? 'sp-history-item__dot--system' : ''}`} />
              <span className="sp-history-item__text">{historyLabel(h)}</span>
              <span className="sp-history-item__date">{formatDate(h.created_at)}</span>
            </li>
          ))}
        </ul>
      </div>

    </div>
  );
}

function historyLabel(h) {
  if (h.event === 'test_created')   return 'Test created';
  if (h.event === 'test_activated') return 'Test activated';
  if (h.event === 'test_ended')     return 'Test ended';
  if (h.event === 'name_changed') {
    return `Renamed from "${h.data.from}" to "${h.data.to}"`;
  }
  if (h.event === 'split_changed') {
    const fromControl = 100 - h.data.from;
    const toControl   = 100 - h.data.to;
    return `Split changed from ${fromControl}/${h.data.from} to ${toControl}/${h.data.to}`;
  }
  return h.event.replace(/_/g, ' ');
}

function SplitPopover({ splitValue, setSplitValue, onClose, onSave, align = 'start' }) {
  const controlPct = 100 - splitValue;
  return (
    <div className={`sp-split-popover ${align === 'end' ? 'sp-split-popover--end' : ''}`}>
      <p className="sp-split-popover__label">Adjust split</p>
      <div className="sp-split-control">
        <div className="sp-split-numbers">
          <div className="sp-split-number sp-split-number--control">
            <span className="sp-split-number__pct">{controlPct}%</span>
            <span className="sp-split-number__name">Control</span>
          </div>
          <div className="sp-split-number sp-split-number--variant">
            <span className="sp-split-number__pct">{splitValue}%</span>
            <span className="sp-split-number__name">Variant A</span>
          </div>
        </div>
        <input
          type="range" min="0" max="100" step="5"
          value={controlPct}
          onChange={(e) => setSplitValue(100 - Math.max(10, Math.min(90, Number(e.target.value))))}
          className="sp-split-slider sp-split-slider--sm"
          style={{ background: `linear-gradient(to right, #C8DDE0 0%, #C8DDE0 ${controlPct}%, #46808C ${controlPct}%, #46808C 100%)` }}
        />
        <div className="sp-split-hints">
          <span>Original page</span>
          <span>Variant page</span>
        </div>
      </div>
      <div className="sp-split-popover__actions">
        <button className="sp-btn sp-btn--ghost sp-btn--sm" onClick={onClose}>Cancel</button>
        <button className="sp-btn sp-btn--primary sp-btn--sm" onClick={onSave}>Save</button>
      </div>
    </div>
  );
}

function InfoCard({ label, value, sub, onEdit }) {
  return (
    <div className="sp-info-card">
      <div className="sp-info-card__top">
        <span className="sp-info-card__label">{label}</span>
        {onEdit && (
          <button className="sp-info-card__edit" onClick={onEdit} title={`Edit ${label.toLowerCase()}`}>
            <svg width="13" height="13" viewBox="0 0 20 20" fill="currentColor">
              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
            </svg>
          </button>
        )}
      </div>
      <span className="sp-info-card__value">{value}</span>
      {sub && <span className="sp-info-card__sub">{sub}</span>}
    </div>
  );
}
