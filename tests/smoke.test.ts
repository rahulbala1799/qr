import { describe, it, expect } from 'vitest';

describe('smoke test', () => {
  it('runs tests successfully', () => {
    expect(true).toBe(true);
  });

  it('can perform basic arithmetic', () => {
    expect(2 + 2).toBe(4);
  });

  it('can work with strings', () => {
    expect('hello'.toUpperCase()).toBe('HELLO');
  });
});
