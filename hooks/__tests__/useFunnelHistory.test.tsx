/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react';
import { useFunnelHistory } from '../useFunnelHistory';
import type { FunnelDoc } from '@/lib/funnel-types';

function makeDoc(id: string): FunnelDoc {
  return {
    id,
    contentId: 'c1',
    contentType: 'quest',
    pages: [],
    createdAt: '',
    updatedAt: '',
  };
}

describe('useFunnelHistory', () => {
  test('initialises with the given doc', () => {
    const doc = makeDoc('v1');
    const { result } = renderHook(() => useFunnelHistory(doc));
    expect(result.current.doc.id).toBe('v1');
  });

  test('canUndo is false initially', () => {
    const { result } = renderHook(() => useFunnelHistory(makeDoc('v1')));
    expect(result.current.canUndo).toBe(false);
  });

  test('canRedo is false initially', () => {
    const { result } = renderHook(() => useFunnelHistory(makeDoc('v1')));
    expect(result.current.canRedo).toBe(false);
  });

  test('push makes doc current and enables undo', () => {
    const { result } = renderHook(() => useFunnelHistory(makeDoc('v1')));
    act(() => { result.current.push(makeDoc('v2')); });
    expect(result.current.doc.id).toBe('v2');
    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(false);
  });

  test('undo reverts to previous doc', () => {
    const { result } = renderHook(() => useFunnelHistory(makeDoc('v1')));
    act(() => { result.current.push(makeDoc('v2')); });
    act(() => { result.current.undo(); });
    expect(result.current.doc.id).toBe('v1');
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(true);
  });

  test('redo re-applies undone change', () => {
    const { result } = renderHook(() => useFunnelHistory(makeDoc('v1')));
    act(() => { result.current.push(makeDoc('v2')); });
    act(() => { result.current.undo(); });
    act(() => { result.current.redo(); });
    expect(result.current.doc.id).toBe('v2');
    expect(result.current.canRedo).toBe(false);
  });

  test('push after undo clears redo stack', () => {
    const { result } = renderHook(() => useFunnelHistory(makeDoc('v1')));
    act(() => { result.current.push(makeDoc('v2')); });
    act(() => { result.current.undo(); });
    act(() => { result.current.push(makeDoc('v3')); });
    expect(result.current.canRedo).toBe(false);
    expect(result.current.doc.id).toBe('v3');
  });

  test('multiple pushes and undos work in order', () => {
    const { result } = renderHook(() => useFunnelHistory(makeDoc('v1')));
    act(() => { result.current.push(makeDoc('v2')); });
    act(() => { result.current.push(makeDoc('v3')); });
    act(() => { result.current.push(makeDoc('v4')); });
    act(() => { result.current.undo(); });
    expect(result.current.doc.id).toBe('v3');
    act(() => { result.current.undo(); });
    expect(result.current.doc.id).toBe('v2');
    act(() => { result.current.undo(); });
    expect(result.current.doc.id).toBe('v1');
    expect(result.current.canUndo).toBe(false);
  });

  test('undo on empty history is a no-op', () => {
    const { result } = renderHook(() => useFunnelHistory(makeDoc('v1')));
    act(() => { result.current.undo(); });
    expect(result.current.doc.id).toBe('v1');
  });

  test('redo on empty future is a no-op', () => {
    const { result } = renderHook(() => useFunnelHistory(makeDoc('v1')));
    act(() => { result.current.redo(); });
    expect(result.current.doc.id).toBe('v1');
  });

  test('past is capped at exactly 50 entries', () => {
    const { result } = renderHook(() => useFunnelHistory(makeDoc('v0')));
    // Push 60 versions — only the last 50 should remain in past
    for (let i = 1; i <= 60; i++) {
      act(() => { result.current.push(makeDoc(`v${i}`)); });
    }
    // present = v60, past has exactly 50 entries (v10..v59)
    // Undoing 50 times should exhaust past entirely
    for (let i = 0; i < 50; i++) {
      act(() => { result.current.undo(); });
    }
    expect(result.current.canUndo).toBe(false);
    // After 50 undos from v60, we are at v10 (the oldest kept entry)
    expect(result.current.doc.id).toBe('v10');
  });
});
