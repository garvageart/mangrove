import adapter from '@mrwaip/adapter-fastify';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://kit.svelte.dev/docs/integrations#preprocessors
	// for more information about preprocessors
	preprocess: vitePreprocess(),

	kit: {
		// adapter-auto only supports some environments, see https://kit.svelte.dev/docs/adapter-auto for a list.
		// If your environment is not supported or you settled on a specific environment, switch out the adapter.
		// See https://kit.svelte.dev/docs/adapters for more information about adapters.
		adapter: adapter({
			out: './build/web/'
		}),
		alias: {
			'left-2-write': 'src/plugins/left-2-write/client/*',
			// "xmlhttprequest-ssl": "node_modules/engine.io-client/lib/xmlhttprequest.js"
		},
		files: {
			routes: 'src/plugins/left-2-write/client/routes',
			lib: 'src/plugins/left-2-write/client/lib',
			assets: 'src/plugins/left-2-write/client/static',
			appTemplate: 'src/plugins/left-2-write/client/app.html',
			errorTemplate: 'src/plugins/left-2-write/client/error.html'
		}
	}
};

export default config;
