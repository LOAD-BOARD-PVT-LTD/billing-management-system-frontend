import { fileURLToPath } from 'node:url';
import path from 'node:path';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..').replace(/\\/g, '/');
process.env.JITI_ALIAS = JSON.stringify({ '@': rootDir });
process.env.JITI_JSX = 'true';
