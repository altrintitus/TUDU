import { describe, it, expect } from 'vitest';
import { parseHash, routeToHash } from '../src/hooks/useHashRoute';

describe('parseHash', () => {
  it('parses empty/root to home', () => {
    expect(parseHash('')).toEqual({ name: 'home' });
    expect(parseHash('#/')).toEqual({ name: 'home' });
  });
  it('parses list and idea routes with ids', () => {
    expect(parseHash('#/list/abc-123')).toEqual({ name: 'list', id: 'abc-123' });
    expect(parseHash('#/idea/x9')).toEqual({ name: 'idea', id: 'x9' });
  });
  it('parses settings', () => {
    expect(parseHash('#/settings')).toEqual({ name: 'settings' });
  });
  it('falls back to home on garbage', () => {
    expect(parseHash('#/nope/whatever')).toEqual({ name: 'home' });
    expect(parseHash('#/list/')).toEqual({ name: 'home' });
  });
});

describe('routeToHash', () => {
  it('is the inverse of parseHash', () => {
    const routes = [
      { name: 'home' }, { name: 'settings' },
      { name: 'list', id: 'a1' }, { name: 'idea', id: 'b2' }
    ] as const;
    for (const r of routes) expect(parseHash(routeToHash(r))).toEqual(r);
  });
});
