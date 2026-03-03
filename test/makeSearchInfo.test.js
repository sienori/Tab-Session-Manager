import { describe, it, expect } from 'vitest';
import { makeSearchInfo } from '../src/common/makeSearchInfo.js';

describe('makeSearchInfo', () => {
  it('should create search info from session with tabs', () => {
    const session = {
      id: 'session-123',
      windows: {
        1: {
          1: { title: 'Google' },
          2: { title: 'GitHub' }
        }
      }
    };
    
    const result = makeSearchInfo(session);
    
    expect(result.id).toBe('session-123');
    expect(result.tabsTitle).toContain('google');
    expect(result.tabsTitle).toContain('github');
  });

  it('should handle empty windows', () => {
    const session = {
      id: 'session-456',
      windows: {}
    };
    
    const result = makeSearchInfo(session);
    
    expect(result.id).toBe('session-456');
    expect(result.tabsTitle).toBe('');
  });

  it('should convert titles to lowercase', () => {
    const session = {
      id: 'session-789',
      windows: {
        1: {
          1: { title: 'UPPERCASE' },
          2: { title: 'MixedCase' }
        }
      }
    };
    
    const result = makeSearchInfo(session);
    
    expect(result.tabsTitle).toBe('uppercase mixedcase');
  });

  it('should handle multiple windows', () => {
    const session = {
      id: 'multi-window',
      windows: {
        1: { 1: { title: 'Tab 1' } },
        2: { 1: { title: 'Tab 2' }, 2: { title: 'Tab 3' } }
      }
    };
    
    const result = makeSearchInfo(session);
    
    expect(result.tabsTitle).toContain('tab 1');
    expect(result.tabsTitle).toContain('tab 2');
    expect(result.tabsTitle).toContain('tab 3');
  });

  it('should join all titles with spaces', () => {
    const session = {
      id: 'join-test',
      windows: {
        1: { 1: { title: 'A' }, 2: { title: 'B' }, 3: { title: 'C' } }
      }
    };
    
    const result = makeSearchInfo(session);
    
    expect(result.tabsTitle).toBe('a b c');
  });
});
