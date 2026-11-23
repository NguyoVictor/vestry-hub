import { describe, expect, it, vi } from 'vitest';

vi.mock('@/integrations/supabase/client', () => ({ supabase: { rpc: vi.fn() } }));
import { blankQuestion, normalizePin, normalizeQuestion, quizProblem } from '@/lib/liveQuiz';

const good = () => ({ ...blankQuestion(), text: 'Who built the ark?', options: ['Noah', 'Moses', '', ''], correct_index: 0 });

describe('live quiz authoring rules (mirror of private.quiz_questions_valid)', () => {
  it('accepts a valid quiz and drops empty answers', () => {
    expect(quizProblem('Sunday quiz', [good()])).toBeNull();
    expect(normalizeQuestion(good()).options).toEqual(['Noah', 'Moses']);
  });

  it('keeps the correct answer when blank options before it are removed', () => {
    const q = { ...good(), options: ['', 'Noah', '', 'Moses'], correct_index: 3 };
    const n = normalizeQuestion(q);
    expect(n.options).toEqual(['Noah', 'Moses']);
    expect(n.correct_index).toBe(1);
  });

  it('rejects the cases the database rejects', () => {
    expect(quizProblem('', [good()])).toMatch(/title/);
    expect(quizProblem('t', [])).toMatch(/at least one/);
    expect(quizProblem('t', [{ ...good(), text: ' ' }])).toMatch(/enter the question/);
    expect(quizProblem('t', [{ ...good(), options: ['Noah', '', '', ''] }])).toMatch(/at least 2/);
    expect(quizProblem('t', [{ ...good(), correct_index: 2 }])).toMatch(/correct/);
    expect(quizProblem('t', [{ ...good(), time_limit: 3 }])).toMatch(/time limit/);
    expect(quizProblem('t', [{ ...good(), points: 5000 }])).toMatch(/points/);
    expect(quizProblem('t', Array.from({ length: 51 }, good))).toMatch(/at most 50/);
  });

  it('normalizes typed PINs', () => {
    expect(normalizePin(' ab-c d3 2x9')).toBe('ABCD32');
  });
});
