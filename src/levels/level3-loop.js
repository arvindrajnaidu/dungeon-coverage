export default {
  name: 'The Loop',
  description: 'Loops create corridors that circle back.',
  fnName: 'sumArray',
  params: [
    { name: 'arr', type: 'array', placeholder: 'e.g. [1, 200, 3]' },
  ],
  source: `
function sumArray(arr) {
  let total = 0;
  for (let i = 0; i < arr.length; i++) {
    total += arr[i];
    if (arr[i] > 100) {
      total = total * 2;
    }
  }
  return total;
}
`,
};
