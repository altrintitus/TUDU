import { useEffect } from 'react';
import { useHashRoute } from './hooks/useHashRoute';
import { ensureInbox } from './db';
import { HomeScreen } from './screens/HomeScreen';
import { ListScreen } from './screens/ListScreen';
import { IdeaScreen } from './screens/IdeaScreen';
import { ToastHost } from './components/Toast';

export default function App() {
  const route = useHashRoute();

  useEffect(() => {
    ensureInbox();
  }, []);

  return (
    <div className="app">
      {route.name === 'home' && <HomeScreen />}
      {route.name === 'list' && <ListScreen key={route.id} listId={route.id} />}
      {route.name === 'idea' && <IdeaScreen key={route.id} ideaId={route.id} />}
      {route.name === 'settings' && <p className="placeholder">settings</p>}
      <ToastHost />
    </div>
  );
}
