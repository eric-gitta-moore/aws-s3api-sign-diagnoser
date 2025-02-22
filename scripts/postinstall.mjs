import { $ } from 'zx'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import process from 'node:process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log(process.cwd());

// reference: https://github.com/curlconverter/curlconverter?tab=readme-ov-file#usage-as-a-library
$.sync`cp ${path.join(process.cwd(), 'node_modules/web-tree-sitter/tree-sitter.wasm')} public`
$.sync`cp ${path.join(process.cwd(), 'node_modules/curlconverter/dist/tree-sitter-bash.wasm')} public`
