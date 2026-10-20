import test from 'node:test';
import assert from 'node:assert/strict';
import { findGraphicsContext } from '../src/game/GraphicsSupport.js';

const gl2 = { getParameter() { return 'WebGL 2'; }, isContextLost() { return false; } };
const gl1 = { getParameter() { return 'WebGL 1'; }, getExtension(name) { return name === 'ANGLE_instanced_arrays' ? {} : null; } };

test('prefers WebGL2 when available', () => {
  const calls = [];
  const canvas = { getContext(name) { calls.push(name); return name === 'webgl2' ? gl2 : gl1; } };
  const result = findGraphicsContext(canvas);
  assert.equal(result.type, 'WebGL2');
  assert.equal(result.context, gl2);
  assert.deepEqual(calls, ['webgl2']);
});

test('automatically uses WebGL1 with required instancing support', () => {
  const canvas = { getContext(name) { return name === 'webgl' ? gl1 : null; } };
  const result = findGraphicsContext(canvas);
  assert.equal(result.type, 'WebGL1');
  assert.equal(result.context, gl1);
});

test('recovers from exceptions while querying WebGL2', () => {
  const canvas = { getContext(name) { if (name === 'webgl2') throw new Error('blocked'); return gl1; } };
  assert.equal(findGraphicsContext(canvas).type, 'WebGL1');
});

test('reports WebGL entirely disabled without falsely blaming hardware', () => {
  const canvas = { getContext() { return null; } };
  assert.throws(() => findGraphicsContext(canvas), /não disponibilizou WebGL2 nem WebGL1/);
});

test('identifies missing WebGL1 instancing extension', () => {
  const canvas = { getContext(name) { return name === 'webgl' ? { getExtension() { return null; } } : null; } };
  assert.throws(() => findGraphicsContext(canvas), /renderização instanciada/);
});
