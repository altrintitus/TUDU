import { useHashRoute } from './hooks/useHashRoute';

export default function App() {
  const route = useHashRoute();
  return (
    <div className="app">
      <header className="app-header"><h1>Kin</h1></header>
      <main>
        {route.name === 'home' && <p className="placeholder">home</p>}
        {route.name === 'list' && <p className="placeholder">list {route.id}</p>}
        {route.name === 'idea' && <p className="placeholder">idea {route.id}</p>}
        {route.name === 'settings' && <p className="placeholder">settings</p>}
      </main>
    </div>
  );
}
