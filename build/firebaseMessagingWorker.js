import { build } from 'esbuild';
import path from 'node:path';
import { resolveFirebaseConfig } from '../src/lib/firebaseConfig.js';

export const firebaseMessagingWorker = (env) => {
  const resolved = resolveFirebaseConfig(env);
  // Emit an inert runtime when config is missing; do not initialize placeholders.
  const config = resolved.missingFields.length ? null : resolved.config;
  const compile = async () => {
    const result = await build({
      entryPoints: [path.resolve('src/lib/firebaseMessagingWorker.js')],
      bundle: true, write: false, format: 'iife', platform: 'browser', target: 'es2020', minify: true,
      define: { __FIREBASE_WEB_CONFIG__: JSON.stringify(config) },
    });
    return result.outputFiles[0].text;
  };
  return {
    name: 'trumarkz-firebase-worker',
    configureServer(server) {
      let runtime;
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.split('?')[0].endsWith('/firebase-messaging-runtime.js')) return next();
        try {
          runtime ||= compile();
          res.setHeader('Content-Type', 'application/javascript');
          res.setHeader('Cache-Control', 'no-cache');
          res.end(await runtime);
        } catch { runtime = null; res.statusCode = 500; res.end('/* Push worker build unavailable. */'); }
      });
    },
    async generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'firebase-messaging-runtime.js', source: await compile() });
    },
  };
};
