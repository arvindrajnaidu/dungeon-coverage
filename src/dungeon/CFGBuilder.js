// CFGBuilder: AST → Control Flow Graph
// Walk the AST and produce CFG nodes representing blocks, branches, loops, try/catch, switch

const NODE_TYPES = {
  BLOCK: 'block',
  BRANCH: 'branch',
  SWITCH: 'switch',
  LOOP: 'loop',
  TRY: 'try',
  RETURN: 'return',
  ROOT: 'root',
};

function buildCFG(ast) {
  const traverse = window.Babel.packages.traverse?.default || window.Babel.traverse;
  if (!traverse) {
    console.warn('Babel traverse not available, using simple parser');
    return buildCFGFromBody(ast);
  }

  const rootNode = { type: NODE_TYPES.ROOT, children: [], statements: [], loc: null };

  // Find the function body
  let fnBody = null;
  try {
    traverse(ast, {
      FunctionDeclaration(path) {
        if (!fnBody) fnBody = path.node.body;
      },
      ArrowFunctionExpression(path) {
        if (!fnBody) fnBody = path.node.body;
      },
      FunctionExpression(path) {
        if (!fnBody) fnBody = path.node.body;
      },
    });
  } catch (e) {
    // fallback
  }

  if (!fnBody) {
    // Try to process top-level statements
    const body = ast.program?.body || ast.body || [];
    return buildCFGFromStatements(body, rootNode);
  }

  const bodyStatements = fnBody.body || (fnBody.type === 'BlockStatement' ? fnBody.body : [fnBody]);
  return buildCFGFromStatements(bodyStatements, rootNode);
}

function buildCFGFromBody(ast) {
  const rootNode = { type: NODE_TYPES.ROOT, children: [], statements: [], loc: null };
  const body = ast.program?.body || ast.body || [];

  // Find a function and get its body
  for (const node of body) {
    if (node.type === 'FunctionDeclaration' && node.body) {
      return buildCFGFromStatements(node.body.body, rootNode);
    }
    if (node.type === 'VariableDeclaration') {
      for (const decl of node.declarations) {
        const init = decl.init;
        if (init && (init.type === 'ArrowFunctionExpression' || init.type === 'FunctionExpression')) {
          const body = init.body.type === 'BlockStatement' ? init.body.body : [init.body];
          return buildCFGFromStatements(body, rootNode);
        }
      }
    }
    if (node.type === 'ExportDefaultDeclaration' || node.type === 'ExportNamedDeclaration') {
      const decl = node.declaration;
      if (decl?.type === 'FunctionDeclaration' && decl.body) {
        return buildCFGFromStatements(decl.body.body, rootNode);
      }
      if (decl?.type === 'VariableDeclaration') {
        for (const d of decl.declarations) {
          const init = d.init;
          if (init && (init.type === 'ArrowFunctionExpression' || init.type === 'FunctionExpression')) {
            const body = init.body.type === 'BlockStatement' ? init.body.body : [init.body];
            return buildCFGFromStatements(body, rootNode);
          }
        }
      }
    }
  }

  return buildCFGFromStatements(body, rootNode);
}

function buildCFGFromStatements(statements, parent) {
  let currentBlock = { type: NODE_TYPES.BLOCK, statements: [], children: [], loc: null };

  for (const stmt of statements) {
    switch (stmt.type) {
      case 'IfStatement':
        // Flush current block
        if (currentBlock.statements.length > 0) {
          parent.children.push(currentBlock);
        }

        const branchNode = {
          type: NODE_TYPES.BRANCH,
          condition: stmt.test,
          loc: stmt.loc,
          consequent: { type: NODE_TYPES.ROOT, children: [], statements: [], loc: stmt.consequent?.loc },
          alternate: { type: NODE_TYPES.ROOT, children: [], statements: [], loc: stmt.alternate?.loc },
          children: [],
          statements: [],
        };

        // Process consequent
        const consBody = stmt.consequent?.type === 'BlockStatement'
          ? stmt.consequent.body
          : stmt.consequent ? [stmt.consequent] : [];
        buildCFGFromStatements(consBody, branchNode.consequent);

        // Process alternate
        if (stmt.alternate) {
          const altBody = stmt.alternate.type === 'BlockStatement'
            ? stmt.alternate.body
            : [stmt.alternate];
          buildCFGFromStatements(altBody, branchNode.alternate);
        }

        parent.children.push(branchNode);
        currentBlock = { type: NODE_TYPES.BLOCK, statements: [], children: [], loc: null };
        break;

      case 'SwitchStatement':
        if (currentBlock.statements.length > 0) {
          parent.children.push(currentBlock);
        }

        const switchNode = {
          type: NODE_TYPES.SWITCH,
          discriminant: stmt.discriminant,
          loc: stmt.loc,
          cases: stmt.cases.map(c => ({
            test: c.test,
            body: { type: NODE_TYPES.ROOT, children: [], statements: [], loc: c.loc },
            loc: c.loc,
          })),
          children: [],
          statements: [],
        };

        for (let i = 0; i < stmt.cases.length; i++) {
          const caseStmts = stmt.cases[i].consequent || [];
          buildCFGFromStatements(caseStmts, switchNode.cases[i].body);
        }

        parent.children.push(switchNode);
        currentBlock = { type: NODE_TYPES.BLOCK, statements: [], children: [], loc: null };
        break;

      case 'ForStatement':
      case 'ForInStatement':
      case 'ForOfStatement':
      case 'WhileStatement':
      case 'DoWhileStatement':
        if (currentBlock.statements.length > 0) {
          parent.children.push(currentBlock);
        }

        const loopNode = {
          type: NODE_TYPES.LOOP,
          condition: stmt.test || stmt.right || null,
          loc: stmt.loc,
          body: { type: NODE_TYPES.ROOT, children: [], statements: [], loc: null },
          children: [],
          statements: [],
        };

        const loopBody = stmt.body?.type === 'BlockStatement'
          ? stmt.body.body
          : stmt.body ? [stmt.body] : [];
        buildCFGFromStatements(loopBody, loopNode.body);

        parent.children.push(loopNode);
        currentBlock = { type: NODE_TYPES.BLOCK, statements: [], children: [], loc: null };
        break;

      case 'TryStatement':
        if (currentBlock.statements.length > 0) {
          parent.children.push(currentBlock);
        }

        const tryNode = {
          type: NODE_TYPES.TRY,
          loc: stmt.loc,
          tryBody: { type: NODE_TYPES.ROOT, children: [], statements: [], loc: stmt.block?.loc },
          catchBody: { type: NODE_TYPES.ROOT, children: [], statements: [], loc: stmt.handler?.loc },
          finallyBody: stmt.finalizer
            ? { type: NODE_TYPES.ROOT, children: [], statements: [], loc: stmt.finalizer?.loc }
            : null,
          children: [],
          statements: [],
        };

        if (stmt.block) {
          buildCFGFromStatements(stmt.block.body, tryNode.tryBody);
        }
        if (stmt.handler && stmt.handler.body) {
          buildCFGFromStatements(stmt.handler.body.body, tryNode.catchBody);
        }
        if (stmt.finalizer) {
          buildCFGFromStatements(stmt.finalizer.body, tryNode.finallyBody);
        }

        parent.children.push(tryNode);
        currentBlock = { type: NODE_TYPES.BLOCK, statements: [], children: [], loc: null };
        break;

      case 'ReturnStatement':
        // Flush current block before the return (don't include return in it)
        if (currentBlock.statements.length > 0) {
          parent.children.push(currentBlock);
        }
        // Return is a terminal — create a return node with its own gem
        parent.children.push({ type: NODE_TYPES.RETURN, loc: stmt.loc, children: [], statements: [stmt] });
        currentBlock = { type: NODE_TYPES.BLOCK, statements: [], children: [], loc: null };
        break;

      default:
        if (!currentBlock.loc && stmt.loc) {
          currentBlock.loc = stmt.loc;
        }
        currentBlock.statements.push(stmt);
        break;
    }
  }

  if (currentBlock.statements.length > 0) {
    parent.children.push(currentBlock);
  }

  return parent;
}

export { buildCFG, NODE_TYPES };
