export default {
  name: 'Five Paths',
  description: 'A switch statement with 5 cases.',
  fnName: 'getRating',
  params: [
    { name: 'score', type: 'number', placeholder: 'e.g. 95, 85, 75, 65, or 40' },
  ],
  source: `
function getRating(score) {
  let rating;
  switch (true) {
    case score >= 90:
      rating = 'A';
      break;
    case score >= 80:
      rating = 'B';
      break;
    case score >= 70:
      rating = 'C';
      break;
    case score >= 60:
      rating = 'D';
      break;
    default:
      rating = 'F';
      break;
  }
  return rating;
}
`,
};
