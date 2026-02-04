export default {
  name: 'The Fork',
  description: 'A simple if/else branch. Choose wisely!',
  fnName: 'checkValue',
  params: [
    { name: 'x', type: 'number', placeholder: 'e.g. 15 or 5' },
  ],
  source: `
function checkValue(x) {
  const result = [];
  result.push('start');
  if (x > 10) {
    result.push('big');
    result.push('very big');
  } else {
    result.push('small');
  }
  result.push('end');
  return result;
}
`,
};
