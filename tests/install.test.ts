import { describe, it, expect } from 'vitest';
import { shouldShowInstallHint } from '../src/logic/install';

const IOS_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';
const MAC_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

describe('shouldShowInstallHint', () => {
  it('shows for iPhone Safari browser tab, not dismissed', () => {
    expect(shouldShowInstallHint({ ua: IOS_UA, standalone: false, dismissed: false })).toBe(true);
  });
  it('hidden when already standalone (installed)', () => {
    expect(shouldShowInstallHint({ ua: IOS_UA, standalone: true, dismissed: false })).toBe(false);
  });
  it('hidden when dismissed or not iOS', () => {
    expect(shouldShowInstallHint({ ua: IOS_UA, standalone: false, dismissed: true })).toBe(false);
    expect(shouldShowInstallHint({ ua: MAC_UA, standalone: false, dismissed: false })).toBe(false);
  });
});
