import test from 'node:test';
import assert from 'node:assert/strict';
import pool from '../../src/config/db.js';
import Content from '../../src/models/Content.js';

test('calculateCourseGrade: null si no hay nada calificado con peso todavía (ni tareas ni cuestionarios)', async (t) => {
  t.mock.method(pool, 'query', async (sql) => {
    if (sql.includes('FROM task_submissions')) return [[]];
    if (sql.includes("type = 'quiz'")) return [[]];
    throw new Error('query no esperada: ' + sql);
  });

  const grade = await Content.calculateCourseGrade(1, 5);
  assert.equal(grade, null);
});

test('calculateCourseGrade: suma score_earned de las tareas calificadas con peso', async (t) => {
  t.mock.method(pool, 'query', async (sql) => {
    if (sql.includes('FROM task_submissions')) return [[{ score_earned: '7.00' }, { score_earned: '3.50' }]];
    if (sql.includes("type = 'quiz'")) return [[]];
    throw new Error('query no esperada: ' + sql);
  });

  const grade = await Content.calculateCourseGrade(1, 5);
  assert.equal(grade, 10.5);
});

test('calculateCourseGrade: un cuestionario con peso y ya respondido aporta (ganados/posibles) x weight_percent', async (t) => {
  t.mock.method(pool, 'query', async (sql) => {
    if (sql.includes('FROM task_submissions')) return [[]];
    if (sql.includes("type = 'quiz'")) return [[{ id: 40, weight_percent: '20.00' }]];
    if (sql.includes('FROM content_answers')) {
      return [[
        { content_id: 40, is_correct: 1, points: 3 },
        { content_id: 40, is_correct: 0, points: 2 },
        { content_id: 40, is_correct: 1, points: 5 }
      ]];
    }
    throw new Error('query no esperada: ' + sql);
  });

  // 8 de 10 puntos posibles -> 80% x 20 = 16
  const grade = await Content.calculateCourseGrade(1, 5);
  assert.equal(grade, 16);
});

test('calculateCourseGrade: un cuestionario con una respuesta corta AÚN sin calificar (is_correct NULL) no cuenta todavía', async (t) => {
  t.mock.method(pool, 'query', async (sql) => {
    if (sql.includes('FROM task_submissions')) return [[]];
    if (sql.includes("type = 'quiz'")) return [[{ id: 40, weight_percent: '20.00' }]];
    if (sql.includes('FROM content_answers')) {
      return [[
        { content_id: 40, is_correct: 1, points: 3 },
        { content_id: 40, is_correct: null, points: 2 }
      ]];
    }
    throw new Error('query no esperada: ' + sql);
  });

  const grade = await Content.calculateCourseGrade(1, 5);
  assert.equal(grade, null, 'ningún otro item calificó, y este cuestionario está incompleto');
});

test('calculateCourseGrade: un cuestionario que el estudiante no respondió (sin filas) no aporta nada', async (t) => {
  t.mock.method(pool, 'query', async (sql) => {
    if (sql.includes('FROM task_submissions')) return [[{ score_earned: 5 }]];
    if (sql.includes("type = 'quiz'")) return [[{ id: 40, weight_percent: '20.00' }]];
    if (sql.includes('FROM content_answers')) return [[]];
    throw new Error('query no esperada: ' + sql);
  });

  const grade = await Content.calculateCourseGrade(1, 5);
  assert.equal(grade, 5, 'solo cuenta la tarea, el cuestionario sin respuestas se ignora');
});

test('calculateCourseGrade: combina tareas y cuestionarios calificados', async (t) => {
  t.mock.method(pool, 'query', async (sql) => {
    if (sql.includes('FROM task_submissions')) return [[{ score_earned: 8 }]];
    if (sql.includes("type = 'quiz'")) return [[{ id: 40, weight_percent: 20 }]];
    if (sql.includes('FROM content_answers')) return [[{ content_id: 40, is_correct: 1, points: 1 }, { content_id: 40, is_correct: 1, points: 1 }]];
    throw new Error('query no esperada: ' + sql);
  });

  // Tarea: 8. Cuestionario: 2/2 = 100% x 20 = 20. Total: 28.
  const grade = await Content.calculateCourseGrade(1, 5);
  assert.equal(grade, 28);
});

test('calculateCourseGrade: con varios cuestionarios, trae TODAS las respuestas en una sola query (no una por cuestionario) y las agrupa por content_id', async (t) => {
  let contentAnswersQueryCount = 0;
  t.mock.method(pool, 'query', async (sql) => {
    if (sql.includes('FROM task_submissions')) return [[]];
    if (sql.includes("type = 'quiz'")) {
      return [[{ id: 40, title: 'Quiz A', weight_percent: 10 }, { id: 41, title: 'Quiz B', weight_percent: 30 }]];
    }
    if (sql.includes('FROM content_answers')) {
      contentAnswersQueryCount++;
      // Respuestas de LOS DOS cuestionarios juntas, distinguidas por content_id.
      return [[
        { content_id: 40, is_correct: 1, points: 1 },
        { content_id: 41, is_correct: 1, points: 1 },
        { content_id: 41, is_correct: 0, points: 1 }
      ]];
    }
    throw new Error('query no esperada: ' + sql);
  });

  const { items } = await Content.getCourseGradeBreakdown(1, 5);

  assert.equal(contentAnswersQueryCount, 1, 'una sola query para content_answers, sin importar cuántos cuestionarios tenga el curso');
  assert.equal(items.length, 2);
  // Quiz A: 1/1 = 100% x 10 = 10. Quiz B: 1/2 = 50% x 30 = 15.
  assert.equal(items.find((i) => i.title === 'Quiz A').earned, 10);
  assert.equal(items.find((i) => i.title === 'Quiz B').earned, 15);
});
