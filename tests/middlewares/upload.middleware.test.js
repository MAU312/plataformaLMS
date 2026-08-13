import test from 'node:test';
import assert from 'node:assert/strict';
import { MAX_VIDEO_SIZE_BYTES } from '../../src/middlewares/upload.middleware.js';

test('MAX_VIDEO_SIZE_BYTES: el límite de subida de video es 2GB', () => {
  assert.equal(MAX_VIDEO_SIZE_BYTES, 2 * 1024 * 1024 * 1024);
});
