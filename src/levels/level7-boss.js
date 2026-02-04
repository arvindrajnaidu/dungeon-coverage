export default {
  name: 'The Boss',
  description: 'Everything combined: branches, loops, try/catch, switch.',
  fnName: 'processOrders',
  params: [
    {
      name: 'orders',
      type: 'array',
      placeholder: '[{type:"buy",amount:100}]',
      presets: [
        { label: 'Buy order', value: '[{type:"buy",amount:100}]' },
        { label: 'Sell order', value: '[{type:"sell",amount:50}]' },
        { label: 'Unknown type', value: '[{type:"transfer",amount:25}]' },
        { label: 'Mixed orders', value: '[{type:"buy",amount:100},{type:"sell",amount:50},{type:"transfer",amount:25}]' },
      ],
    },
    {
      name: 'validator',
      type: 'function',
      placeholder: '(order) => true',
      presets: [
        { label: 'Always valid', value: '(order) => true' },
        { label: 'Always invalid', value: '(order) => false' },
        { label: 'Throws error', value: '(order) => { throw new Error("validation failed") }' },
      ],
    },
  ],
  source: `
function processOrders(orders, validator) {
  const results = [];
  for (let i = 0; i < orders.length; i++) {
    const order = orders[i];
    try {
      const isValid = validator(order);
      if (isValid) {
        switch (order.type) {
          case 'buy':
            results.push({ action: 'buy', amount: order.amount });
            break;
          case 'sell':
            results.push({ action: 'sell', amount: order.amount });
            break;
          default:
            results.push({ action: 'hold', amount: 0 });
            break;
        }
      } else {
        results.push({ action: 'rejected', reason: 'invalid' });
      }
    } catch (e) {
      results.push({ action: 'error', reason: e.message });
    }
  }
  return results;
}
`,
};
