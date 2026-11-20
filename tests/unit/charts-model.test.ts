import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import {
  ChartFileError,
  EXAMPLE_HEART,
  MAX_SIZE,
  chartCode,
  chartFromProject,
  fileBaseName,
  inkOn,
  projectFileText,
  readChartCode,
  readProjectFile,
  type ChartContent,
} from '../../src/charts/model';

const fixture = (name: string) => readFileSync(new URL(`../fixtures/tracker/${name}`, import.meta.url), 'utf8');

describe('opening project files from the Tapestry Chart Tracker', () => {
  test('a tapestry project opens with everything it had', () => {
    const c = readProjectFile(fixture('heart-project.json'));
    expect(c).toMatchObject({ name: 'Heart for Mum', w: 15, h: 13, tech: 'tapestry', cur: 5, done: [1, 2, 3, 4] });
    expect(c.pal.map((p) => p.name)).toEqual(['Cream', 'Burgundy', 'Mustard']);
    expect(c.cells[4]).toBe('011112111211110');
  });

  test('a reversible mosaic project keeps its mosaic settings', () => {
    const c = readProjectFile(fixture('mosaic-project.json'));
    expect(c).toMatchObject({ tech: 'mosaic', rev: true, mfirst: 1, w: 9, h: 7 });
  });

  test('a project saved before mosaic existed opens as tapestry, tidied up', () => {
    const c = readProjectFile(fixture('before-mosaic-project.json'), 'Little ring.json');
    expect(c).toMatchObject({ name: 'Little ring', tech: 'tapestry', rev: false, mfirst: 0 });
    expect(c.cur).toBe(3); // was 9, the chart has 3 rows
    expect(c.done).toEqual([1, 2]); // duplicates and rows beyond the chart dropped
    expect(c.pal[1]!.hex).toBe('#888888'); // an unreadable shade becomes grey
  });

  test('the very first tracker versions saved the palette as a preset name', () => {
    const c = chartFromProject({ cells: ['01', '10'], pal: 'y-green' });
    expect(c.pal).toEqual([
      { name: 'Cream', hex: '#f3ead8' },
      { name: 'Dark', hex: '#2f4a3a' },
    ]);
  });

  test.each([
    ['text that is not JSON', 'hello', "isn't a chart project file"],
    ['a backup file', '{"app":"crochet-studio","format":1,"stores":{}}', "isn't a chart project file"],
    ['a project with no squares', '{"app":"tapestry-chart-tracker","project":{"cells":[],"pal":[{},{}]}}', 'no chart squares'],
    [
      'rows of different lengths',
      '{"app":"tapestry-chart-tracker","project":{"cells":["01","1"],"pal":[{},{}]}}',
      'not all the same length',
    ],
    [
      'a square in a missing color',
      '{"app":"tapestry-chart-tracker","project":{"cells":["01","12"],"pal":[{},{}]}}',
      'missing from its palette',
    ],
    ['one color', '{"app":"tapestry-chart-tracker","project":{"cells":["00"],"pal":[{}]}}', 'between 2 and 8 colors'],
  ])('refuses %s with a clear message', (_label, text, message) => {
    expect(() => readProjectFile(text)).toThrow(ChartFileError);
    expect(() => readProjectFile(text)).toThrow(message);
  });

  test(`refuses charts larger than ${MAX_SIZE} squares`, () => {
    const cells = Array.from({ length: MAX_SIZE + 1 }, () => '01');
    expect(() => chartFromProject({ cells, pal: [{}, {}] })).toThrow('larger than');
  });
});

describe('saving project files', () => {
  test('uses the tracker format, so the file opens in both apps', () => {
    const text = projectFileText(EXAMPLE_HEART, 1234);
    const data = JSON.parse(text);
    expect(data).toMatchObject({ app: 'tapestry-chart-tracker', version: 2 });
    expect(Object.keys(data.project).sort()).toEqual(
      ['active', 'cells', 'cur', 'done', 'example', 'h', 'mfirst', 'name', 'pal', 'rev', 'tech', 'updated', 'w'].sort(),
    );
    expect(data.project.updated).toBe(1234);
  });

  test('a saved file opens again exactly the same', () => {
    const mosaic = readProjectFile(fixture('mosaic-project.json'));
    for (const c of [EXAMPLE_HEART, mosaic]) expect(readProjectFile(projectFileText(c))).toEqual(c);
  });

  test('file names leave out characters that file systems refuse', () => {
    expect(fileBaseName('Heart: for "Mum"?')).toBe('Heart for Mum');
    expect(fileBaseName('  ')).toBe('chart');
  });
});

describe('chart codes', () => {
  const tricky: ChartContent = {
    ...EXAMPLE_HEART,
    pal: [
      { name: 'Cream, soft | wool', hex: '#f3ead8' },
      { name: 'Röd 100%', hex: '#8c1d3c' },
    ],
  };

  test('a code reads back as the same chart', () => {
    const c = readChartCode(chartCode(tricky));
    expect(c.cells).toEqual(tricky.cells);
    expect(c.pal).toEqual(tricky.pal);
    expect(c.name).toBe('Pasted chart');
  });

  test('the code looks like the tracker\'s', () => {
    expect(chartCode(EXAMPLE_HEART).startsWith('v2|15|13|f3ead8,8c1d3c|Cream,Burgundy|000000000000000/')).toBe(true);
  });

  test('reads the very old two-color code', () => {
    const c = readChartCode('3x2:010/101');
    expect(c).toMatchObject({ w: 3, h: 2, cells: ['010', '101'] });
    expect(c.pal).toHaveLength(2);
  });

  test('reads a pasted project file, or just its project', () => {
    expect(readChartCode(fixture('heart-project.json')).name).toBe('Heart for Mum');
    const project = JSON.parse(fixture('heart-project.json')).project;
    expect(readChartCode(JSON.stringify(project)).w).toBe(15);
  });

  test.each([
    ['nonsense', 'hello', "doesn't look right"],
    ['a cut-off code', 'v2|3|2|f3ead8,8c1d3c|A,B|010', 'incomplete'],
    ['a cut-off project file', '{"app":"tapestry-chart-tracker","project":{"cells":', 'part of it is missing'],
    ['a bad color', 'v2|2|1|zzzzzz,8c1d3c|A,B|01', "doesn't look right"],
  ])('explains %s', (_label, code, message) => {
    expect(() => readChartCode(code)).toThrow(message);
  });
});

test('text on a color is dark on light colors and white on dark ones', () => {
  expect(inkOn('#f3ead8')).toBe('#2a2228');
  expect(inkOn('#2b2d3d')).toBe('#ffffff');
});
