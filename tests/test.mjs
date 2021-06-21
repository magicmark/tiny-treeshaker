import assert from 'assert/strict';
import chalk from 'chalk';
import execa from 'execa';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import path from 'path';

const [, , filter] = process.argv;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixtures = await fs.readdir(path.join(__dirname, 'fixtures'));

for await (const fixture of fixtures) {
    if (typeof filter === 'string' && fixture !== filter) {
        continue;
    }

    process.stdout.write(`* Testing ${chalk.bold(fixture)}... `);
    const fixtureDir = path.join(__dirname, 'fixtures', fixture);

    const expected = await fs.readFile(path.join(fixtureDir, 'expected.js'), 'utf-8');
    const { stdout: actual } = await execa('node', [
        'node_modules/.bin/jscodeshift',
        '--transform',
        'src/index.mjs',
        '--dry',
        '--silent',
        '--print',
        path.join(fixtureDir, 'input.js'),
    ]);

    // jscodeshift can output the empty string if no change
    // TODO: always output something?
    if (actual !== '') {
        assert.equal(actual.trim(), expected.trim());
    }
    process.stdout.write(`OK!\n`);
}
