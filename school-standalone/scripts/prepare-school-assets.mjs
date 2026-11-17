import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const target = resolve(root, 'public/school');
mkdirSync(target, { recursive: true });

copyFileSync(
  resolve(root, 'node_modules/pdfjs-dist/build/pdf.worker.min.mjs'),
  resolve(target, 'pdf.worker.min.mjs'),
);

// PDF.js renders the original curriculum PDF; base64 avoids browser PDF download add-ons.
const book = readFileSync(resolve(root, 'public/books/grade-4-science.pdf'));
writeFileSync(resolve(target, 'grade-4-science.base64.txt'), book.toString('base64'));
console.log('Prepared the official book and PDF worker for the school app.');
