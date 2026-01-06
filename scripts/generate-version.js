import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const version = {
  version: new Date().toISOString(),
  timestamp: Date.now(),
  buildDate: new Date().toLocaleString('es-ES', { 
    timeZone: 'America/Bogota',
    dateStyle: 'short',
    timeStyle: 'short'
  })
};

const publicDir = join(__dirname, '..', 'public');
writeFileSync(
  join(publicDir, 'version.json'),
  JSON.stringify(version, null, 2)
);

console.log('✅ Version generada:', version.buildDate);
