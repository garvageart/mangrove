import fs from 'fs';
import esbuild from 'esbuild';
import dayjs from 'dayjs';
import mkdirp from 'mkdirp';

const buildResult = await esbuild.build({
    entryPoints: ['src/main.ts'],
    bundle: true,
    minify: false,
    minifySyntax: true,
    platform: 'node',
    target: 'node20',
    format: 'esm',
    outdir: 'build',
    packages: 'external',
    metafile: true,
});

console.log(`Build is complete:`, buildResult);
console.log(await esbuild.analyzeMetafile(buildResult.metafile, {
    verbose: true,
    color: true
}));

await mkdirp('metadata');

fs.writeFileSync(`metadata/Mangrove-BuildMetadata-${dayjs().format('DD_MM_YY_HHmmss')}.json`, JSON.stringify(buildResult.metafile));