import fs from 'node:fs';
import path from 'node:path';
import { POPULATED_DATA } from '../constants.tsx';

const outputPath = path.resolve(process.cwd(), 'demo-data.json');

fs.writeFileSync(outputPath, JSON.stringify(POPULATED_DATA, null, 2), 'utf-8');
console.log(`✅ Demo data skrevet til ${outputPath}`);



