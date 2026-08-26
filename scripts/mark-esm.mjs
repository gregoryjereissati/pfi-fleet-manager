/**
 * Marca a saída ESM do pacote compartilhado como módulo.
 *
 * O tsc emite arquivos `.js` em `dist/esm`, e o Node — na ausência deste
 * marcador — os interpretaria como CommonJS, já que o `package.json` do
 * pacote não declara `"type": "module"`. O arquivo abaixo delimita o formato
 * apenas dentro dessa pasta.
 */
import { writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const destino = join(raiz, 'packages', 'shared', 'dist', 'esm');

mkdirSync(destino, { recursive: true });
writeFileSync(join(destino, 'package.json'), JSON.stringify({ type: 'module' }, null, 2) + '\n');
