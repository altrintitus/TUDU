import { describe, it, expect } from 'vitest';
import { firstLine } from '../src/logic/text';

describe('firstLine', () => {
  it('returns first line trimmed', () => {
    expect(firstLine('Agent eval harness\nmore detail')).toBe('Agent eval harness');
    expect(firstLine('  padded  \nrest')).toBe('padded');
  });
  it('falls back to Untitled for empty/whitespace', () => {
    expect(firstLine('')).toBe('Untitled');
    expect(firstLine('\n\nbody only')).toBe('Untitled');
  });
});
