import { copyFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const projectRoot = resolve(import.meta.dirname, '..');
const source = resolve(projectRoot, 'node_modules/pdfjs-dist/build/pdf.worker.min.mjs');
const targetDir = resolve(projectRoot, 'public/school');

mkdirSync(targetDir, { recursive: true });
copyFileSync(source, resolve(targetDir, 'pdf.worker.min.mjs'));
console.log('School PDF worker is ready.');
