import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const projectRoot = resolve(import.meta.dirname, '..');
const source = resolve(projectRoot, 'node_modules/pdfjs-dist/build/pdf.worker.min.mjs');
const targetDir = resolve(projectRoot, 'public/school');
const bookSource = resolve(projectRoot, 'public/books/grade-4-science.pdf');

mkdirSync(targetDir, { recursive: true });
copyFileSync(source, resolve(targetDir, 'pdf.worker.min.mjs'));
// Serve the original PDF bytes as base64 text. Download-manager extensions can
// intercept application/pdf requests, even when PDF.js requests them inline.
// The text asset bypasses that interception; PDF.js still renders the exact
// original PDF after decoding it in the browser.
writeFileSync(resolve(targetDir, 'grade-4-science.base64.txt'), readFileSync(bookSource).toString('base64'));
console.log('School PDF worker and embedded book asset are ready.');
