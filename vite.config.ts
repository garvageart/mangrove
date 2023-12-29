/// <reference types="vitest" />
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, } from 'vite';


export default defineConfig({
	plugins: [sveltekit()],
	server: {
		port: 5555,
		cors: true
	},
	preview: {
		port: 5555,
		cors: true
	}
});
