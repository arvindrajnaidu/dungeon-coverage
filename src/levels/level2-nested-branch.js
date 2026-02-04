export default {
  name: 'Nested Depths',
  description: 'Nested branches create deeper dungeons.',
  fnName: 'classify',
  params: [
    { name: 'x', type: 'number', placeholder: 'e.g. 5 or -3' },
    { name: 'y', type: 'number', placeholder: 'e.g. 2 or -1' },
  ],
  source: `
function classify(x, y) {
  let label = 'unknown';
  if (x > 0) {
    if (y > 0) {
      label = 'quadrant-1';
    } else {
      label = 'quadrant-4';
    }
  } else {
    if (y > 0) {
      label = 'quadrant-2';
    } else {
      label = 'quadrant-3';
    }
  }
  return label;
}
`,
};
