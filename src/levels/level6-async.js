export default {
  name: 'Async Caverns',
  description: 'Using stubs to test async functions.',
  fnName: 'getUser',
  params: [
    {
      name: 'fetchUser',
      type: 'function',
      placeholder: '() => ({ name: "Alice" })',
      presets: [
        { label: 'Returns user', value: '() => ({ name: "Alice" })' },
        { label: 'Returns null', value: '() => null' },
      ],
    },
  ],
  source: `
async function getUser(fetchUser) {
  const user = await fetchUser(true);
  if (user) {
    return "Hello, " + user.name;
  }
  return "No user found";
}
`,
};
