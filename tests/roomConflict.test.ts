import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hasRoomConflict, getRecurringDatesForCheck } from '../lib/roomConflict';
import { EventOccurrence, OccurrenceStatus } from '../types';

const baseOccurrence = (overrides: Partial<EventOccurrence>): EventOccurrence => ({
  id: 'occ1',
  template_id: 't1',
  date: '2026-02-01',
  time: '10:00',
  end_time: '12:00',
  status: OccurrenceStatus.DRAFT,
  ...overrides
});

test('hasRoomConflict returns true on overlap in same room', () => {
  const occurrences: EventOccurrence[] = [
    baseOccurrence({ room_id: 'r1' })
  ];
  const result = hasRoomConflict(occurrences, 'r1', '2026-02-01', '11:00', '13:00');
  assert.equal(result, true);
});

test('hasRoomConflict returns false for different room', () => {
  const occurrences: EventOccurrence[] = [
    baseOccurrence({ room_id: 'r1' })
  ];
  const result = hasRoomConflict(occurrences, 'r2', '2026-02-01', '11:00', '13:00');
  assert.equal(result, false);
});

test('hasRoomConflict treats missing time as conflict', () => {
  const occurrences: EventOccurrence[] = [
    baseOccurrence({ room_id: 'r1' })
  ];
  const result = hasRoomConflict(occurrences, 'r1', '2026-02-01', undefined, undefined);
  assert.equal(result, true);
});

test('hasRoomConflict ignores excluded occurrence', () => {
  const occurrences: EventOccurrence[] = [
    baseOccurrence({ room_id: 'r1', id: 'occ1' })
  ];
  const result = hasRoomConflict(occurrences, 'r1', '2026-02-01', '10:30', '11:30', 'occ1');
  assert.equal(result, false);
});

test('getRecurringDatesForCheck returns weekly dates', () => {
  const dates = getRecurringDatesForCheck('2026-02-02', '2026-02-16', 'weekly', 1);
  assert.deepEqual(dates, ['2026-02-02', '2026-02-09', '2026-02-16']);
});

test('getRecurringDatesForCheck returns monthly dates on same weekday', () => {
  const dates = getRecurringDatesForCheck('2026-02-02', '2026-04-30', 'monthly', 1);
  assert.ok(dates.length >= 2);
  dates.forEach(date => {
    const day = new Date(date).getDay();
    assert.equal(day, new Date('2026-02-02').getDay());
  });
});
