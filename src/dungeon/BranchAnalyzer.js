// BranchAnalyzer: extract branch conditions → generate stub options
// For each branch condition in the AST, generate user-facing choices

export function analyzeBranch(conditionNode, branchInfo = {}) {
  if (!conditionNode) {
    return {
      condition: 'unknown condition',
      options: [
        { label: 'True path', stubs: {}, choiceValue: true },
        { label: 'False path', stubs: {}, choiceValue: false },
      ],
    };
  }

  // Handle try/catch specially
  if (branchInfo.isTryCatch) {
    return {
      condition: 'try { ... } catch { ... }',
      options: [
        { label: 'Execute normally (try path)', stubs: { __throwError: false }, choiceValue: true },
        { label: 'Throw an error (catch path)', stubs: { __throwError: true }, choiceValue: false },
      ],
    };
  }

  // Handle switch
  if (branchInfo.isSwitch) {
    return analyzeSwitch(conditionNode, branchInfo);
  }

  const condStr = conditionToString(conditionNode);

  // Binary expression: x > N, x === 'foo', x == null, etc.
  if (conditionNode.type === 'BinaryExpression') {
    return analyzeBinaryCondition(conditionNode, condStr);
  }

  // Logical expression: x && y, x || y
  if (conditionNode.type === 'LogicalExpression') {
    return {
      condition: condStr,
      options: [
        { label: `${condStr} → true`, stubs: { __condResult: true }, choiceValue: true },
        { label: `${condStr} → false`, stubs: { __condResult: false }, choiceValue: false },
      ],
    };
  }

  // Unary: !x
  if (conditionNode.type === 'UnaryExpression' && conditionNode.operator === '!') {
    const innerName = getIdentifierName(conditionNode.argument);
    if (innerName) {
      return {
        condition: condStr,
        options: [
          { label: `${innerName} = falsy (! → true)`, stubs: { [innerName]: null }, choiceValue: true },
          { label: `${innerName} = truthy (! → false)`, stubs: { [innerName]: 42 }, choiceValue: false },
        ],
      };
    }
  }

  // Call expression: someFunc()
  if (conditionNode.type === 'CallExpression') {
    const fnName = getIdentifierName(conditionNode.callee);
    if (fnName) {
      return {
        condition: `${fnName}(...)`,
        options: [
          { label: `${fnName} returns truthy`, stubs: { [fnName]: () => true }, choiceValue: true },
          { label: `${fnName} returns falsy`, stubs: { [fnName]: () => false }, choiceValue: false },
        ],
      };
    }
  }

  // Identifier: just x
  if (conditionNode.type === 'Identifier') {
    return {
      condition: conditionNode.name,
      options: [
        { label: `${conditionNode.name} = truthy`, stubs: { [conditionNode.name]: true }, choiceValue: true },
        { label: `${conditionNode.name} = falsy`, stubs: { [conditionNode.name]: false }, choiceValue: false },
      ],
    };
  }

  // Member expression: x.y
  if (conditionNode.type === 'MemberExpression') {
    const name = conditionToString(conditionNode);
    return {
      condition: name,
      options: [
        { label: `${name} → truthy`, stubs: {}, choiceValue: true },
        { label: `${name} → falsy`, stubs: {}, choiceValue: false },
      ],
    };
  }

  // Fallback
  return {
    condition: condStr,
    options: [
      { label: 'Take TRUE path', stubs: {}, choiceValue: true },
      { label: 'Take FALSE path', stubs: {}, choiceValue: false },
    ],
  };
}

function analyzeBinaryCondition(node, condStr) {
  const left = getIdentifierName(node.left);
  const right = node.right;
  const op = node.operator;

  if (left && right) {
    switch (op) {
      case '>':
      case '>=': {
        const val = getLiteralValue(right);
        if (val !== null) {
          return {
            condition: condStr,
            options: [
              { label: `${left} = ${val + 5} (true)`, stubs: { [left]: val + 5 }, choiceValue: true },
              { label: `${left} = ${val - 5} (false)`, stubs: { [left]: val - 5 }, choiceValue: false },
            ],
          };
        }
        break;
      }
      case '<':
      case '<=': {
        const val = getLiteralValue(right);
        if (val !== null) {
          return {
            condition: condStr,
            options: [
              { label: `${left} = ${val - 5} (true)`, stubs: { [left]: val - 5 }, choiceValue: true },
              { label: `${left} = ${val + 5} (false)`, stubs: { [left]: val + 5 }, choiceValue: false },
            ],
          };
        }
        break;
      }
      case '===':
      case '==': {
        const val = getLiteralValue(right);
        if (val === null || val === undefined) {
          return {
            condition: condStr,
            options: [
              { label: `${left} = null (true)`, stubs: { [left]: null }, choiceValue: true },
              { label: `${left} = 42 (false)`, stubs: { [left]: 42 }, choiceValue: false },
            ],
          };
        }
        if (typeof val === 'string') {
          return {
            condition: condStr,
            options: [
              { label: `${left} = "${val}" (true)`, stubs: { [left]: val }, choiceValue: true },
              { label: `${left} = "other" (false)`, stubs: { [left]: '__other__' }, choiceValue: false },
            ],
          };
        }
        return {
          condition: condStr,
          options: [
            { label: `${left} = ${val} (true)`, stubs: { [left]: val }, choiceValue: true },
            { label: `${left} = ${val + 1} (false)`, stubs: { [left]: typeof val === 'number' ? val + 1 : '__other__' }, choiceValue: false },
          ],
        };
      }
      case '!==':
      case '!=': {
        const val = getLiteralValue(right);
        return {
          condition: condStr,
          options: [
            { label: `${left} ≠ ${JSON.stringify(val)} (true)`, stubs: { [left]: typeof val === 'number' ? val + 1 : '__other__' }, choiceValue: true },
            { label: `${left} = ${JSON.stringify(val)} (false)`, stubs: { [left]: val }, choiceValue: false },
          ],
        };
      }
    }
  }

  return {
    condition: condStr,
    options: [
      { label: `${condStr} → true`, stubs: {}, choiceValue: true },
      { label: `${condStr} → false`, stubs: {}, choiceValue: false },
    ],
  };
}

function analyzeSwitch(discriminantNode, branchInfo) {
  const name = conditionToString(discriminantNode);
  const options = [];

  if (branchInfo.cases) {
    for (const c of branchInfo.cases) {
      if (c.test) {
        const val = getLiteralValue(c.test);
        const label = val !== null ? `${name} = ${JSON.stringify(val)}` : `case ${conditionToString(c.test)}`;
        options.push({ label, stubs: { [getIdentifierName(discriminantNode) || '__switch']: val }, choiceValue: val });
      } else {
        options.push({ label: 'default', stubs: { [getIdentifierName(discriminantNode) || '__switch']: '__default__' }, choiceValue: '__default__' });
      }
    }
  }

  if (options.length === 0) {
    options.push(
      { label: 'Case A', stubs: {}, choiceValue: 'a' },
      { label: 'Case B', stubs: {}, choiceValue: 'b' },
    );
  }

  return { condition: `switch (${name})`, options };
}

function conditionToString(node) {
  if (!node) return '?';
  switch (node.type) {
    case 'BinaryExpression':
    case 'LogicalExpression':
      return `${conditionToString(node.left)} ${node.operator} ${conditionToString(node.right)}`;
    case 'UnaryExpression':
      return `${node.operator}${conditionToString(node.argument)}`;
    case 'Identifier':
      return node.name;
    case 'NumericLiteral':
    case 'NumberLiteral':
      return String(node.value);
    case 'StringLiteral':
      return `"${node.value}"`;
    case 'NullLiteral':
      return 'null';
    case 'BooleanLiteral':
      return String(node.value);
    case 'MemberExpression':
      return `${conditionToString(node.object)}.${node.property?.name || conditionToString(node.property)}`;
    case 'CallExpression':
      return `${conditionToString(node.callee)}(...)`;
    case 'AwaitExpression':
      return `await ${conditionToString(node.argument)}`;
    case 'TemplateLiteral':
      return '`...`';
    default:
      return node.type;
  }
}

function getIdentifierName(node) {
  if (!node) return null;
  if (node.type === 'Identifier') return node.name;
  if (node.type === 'MemberExpression') {
    return conditionToString(node);
  }
  return null;
}

function getLiteralValue(node) {
  if (!node) return null;
  switch (node.type) {
    case 'NumericLiteral':
    case 'NumberLiteral':
      return node.value;
    case 'StringLiteral':
      return node.value;
    case 'BooleanLiteral':
      return node.value;
    case 'NullLiteral':
      return null;
    default:
      return null;
  }
}

export { conditionToString, getIdentifierName, getLiteralValue };
