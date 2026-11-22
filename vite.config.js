import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

function localAdminApi() {
  return {
    name: 'aishwary-local-admin-api',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        if (!request.url?.startsWith('/api/admin/')) return next();
        try {
          const origin = `http://${request.headers.host}`;
          process.env.ADMIN_ORIGIN = origin;
          process.env.ADMIN_SESSION_SECRET ||= 'local-development-session-secret-change-on-netlify';
          const headers = new Headers();
          for (const [name, value] of Object.entries(request.headers)) {
            if (Array.isArray(value)) value.forEach((entry) => headers.append(name, entry));
            else if (value != null) headers.set(name, value);
          }
          const chunks = [];
          for await (const chunk of request) chunks.push(chunk);
          const body = chunks.length ? Buffer.concat(chunks) : undefined;
          const { default: adminHandler } = await import('./netlify/functions/admin.mjs');
          const result = await adminHandler(new Request(`${origin}${request.url}`, {
            method: request.method,
            headers,
            body: ['GET', 'HEAD'].includes(request.method) ? undefined : body,
          }));
          response.statusCode = result.status;
          result.headers.forEach((value, name) => {
            if (name !== 'set-cookie') response.setHeader(name, value);
          });
          const setCookies = result.headers.getSetCookie?.() ?? [];
          if (setCookies.length) response.setHeader('set-cookie', setCookies);
          response.end(Buffer.from(await result.arrayBuffer()));
        } catch (error) {
          server.config.logger.error(error.stack || error.message);
          response.statusCode = 500;
          response.end(JSON.stringify({ error: 'local_api_failed' }));
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), localAdminApi()],
});
