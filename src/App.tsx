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
