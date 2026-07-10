import { useEffect, useState } from 'react';
import { useHashRoute } from './hooks/useHashRoute';
import { ensureInbox } from './db';
import { HomeScreen } from './screens/HomeScreen';
import { ListScreen } from './screens/ListScreen';
import { IdeaScreen } from './screens/IdeaScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { ToastHost } from './components/Toast';
import { DbErrorBanner } from './components/DbErrorBanner';

export default function App() {
  const route = useHashRoute();
  const [dbError, setDbError] = useState(false);

  useEffect(() => {
    // First DB touch: on success ask for persistent storage (fire-and-forget);
    // on failure (e.g. private mode) surface a banner instead of dropping writes.
    ensureInbox().then(
      () => { void navigator.storage?.persist?.(); },
      () => setDbError(true)
    );
  }, []);

  useEffect(() => {
    // iOS keeps position:fixed anchored to the full layout viewport, so the
    // on-screen keyboard overlays bottom sheets. Track the keyboard height via
    // visualViewport and expose it as --kb-inset so sheets lift above it.
    const vv = window.visualViewport;
    if (!vv) return;
    const root = document.documentElement;
    const update = () => {
      const inset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      root.style.setProperty('--kb-inset', `${inset}px`);
    };
    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
      root.style.setProperty('--kb-inset', '0px');
    };
  }, []);

  return (
    <div className="app">
      {dbError && <DbErrorBanner />}
      {route.name === 'home' && <HomeScreen />}
      {route.name === 'list' && <ListScreen key={route.id} listId={route.id} />}
      {route.name === 'idea' && <IdeaScreen key={route.id} ideaId={route.id} />}
      {route.name === 'settings' && <SettingsScreen />}
      <ToastHost />
    </div>
  );
}
