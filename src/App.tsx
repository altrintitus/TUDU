import { useEffect } from 'react';
import { useHashRoute } from './hooks/useHashRoute';
import { ensureInbox } from './db';
import { HomeScreen } from './screens/HomeScreen';
import { ToastHost } from './components/Toast';

export default function App() {
  const route = useHashRoute();

  useEffect(() => {
    ensureInbox();
  }, []);

  return (
    <div className="app">
      {route.name === 'home' && <HomeScreen />}
      {route.name === 'list' && <p className="placeholder">list {route.id}</p>}
      {route.name === 'idea' && <p className="placeholder">idea {route.id}</p>}
      {route.name === 'settings' && <p className="placeholder">settings</p>}
      <ToastHost />
    </div>
  );
}
