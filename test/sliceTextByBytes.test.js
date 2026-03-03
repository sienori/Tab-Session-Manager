import { describe, it, expect } from 'vitest';
import { sliceTextByBytes } from '../src/common/sliceTextByBytes.js';

describe('sliceTextByBytes', () => {
  it('should slice ASCII text by byte length', () => {
    const text = 'Hello World';
    const result = sliceTextByBytes(text, 5);
    expect(result).toBe('Hello');
  });

  it('should handle empty string', () => {
    const text = '';
    const result = sliceTextByBytes(text, 5);
    expect(result).toBe('');
  });

  it('should handle byte length larger than text', () => {
    const text = 'Hi';
    const result = sliceTextByBytes(text, 100);
    expect(result).toBe('Hi');
  });

  it('should handle byte length of 0', () => {
    const text = 'Hello';
    const result = sliceTextByBytes(text, 0);
    expect(result).toBe('');
  });

  it('should handle unicode characters', () => {
    const text = 'こんにちは'; // 5 Japanese characters
    const result = sliceTextByBytes(text, 10);
    // Each Japanese char is 3 bytes in UTF-8
    expect(result.length).toBeGreaterThan(0);
    expect(result.length).toBeLessThanOrEqual(5);
  });
});
