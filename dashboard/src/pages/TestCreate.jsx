import { useState, useEffect, useRef } from 'react';

const GOAL_TYPES = [
  { type: 'page_reached',    planKey: 'goal_page_reached',    label: 'Page reached',         desc: 'Lands on a URL' },
  { type: 'click',           planKey: 'goal_click',           label: 'Click',                desc: 'Element or link click' },
  { type: 'scroll_depth',    planKey: 'goal_scroll_depth',    label: 'Scroll depth',         desc: 'Scrolls past a %' },
  { type: 'time_on_page',    planKey: 'goal_time_on_page',    label: 'Time on page',         desc: 'Spends N seconds' },
  { type: 'element_view',    planKey: 'goal_element_view',    label: 'Element view',         desc: 'Element scrolls into view' },
  { type: 'video_play',      planKey: 'goal_video_play',      label: 'Video play',           desc: 'YouTube, Vimeo or WP video' },
  { type: 'form_submission', planKey: 'goal_form_submission', label: 'Form submission',      desc: 'Any form or by selector' },
  { type: 'external_event',  planKey: 'goal_external_event',  label: 'Custom GA4/GTM event', desc: 'Via SplitPress.trackEvent()' },
];

const SCROLL_OPTIONS = [
  { value: 25,  label: '25%',  desc: 'Quarter page' },
  { value: 50,  label: '50%',  desc: 'Halfway'      },
  { value: 75,  label: '75%',  desc: 'Most of page' },
  { value: 100, label: '100%', desc: 'Full page'    },
];

const TIME_OPTIONS = [
  { value: 10, label: '10s',   desc: 'Quick glance' },
  { value: 30, label: '30s',   desc: 'Engaged'      },
  { value: 60, label: '1 min', desc: 'Deep reader'  },
];

const START_OPTIONS = [
  { value: 'now',       label: 'Start immediately',  desc: "Activate as soon as it's created"  },
  { value: 'scheduled', label: 'Schedule for later', desc: 'Pick a date and time to go live'   },
  { value: 'draft',     label: 'Save as draft',      desc: 'Set up now, start manually later'  },
];

export default function TestCreate({ config, onBack, onOpenTest }) {
  const [step, setStep] = useState('pick');
  const [form, setForm] = useState({
    post:          null,
    name:          '',
    split:         50,
    goalType:      'scroll_depth',
    goalPercent:   50,
    goalUrl:       '',
    goalSelector:  '',
    goalSeconds:   30,
    goalEventName: '',
    goalLinkUrl:   '',
    clickMode:     'element',
    scrollCustom:  false,
    timeCustom:    false,
    startMode:     'now',
    scheduledAt:   '',
  });

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  const STEPS = ['Page', 'Configure', 'Schedule'];
  const stepIdx = { pick: 0, configure: 1, schedule: 2 }[step] ?? 0;

  function handleStepClick(i) {
    const names = ['pick', 'configure', 'schedule'];
    if (i < stepIdx) setStep(names[i]);
  }

  return (
    <div className="sp-wrap">
      <div className="sp-header">
        <button className="sp-btn sp-btn--ghost" onClick={onBack}>← Tests</button>
        <h1 className="sp-header__title">New A/B Test</h1>
      </div>

      <StepIndicator steps={STEPS} current={stepIdx} onStepClick={handleStepClick} />

      {step === 'pick' && (
        <PickStep
          config={config}
          onSelect={(post) => {
            update('post', post);
            update('name', post.title + ' — A/B Test');
            setStep('configure');
          }}
        />
      )}
      {step === 'configure' && (
        <ConfigureStep
          config={config}
          form={form}
          update={update}
          onBack={() => setStep('pick')}
          onNext={() => setStep('schedule')}
        />
      )}
      {step === 'schedule' && (
        <ScheduleStep
          config={config}
          form={form}
          update={update}
          onBack={() => setStep('configure')}
          onSuccess={(res) => {
            window.location.href = res.edit_url;
          }}
        />
      )}
    </div>
  );
}

// ── Step indicator ──────────────────────────────────────────────────────────

function StepIndicator({ steps, current, onStepClick }) {
  return (
    <div className="sp-steps">
      {steps.map((label, i) => (
        <div key={i} className="sp-steps__item">
          <div className={`sp-steps__item ${i < current ? 'sp-steps__item--done' : i === current ? 'sp-steps__item--active' : ''}`}>
            <button
              type="button"
              className={`sp-steps__dot${i < current ? ' sp-steps__dot--done' : ''}${i === current ? ' sp-steps__dot--active' : ''}${i < current ? ' sp-steps__dot--clickable' : ''}`}
              onClick={() => i < current && onStepClick && onStepClick(i)}
              disabled={i > current}
            >
              {i < current ? '✓' : i + 1}
            </button>
            <span className="sp-steps__label">{label}</span>
          </div>
          {i < steps.length - 1 && (
            <div className={`sp-steps__connector ${i < current ? 'sp-steps__connector--done' : ''}`} />
          )}
        </div>
      ))}
    </div>
  );
}

// ── Step 1: Pick a post ─────────────────────────────────────────────────────

function PickStep({ config, onSelect }) {
  const [query,          setQuery]          = useState('');
  const [postTypeFilter, setPostTypeFilter] = useState('');
  const [results,        setResults]        = useState([]);
  const [loading,        setLoading]        = useState(false);
  const timerRef = useRef(null);

  const postTypes    = config.post_types || {};
  const hasTypeFilter = Object.keys(postTypes).length > 1;

  async function search(q, typeFilter) {
    setLoading(true);
    const body = new FormData();
    body.append('action', 'splitpress_search_posts');
    body.append('nonce',  config.nonce);
    body.append('search', q);
    if (typeFilter) body.append('post_type_filter', typeFilter);
    try {
      const res  = await fetch(config.ajax_url, { method: 'POST', body, credentials: 'same-origin' });
      const json = await res.json();
      if (json.success) setResults(json.data.posts ?? []);
    } catch (_) {}
    setLoading(false);
  }

  useEffect(() => { search('', ''); }, []);
  useEffect(() => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => search(query, postTypeFilter), 350);
    return () => clearTimeout(timerRef.current);
  }, [query, postTypeFilter]);

  return (
    <div className="sp-card">
      <div className="sp-post-picker__header">
        <label className="sp-post-picker__label">
          Which page or post would you like to test?
        </label>
        <div className="sp-post-picker__filters">
          {hasTypeFilter && (
            <select
              value={postTypeFilter}
              onChange={(e) => setPostTypeFilter(e.target.value)}
              className="sp-post-picker__type-filter"
            >
              <option value="">All types</option>
              {Object.entries(postTypes).map(([slug, label]) => (
                <option key={slug} value={slug}>{label}</option>
              ))}
            </select>
          )}
          <input
            type="search"
            placeholder="Search by title…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            className="sp-post-picker__search"
          />
        </div>
      </div>

      {loading && (
        <div className="sp-post-picker__loading">
          <div className="sp-spinner sp-spinner--sm" /> Searching…
        </div>
      )}

      {!loading && results.length === 0 && (
        <div className="sp-post-picker__empty">
          {query.length >= 2 ? 'No results found.' : 'No published posts found.'}
        </div>
      )}

      {!loading && results.length > 0 && (
        <ul className="sp-post-picker__results">
          {results.map((post) => (
            <li key={post.id} className="sp-post-picker__result">
              <button onClick={() => onSelect(post)} className="sp-post-picker__btn">
                <div className="sp-post-picker__btn-inner">
                  <span className="sp-post-picker__title">{post.title}</span>
                  <span className="sp-post-type-badge">{post.type_label}</span>
                </div>
                <span className="sp-post-picker__url">{post.url}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Step 2: Configure (name + split + goal) ─────────────────────────────────

function ConfigureStep({ config, form, update, onBack, onNext }) {
  const plan = config.plan ?? {};
  const featureMinPlans = plan.feature_min_plans ?? {};

  function isGoalLocked(g) {
    return g.planKey !== null && !plan[g.planKey];
  }

  // If the pre-selected goal type is locked, reset to first available.
  useEffect(() => {
    const current = GOAL_TYPES.find((g) => g.type === form.goalType);
    if (current && isGoalLocked(current)) {
      const first = GOAL_TYPES.find((g) => !isGoalLocked(g));
      if (first) update('goalType', first.type);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const canNext = (() => {
    if (!form.name.trim()) return false;
    const currentGoal = GOAL_TYPES.find((g) => g.type === form.goalType);
    if (currentGoal && isGoalLocked(currentGoal)) return false;
    if (form.goalType === 'page_reached')   return form.goalUrl.trim().length > 0;
    if (form.goalType === 'click') {
      return form.clickMode === 'element'
        ? form.goalSelector.trim().length > 0
        : form.goalLinkUrl.trim().length > 0;
    }
    if (form.goalType === 'element_view')   return form.goalSelector.trim().length > 0;
    if (form.goalType === 'external_event') return form.goalEventName.trim().length > 0;
    if (form.goalType === 'scroll_depth' && form.scrollCustom) return form.goalPercent >= 1 && form.goalPercent <= 99;
    if (form.goalType === 'time_on_page'  && form.timeCustom)  return form.goalSeconds >= 1;
    return true;
  })();

  const controlPct = 100 - form.split;
  const variantPct = form.split;

  return (
    <div className="sp-card sp-card-body">
      <div className="sp-post-ref">
        <span className="sp-post-ref__dot" />
        <span className="sp-post-ref__name">{form.post.title}</span>
        <span className="sp-post-type-badge">{form.post.type_label}</span>
      </div>

      {/* Test setup */}
      <div className="sp-configure-section">
        <p className="sp-configure-section__title">Test setup</p>

        <div>
          <label className="sp-form-label">Test name</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            autoFocus
            className="sp-form-input"
          />
        </div>

        <div>
          <label className="sp-form-label">Traffic split</label>
          <div className="sp-split-control">
            <div className="sp-split-numbers">
              <div className="sp-split-number sp-split-number--control">
                <span className="sp-split-number__pct">{controlPct}%</span>
                <span className="sp-split-number__name">Control</span>
              </div>
              <div className="sp-split-number sp-split-number--variant">
                <span className="sp-split-number__pct">{variantPct}%</span>
                <span className="sp-split-number__name">Variant A</span>
              </div>
            </div>
            <input
              type="range"
              min="0" max="100" step="5"
              value={controlPct}
              onChange={(e) => update('split', 100 - Math.max(10, Math.min(90, Number(e.target.value))))}
              className="sp-split-slider"
              style={{
                background: `linear-gradient(to right, #C8DDE0 0%, #C8DDE0 ${controlPct}%, #46808C ${controlPct}%, #46808C 100%)`,
              }}
            />
            <div className="sp-split-hints">
              <span>Original page</span>
              <span>Variant page</span>
            </div>
          </div>
        </div>
      </div>

      {/* Conversion goal */}
      <div className="sp-configure-section">
        <p className="sp-configure-section__title">Conversion goal</p>

        <div>
          <p className="sp-muted" style={{ fontSize: 14, marginBottom: 12 }}>
            What action counts as a conversion for this test?
          </p>
          <div className="sp-goal-grid">
            {GOAL_TYPES.map((g) => {
              const locked = isGoalLocked(g);
              if (locked) {
                return (
                  <a
                    key={g.type}
                    href={config.billing_url}
                    target="_blank"
                    rel="noreferrer"
                    className="sp-goal-option sp-goal-option--locked"
                  >
                    <span className="sp-goal-option__name">{g.label}</span>
                    <span className="sp-goal-option__desc">{g.desc}</span>
                    <span className="sp-goal-option__upgrade">
                      <svg className="sp-goal-option__upgrade-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" aria-hidden="true">
                        <path d="M256 160L256 224L384 224L384 160C384 124.7 355.3 96 320 96C284.7 96 256 124.7 256 160zM192 224L192 160C192 89.3 249.3 32 320 32C390.7 32 448 89.3 448 160L448 224C483.3 224 512 252.7 512 288L512 512C512 547.3 483.3 576 448 576L192 576C156.7 576 128 547.3 128 512L128 288C128 252.7 156.7 224 192 224z"/>
                      </svg>
                      Available from {featureMinPlans[g.planKey]}
                    </span>
                  </a>
                );
              }
              return (
                <button
                  key={g.type}
                  onClick={() => update('goalType', g.type)}
                  className={`sp-goal-option ${form.goalType === g.type ? 'sp-goal-option--active' : ''}`}
                >
                  <span className="sp-goal-option__name">{g.label}</span>
                  <span className="sp-goal-option__desc">{g.desc}</span>
                </button>
              );
            })}
          </div>
        </div>

        <GoalConfig form={form} update={update} />
      </div>

      <div className="sp-card-footer">
        <button className="sp-btn sp-btn--ghost" onClick={onBack}>← Back</button>
        <button className="sp-btn sp-btn--primary" disabled={!canNext} onClick={onNext}>
          Next →
        </button>
      </div>
    </div>
  );
}

// ── Goal configuration (conditional per goal type) ──────────────────────────

function GoalConfig({ form, update }) {
  if (form.goalType === 'page_reached') {
    return (
      <div>
        <label className="sp-form-label">Goal URL</label>
        <p className="sp-muted" style={{ fontSize: 12, marginBottom: 6 }}>
          Use <code>*</code> as a wildcard, e.g. <code>https://example.com/thank-you*</code>
        </p>
        <input
          type="url"
          placeholder="https://example.com/thank-you"
          value={form.goalUrl}
          onChange={(e) => update('goalUrl', e.target.value)}
          autoFocus
          className="sp-form-input"
        />
      </div>
    );
  }

  if (form.goalType === 'click') {
    return (
      <div>
        <label className="sp-form-label">Click type</label>
        <div className="sp-click-mode-grid">
          <button
            type="button"
            className={`sp-click-mode ${form.clickMode === 'element' ? 'sp-click-mode--active' : ''}`}
            onClick={() => update('clickMode', 'element')}
          >
            <span className="sp-click-mode__name">Element click</span>
            <span className="sp-click-mode__desc">Match any element by CSS selector</span>
          </button>
          <button
            type="button"
            className={`sp-click-mode ${form.clickMode === 'link' ? 'sp-click-mode--active' : ''}`}
            onClick={() => update('clickMode', 'link')}
          >
            <span className="sp-click-mode__name">Link / URL click</span>
            <span className="sp-click-mode__desc">Tracks any link pointing to this URL — works with #anchors too</span>
          </button>
        </div>

        {form.clickMode === 'element' && (
          <div style={{ marginTop: 12 }}>
            <label className="sp-form-label">CSS selector</label>
            <p className="sp-muted" style={{ fontSize: 12, marginBottom: 6 }}>
              Tracks clicks on any element matching this selector.
            </p>
            <input
              type="text"
              placeholder=".buy-now-button"
              value={form.goalSelector}
              onChange={(e) => update('goalSelector', e.target.value)}
              autoFocus
              className="sp-form-input"
            />
          </div>
        )}

        {form.clickMode === 'link' && (
          <div style={{ marginTop: 12 }}>
            <label className="sp-form-label">URL or anchor</label>
            <p className="sp-muted" style={{ fontSize: 12, marginBottom: 6 }}>
              Enter a full URL or a hash anchor (e.g. <code>#contact</code>).
            </p>
            <input
              type="text"
              placeholder="#contact or https://example.com/checkout"
              value={form.goalLinkUrl}
              onChange={(e) => update('goalLinkUrl', e.target.value)}
              autoFocus
              className="sp-form-input"
            />
          </div>
        )}
      </div>
    );
  }

  if (form.goalType === 'scroll_depth') {
    return (
      <div>
        <label className="sp-form-label Scroll threshold">Scroll threshold</label>
        <div className="sp-goal-grid sp-goal-grid--5" style={{ marginTop: 8 }}>
          {SCROLL_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { update('goalPercent', opt.value); update('scrollCustom', false); }}
              className={`sp-goal-option ${!form.scrollCustom && form.goalPercent === opt.value ? 'sp-goal-option--active' : ''}`}
            >
              <span className="sp-goal-option__value">{opt.label}</span>
              <span className="sp-goal-option__desc">{opt.desc}</span>
            </button>
          ))}
          {form.scrollCustom ? (
            <div className="sp-goal-option sp-goal-option--active sp-goal-option--custom-active">
              <div className="sp-goal-option__custom-value">
                <input
                  type="number"
                  min="1"
                  max="99"
                  value={form.goalPercent === 50 ? '' : form.goalPercent}
                  placeholder="40"
                  onChange={(e) => update('goalPercent', Math.min(99, Math.max(1, Number(e.target.value) || 1)))}
                  className="sp-goal-option__custom-input"
                  autoFocus
                />
                <span className="sp-goal-option__custom-unit">%</span>
              </div>
              <span className="sp-goal-option__desc">custom</span>
            </div>
          ) : (
            <button
              onClick={() => update('scrollCustom', true)}
              className="sp-goal-option"
            >
              <span className="sp-goal-option__value">···</span>
              <span className="sp-goal-option__desc">Custom</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  if (form.goalType === 'time_on_page') {
    return (
        <div>
            <label className="sp-form-label Scroll threshold">
                Time threshold
            </label>
            <div
                className="sp-goal-grid sp-goal-grid--4"
                style={{ marginTop: 8 }}
            >
                {TIME_OPTIONS.map((opt) => (
                    <button
                        key={opt.value}
                        onClick={() => {
                            update('goalSeconds', opt.value);
                            update('timeCustom', false);
                        }}
                        className={`sp-goal-option ${!form.timeCustom && form.goalSeconds === opt.value ? 'sp-goal-option--active' : ''}`}
                    >
                        <span className="sp-goal-option__value">
                            {opt.label}
                        </span>
                        <span className="sp-goal-option__desc">{opt.desc}</span>
                    </button>
                ))}
                {form.timeCustom ? (
                    <div className="sp-goal-option sp-goal-option--active sp-goal-option--custom-active">
                        <div className="sp-goal-option__custom-value">
                            <input
                                type="number"
                                min="1"
                                value={form.goalSeconds === 30 ? '' : form.goalSeconds}
                                placeholder="45"
                                onChange={(e) =>
                                    update('goalSeconds', Math.max(1, Number(e.target.value) || 1))
                                }
                                className="sp-goal-option__custom-input"
                                autoFocus
                            />
                            <span className="sp-goal-option__custom-unit">s</span>
                        </div>
                        <span className="sp-goal-option__desc">custom</span>
                    </div>
                ) : (
                    <button
                        onClick={() => update('timeCustom', true)}
                        className="sp-goal-option"
                    >
                        <span className="sp-goal-option__value">···</span>
                        <span className="sp-goal-option__desc">Custom</span>
                    </button>
                )}
            </div>
        </div>
    );
  }

  if (form.goalType === 'element_view') {
    return (
      <div>
        <label className="sp-form-label">CSS selector</label>
        <p className="sp-muted" style={{ fontSize: 12, marginBottom: 6 }}>
          Fires when this element scrolls into view (at least 50% visible).
        </p>
        <input
          type="text"
          placeholder="#pricing-table"
          value={form.goalSelector}
          onChange={(e) => update('goalSelector', e.target.value)}
          autoFocus
          className="sp-form-input"
        />
      </div>
    );
  }

  if (form.goalType === 'video_play') {
    return (
      <div className="sp-goal-note">
        Automatically detects YouTube, Vimeo, and native WordPress {'<video>'} embeds on the page. No extra setup needed.
      </div>
    );
  }

  if (form.goalType === 'form_submission') {
    return (
      <div>
        <label className="sp-form-label">Form selector <span className="sp-muted" style={{ fontWeight: 400 }}>(optional)</span></label>
        <p className="sp-muted" style={{ fontSize: 12, marginBottom: 6 }}>
          Leave blank to track any form on the page. Enter a CSS selector to target a specific form — works with WPForms, Contact Form 7, Gravity Forms, Elementor, or any HTML form.
        </p>
        <input
          type="text"
          placeholder="#contact-form, .wpcf7-form, form[action*=checkout]"
          value={form.goalSelector}
          onChange={(e) => update('goalSelector', e.target.value)}
          className="sp-form-input sp-form-input--full"
        />
      </div>
    );
  }

  if (form.goalType === 'external_event') {
    const eventName = form.goalEventName || 'purchase';
    return (
      <div>
        <label className="sp-form-label">Event name</label>
        <p className="sp-muted" style={{ fontSize: 12, marginBottom: 6 }}>
          Fire this from your theme, plugin, or Google Tag Manager.
        </p>
        <input
          type="text"
          placeholder="purchase"
          value={form.goalEventName}
          onChange={(e) => update('goalEventName', e.target.value)}
          autoFocus
          className="sp-form-input"
        />
        <code className="sp-code-hint">
          SplitPress.trackEvent('{eventName}')
        </code>
        <p className="sp-muted" style={{ fontSize: 12, marginTop: 8 }}>
          GA4 and GTM automatically receive this event if they are present on the page.
        </p>
      </div>
    );
  }

  return null;
}

// ── Step 3: Schedule + submit ───────────────────────────────────────────────

function ScheduleStep({ config, form, update, onBack, onSuccess }) {
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState(null);

  const plan        = config.plan ?? {};
  const canSchedule = plan.scheduling ?? false;
  const schedulingMinPlan = plan.feature_min_plans?.scheduling ?? 'Pro';
  const canSubmit   = form.startMode !== 'scheduled' || form.scheduledAt;

  const submitLabel = submitting
    ? 'Creating…'
    : form.startMode === 'now'       ? 'Create & Start Test'
    : form.startMode === 'scheduled' ? 'Schedule Test'
    : 'Save as Draft';

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);

    const finalSelector = form.goalType === 'click' && form.clickMode === 'link'
      ? (form.goalLinkUrl.startsWith('#')
          ? `a[href="${form.goalLinkUrl}"]`
          : `a[href^="${form.goalLinkUrl}"]`)
      : form.goalSelector;

    const body = new FormData();
    body.append('action', 'splitpress_create_test');
    body.append('nonce',  config.nonce);
    body.append('data', JSON.stringify({
      post_id:         form.post.id,
      name:            form.name,
      split:           form.split,
      goal_type:       form.goalType,
      goal_percent:    form.goalPercent,
      goal_url:        form.goalUrl,
      goal_selector:   finalSelector,
      goal_seconds:    form.goalSeconds,
      goal_event_name: form.goalEventName,
      start_mode:      form.startMode,
      scheduled_at:    form.startMode === 'scheduled' ? form.scheduledAt : null,
    }));
    try {
      const res  = await fetch(config.ajax_url, { method: 'POST', body, credentials: 'same-origin' });
      const json = await res.json();
      if (json.success) {
        onSuccess(json.data);
      } else {
        setError(json.data || 'Something went wrong. Please try again.');
      }
    } catch (_) {
      setError('Network error — please try again.');
    }
    setSubmitting(false);
  }

  return (
    <div className="sp-card sp-card-body">
      <div>
        <p className="sp-form-label">When should the test start?</p>
        <div className="sp-start-options">
          {START_OPTIONS.map((opt) => {
            const locked = opt.value === 'scheduled' && !canSchedule;
            return (
              <div key={opt.value} className={locked ? 'sp-plan-gate-wrap' : ''}>
                <label className={`sp-start-option ${form.startMode === opt.value ? 'sp-start-option--active' : ''} ${locked ? 'sp-start-option--locked' : ''}`}>
                  <input
                    type="radio"
                    name="startMode"
                    value={opt.value}
                    checked={form.startMode === opt.value}
                    onChange={() => !locked && update('startMode', opt.value)}
                    disabled={locked}
                  />
                  <div>
                    <div className="sp-start-option__label">{opt.label}</div>
                    <div className="sp-start-option__desc">{opt.desc}</div>
                  </div>
                </label>
                {locked && (
                  <div className="sp-plan-gate-overlay">
                    <span className="sp-plan-gate-overlay__lock">🔒</span>
                    <span className="sp-plan-gate-overlay__text">Available on <strong>{schedulingMinPlan}</strong> plan and above</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {form.startMode === 'scheduled' && (
          <div className="sp-datetime-field">
            <label className="sp-form-label--sm">Start date &amp; time</label>
            <input
              type="datetime-local"
              value={form.scheduledAt}
              onChange={(e) => update('scheduledAt', e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
              className="sp-form-input sp-form-input--auto"
            />
          </div>
        )}
      </div>

      {error && <div className="sp-form-error">{error}</div>}

      <div className="sp-card-footer">
        <button className="sp-btn sp-btn--ghost" disabled={submitting} onClick={onBack}>← Back</button>
        <button className="sp-btn sp-btn--primary" disabled={submitting || !canSubmit} onClick={handleSubmit}>
          {submitLabel}
        </button>
      </div>
    </div>
  );
}
