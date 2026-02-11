export default {
  name: 'Async Caverns',
  description: 'Async/await with branching outcomes.',
  fnName: 'fetchData',
  params: [
    {
      name: 'apiCall',
      type: 'function',
      placeholder: '() => ({ ok: true, data: [{name:"a"}] })',
      presets: [
        { label: 'Success (with data)', value: '() => ({ ok: true, data: [{name:"Alice"}, {name:"Bob"}] })' },
        { label: 'Success (empty)', value: '() => ({ ok: true, data: [] })' },
        { label: 'Error response', value: '() => ({ ok: false, status: 404 })' },
      ],
    },
  ],
  source: `
async function fetchData(apiCall) {
  let data = null;
  const response = await apiCall();
  console.log('response', response);
  if (response.ok) {
    console.log('response.data', response.data);
    data = response.data;
    if (data.length > 0) {
      console.log('data.map(item => item.name)', data.map(item => item.name));
      data = data.map(item => item.name);
    } else {
      console.log('data is empty');
      data = ['empty'];
    }
  } else {
    console.log('response is not ok');
    data = ['error: ' + response.status];
  }
  return data;
}
`,
};
