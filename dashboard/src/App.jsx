import { useState, useEffect } from 'react';
import TestList   from './pages/TestList.jsx';
import TestDetail from './pages/TestDetail.jsx';
import TestCreate from './pages/TestCreate.jsx';

function getTestIdFromUrl() {
  return new URLSearchParams(window.location.search).get('test');
}

export default function App({ config }) {
  const [activeTestId,    setActiveTestId]    = useState(getTestIdFromUrl);
  const [creating,        setCreating]        = useState(false);
  const [connectionError, setConnectionError] = useState(null);

  useEffect(() => {
    function onPopState() {
      setActiveTestId(getTestIdFromUrl());
      setCreating(false);
    }
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  function openTest(testId) {
    const url = new URL(window.location.href);
    url.searchParams.set('test', testId);
    history.pushState({ testId }, '', url);
    setCreating(false);
    setActiveTestId(String(testId));
  }

  function goBack() {
    const url = new URL(window.location.href);
    url.searchParams.delete('test');
    history.pushState({}, '', url);
    setActiveTestId(null);
    setCreating(false);
  }

  function startCreate() {
    setCreating(true);
    setActiveTestId(null);
  }

  return (
    <div className="sp-app">
      {connectionError && (
        <ConnectionBanner
          message={connectionError}
          settingsUrl={config.settings_url}
          onDismiss={() => setConnectionError(null)}
        />
      )}

      {creating ? (
        <TestCreate config={config} onBack={goBack} onOpenTest={openTest} />
      ) : activeTestId ? (
        <TestDetail config={config} testId={activeTestId} onBack={goBack} onError={setConnectionError} onOpenTest={openTest} />
      ) : (
        <TestList config={config} onOpenTest={openTest} onNewTest={startCreate} onError={setConnectionError} />
      )}
    </div>
  );
}

function ConnectionBanner({ message, settingsUrl, onDismiss }) {
  return (
    <div className="sp-connection-banner">
      <svg className="sp-connection-banner__icon" width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
      </svg>
      <span className="sp-connection-banner__text">
        <strong>Connection error:</strong> {message}
      </span>
      <a href={settingsUrl} className="sp-connection-banner__link">Check settings →</a>
      <button onClick={onDismiss} className="sp-connection-banner__dismiss" aria-label="Dismiss">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </button>
    </div>
  );
}
