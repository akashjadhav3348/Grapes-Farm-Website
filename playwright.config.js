import { defineConfig } from '@playwright/test';
import { createHash, pbkdf2Sync, randomBytes } from 'node:crypto';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
const salt = randomBytes(16).toString('hex');
export default defineConfig({
  testDir: './tests/browser', workers: 1, timeout: 60000,
  use: { baseURL: 'http://127.0.0.1:5187', browserName: 'chromium', channel: 'msedge' },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 5187 --strictPort',
    url: 'http://127.0.0.1:5187', reuseExistingServer: false,
    env: {
      FAMILY_DATA_FILE: join(tmpdir(), `farm-browser-${randomBytes(8).toString('hex')}.json`),
      ADMIN_EMAIL_HASH: createHash('sha256').update('test@example.com').digest('hex'),
      ADMIN_PASSWORD_SALT: salt,
      ADMIN_PASSWORD_HASH: pbkdf2Sync('Browser-test-only-2026', Buffer.from(salt,'hex'),310000,32,'sha256').toString('hex'),
    },
  },
});
