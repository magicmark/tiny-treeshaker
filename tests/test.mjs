import assert from 'assert/strict';
import chalk from 'chalk';
import execa from 'execa';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import path from 'path';

const [, , filter] = process.argv;

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function doTest(name, inputFile, expected) {
    process.stdout.write(`* Testing ${chalk.bold(name)}... `);
    const { stdout: actual } = await execa('node', [
        'node_modules/.bin/jscodeshift',
        '--transform',
        'src/index.mjs',
        '--dry',
        '--silent',
        '--print',
        inputFile,
    ]);

    // jscodeshift can output the empty string if no change
    // TODO: always output something?
    if (actual !== '') {
        assert.equal(actual.trim(), expected.trim());
    }

    process.stdout.write(`OK!\n`);
}

async function main() {
    const fixtures = await fs.readdir(path.join(__dirname, 'fixtures'));

    for await (const fixture of fixtures) {
        if (typeof filter === 'string' && fixture !== filter) {
            continue;
        }
        const fixtureDir = path.join(__dirname, 'fixtures', fixture);
        const expected = await fs.readFile(path.join(fixtureDir, 'expected.js'), 'utf-8');
        await doTest(fixture, path.join(fixtureDir, 'input.js'), expected);
    }

    const smoketests = await fs.readdir(path.join(__dirname, 'smoketests'));

    for await (const smoketest of smoketests) {
        const testName = smoketest.replace(/\.js$/, '');
        if (typeof filter === 'string' && testName !== filter) {
            continue;
        }

        const testFile = path.join(__dirname, 'smoketests', smoketest);
        const expected = await fs.readFile(testFile, 'utf-8');
        await doTest(testName, testFile, expected);
    }
}

main();
