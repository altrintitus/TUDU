import { useEffect, useState } from 'react';

export type Route =
  | { name: 'home' }
  | { name: 'capture' } // home + capture sheet open (deep link for launchers/shortcuts)
  | { name: 'list'; id: string }
  | { name: 'idea'; id: string }
  | { name: 'settings' };

export function parseHash(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  if (parts.length === 0) return { name: 'home' };
  if (parts[0] === 'capture') return { name: 'capture' };
  if (parts[0] === 'settings') return { name: 'settings' };
  if (parts[0] === 'list' && parts[1]) return { name: 'list', id: parts[1] };
  if (parts[0] === 'idea' && parts[1]) return { name: 'idea', id: parts[1] };
  return { name: 'home' };
}

export function routeToHash(route: Route): string {
  switch (route.name) {
    case 'home': return '#/';
    case 'capture': return '#/capture';
    case 'settings': return '#/settings';
    case 'list': return `#/list/${route.id}`;
    case 'idea': return `#/idea/${route.id}`;
  }
}

export function navigate(route: Route): void {
  window.location.hash = routeToHash(route);
}

export function useHashRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash));
  useEffect(() => {
    const onChange = () => setRoute(parseHash(window.location.hash));
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}
