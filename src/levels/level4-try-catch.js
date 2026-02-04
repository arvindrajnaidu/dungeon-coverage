export default {
  name: 'Danger Zone',
  description: 'Try/catch creates a side passage for errors.',
  fnName: 'safeDivide',
  params: [
    { name: 'a', type: 'number', placeholder: 'e.g. 10' },
    { name: 'b', type: 'number', placeholder: 'e.g. 2 or 0' },
  ],
  source: `
function safeDivide(a, b) {
  let result;
  try {
    if (b === 0) {
      throw new Error('Division by zero');
    }
    result = a / b;
    result = Math.round(result);
  } catch (e) {
    result = -1;
  }
  return result;
}
`,
};
