import { describe, test, expect } from '@jest/globals';
import { deriveVehicleSessions, toISTDateString, toISTHour } from '../../../server/modules/analytics/daily-stats.storage';

describe('deriveVehicleSessions', () => {
    test('empty timestamps → empty sessions', () => {
        const result = deriveVehicleSessions([]);
        expect(result.sessions).toEqual([]);
        expect(result.totalWorkMs).toBe(0);
        expect(result.totalBreakMs).toBe(0);
    });

    test('single timestamp → 1 session, count=1, duration=0', () => {
        const t = new Date('2025-06-15T10:00:00Z');
        const result = deriveVehicleSessions([t]);
        expect(result.sessions).toHaveLength(1);
        expect(result.sessions[0].count).toBe(1);
        expect(result.sessions[0].durationMs).toBe(0);
        expect(result.sessions[0].index).toBe(1);
        expect(result.totalWorkMs).toBe(0);
        expect(result.totalBreakMs).toBe(0);
    });

    test('two timestamps 5 min apart → 1 session, count=2', () => {
        const t1 = new Date('2025-06-15T10:00:00Z');
        const t2 = new Date('2025-06-15T10:05:00Z');
        const result = deriveVehicleSessions([t1, t2]);
        expect(result.sessions).toHaveLength(1);
        expect(result.sessions[0].count).toBe(2);
        expect(result.sessions[0].durationMs).toBe(5 * 60 * 1000);
    });

    test('two timestamps 30 min apart → 2 sessions', () => {
        const t1 = new Date('2025-06-15T10:00:00Z');
        const t2 = new Date('2025-06-15T10:30:00Z');
        const result = deriveVehicleSessions([t1, t2]);
        expect(result.sessions).toHaveLength(2);
        expect(result.sessions[0].count).toBe(1);
        expect(result.sessions[1].count).toBe(1);
    });

    test('exactly 20 min gap → extends session (<=)', () => {
        const t1 = new Date('2025-06-15T10:00:00Z');
        const t2 = new Date('2025-06-15T10:20:00Z'); // exactly 20 min
        const result = deriveVehicleSessions([t1, t2]);
        expect(result.sessions).toHaveLength(1);
        expect(result.sessions[0].count).toBe(2);
    });

    test('20 min 1 sec gap → new session', () => {
        const t1 = new Date('2025-06-15T10:00:00Z');
        const t2 = new Date('2025-06-15T10:20:01Z'); // 20 min + 1 sec
        const result = deriveVehicleSessions([t1, t2]);
        expect(result.sessions).toHaveLength(2);
    });

    test('calculates break_before_ms correctly', () => {
        const t1 = new Date('2025-06-15T10:00:00Z');
        const t2 = new Date('2025-06-15T10:30:00Z'); // 30 min gap → new session
        const result = deriveVehicleSessions([t1, t2]);
        expect(result.sessions[0].breakBeforeMs).toBe(0); // first session has no break
        expect(result.sessions[1].breakBeforeMs).toBe(30 * 60 * 1000);
    });

    test('calculates duration_ms correctly', () => {
        const t1 = new Date('2025-06-15T10:00:00Z');
        const t2 = new Date('2025-06-15T10:10:00Z');
        const t3 = new Date('2025-06-15T10:15:00Z');
        const result = deriveVehicleSessions([t1, t2, t3]);
        expect(result.sessions[0].durationMs).toBe(15 * 60 * 1000);
    });

    test('totalWorkMs = sum of all session durations', () => {
        const t1 = new Date('2025-06-15T10:00:00Z');
        const t2 = new Date('2025-06-15T10:10:00Z');
        const t3 = new Date('2025-06-15T11:00:00Z'); // 50 min gap → new session
        const t4 = new Date('2025-06-15T11:05:00Z');
        const result = deriveVehicleSessions([t1, t2, t3, t4]);
        expect(result.totalWorkMs).toBe(10 * 60 * 1000 + 5 * 60 * 1000);
    });

    test('totalBreakMs = sum of all break_before_ms', () => {
        const t1 = new Date('2025-06-15T10:00:00Z');
        const t2 = new Date('2025-06-15T10:10:00Z');
        const t3 = new Date('2025-06-15T11:00:00Z'); // 50 min gap
        const result = deriveVehicleSessions([t1, t2, t3]);
        expect(result.totalBreakMs).toBe(50 * 60 * 1000);
    });

    test('200 timestamps → completes quickly', () => {
        const base = new Date('2025-06-15T06:00:00Z');
        const timestamps = Array.from({ length: 200 }, (_, i) =>
            new Date(base.getTime() + i * 2 * 60 * 1000) // 2 min apart
        );
        const start = performance.now();
        const result = deriveVehicleSessions(timestamps);
        const elapsed = performance.now() - start;

        expect(elapsed).toBeLessThan(50); // should be < 1ms, 50ms is generous
        expect(result.sessions).toHaveLength(1); // all within 20 min gaps
        expect(result.sessions[0].count).toBe(200);
    });

    test('out-of-order timestamps → sorted correctly before splitting', () => {
        const t1 = new Date('2025-06-15T10:00:00Z');
        const t2 = new Date('2025-06-15T10:30:00Z'); // gap > 20 min
        const t3 = new Date('2025-06-15T10:05:00Z');
        const result = deriveVehicleSessions([t2, t1, t3]); // deliberately out of order
        expect(result.sessions).toHaveLength(2);
        expect(result.sessions[0].count).toBe(2); // t1, t3 are 5 min apart
        expect(result.sessions[1].count).toBe(1); // t2
    });

    test('multiple sessions with correct indexes', () => {
        const times = [
            new Date('2025-06-15T08:00:00Z'),
            new Date('2025-06-15T08:05:00Z'),
            new Date('2025-06-15T09:00:00Z'), // gap
            new Date('2025-06-15T09:10:00Z'),
            new Date('2025-06-15T10:00:00Z'), // gap
        ];
        const result = deriveVehicleSessions(times);
        expect(result.sessions).toHaveLength(3);
        expect(result.sessions[0].index).toBe(1);
        expect(result.sessions[1].index).toBe(2);
        expect(result.sessions[2].index).toBe(3);
    });
});

describe('toISTDateString', () => {
    test('UTC 18:30 → IST 00:00 → assigned to next day', () => {
        const date = new Date('2025-06-15T18:30:00Z'); // IST: June 16 00:00
        expect(toISTDateString(date)).toBe('2025-06-16');
    });

    test('UTC 18:29 → IST 23:59 → assigned to current day', () => {
        const date = new Date('2025-06-15T18:29:00Z'); // IST: June 15 23:59
        expect(toISTDateString(date)).toBe('2025-06-15');
    });

    test('UTC noon → IST 17:30 → same day', () => {
        const date = new Date('2025-06-15T12:00:00Z'); // IST: June 15 17:30
        expect(toISTDateString(date)).toBe('2025-06-15');
    });
});

describe('toISTHour', () => {
    test('UTC 06:30 → IST 12:00 → hour=12', () => {
        const date = new Date('2025-06-15T06:30:00Z');
        expect(toISTHour(date)).toBe(12);
    });

    test('UTC 00:00 → IST 05:30 → hour=5', () => {
        const date = new Date('2025-06-15T00:00:00Z');
        expect(toISTHour(date)).toBe(5);
    });

    test('UTC 12:30 → IST 18:00 → hour=18', () => {
        const date = new Date('2025-06-15T12:30:00Z');
        expect(toISTHour(date)).toBe(18);
    });
});
