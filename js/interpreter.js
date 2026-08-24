const Interpreter = (() => {

  function execute(source) {
    const steps = [];
    const output = [];
    const callStack = [{ name: 'global', line: 1, args: [] }];
    let error = null;
    const codeLines = source.split('\n');
    let stepCounter = 0;

    class Environment {
      constructor(parent = null) {
        this.bindings = {};
        this.parent = parent;
      }

      get(name) {
        if (name in this.bindings) {
          return this.bindings[name];
        }
        if (this.parent) {
          return this.parent.get(name);
        }
        if (name === 'undefined') return undefined;
        if (name === 'NaN') return NaN;
        if (name === 'Infinity') return Infinity;
        if (name === 'Math') return Math;
        if (name === 'JSON') return JSON;
        if (name === 'console') return { log: () => {}, error: () => {}, warn: () => {} };
        if (name === 'Array') return Array;
        if (name === 'Object') return Object;
        if (name === 'String') return String;
        if (name === 'Number') return Number;
        if (name === 'Boolean') return Boolean;
        if (name === 'parseInt') return parseInt;
        if (name === 'parseFloat') return parseFloat;
        if (name === 'isNaN') return isNaN;
        if (name === 'isFinite') return isFinite;
        throw new Error(`ReferenceError: ${name} is not defined`);
      }

      has(name) {
        if (name in this.bindings) return true;
        if (this.parent) return this.parent.has(name);
        return false;
      }

      set(name, value) {
        if (name in this.bindings) {
          this.bindings[name] = value;
          return value;
        }
        if (this.parent && this.parent.has(name)) {
          return this.parent.set(name, value);
        }
        this.bindings[name] = value;
        return value;
      }

      declare(name, value) {
        this.bindings[name] = value;
        return value;
      }

      getAllVisible() {
        const all = this.parent ? this.parent.getAllVisible() : {};
        return Object.assign(all, this.bindings);
      }
    }

    const globalEnv = new Environment();
    let currentEnv = globalEnv;

    function deepClone(v) {
      if (v === undefined || v === null) return v;
      if (typeof v !== 'object') return v;
      if (v.__isFunc) return { __isFunc: true, name: v.name };
      try { return JSON.parse(JSON.stringify(v)); } catch { return String(v); }
    }

    function formatVal(v) {
      if (v === undefined) return 'undefined';
      if (v === null) return 'null';
      if (v.__isFunc) return `ƒ ${v.name || 'anonymous'}()`;
      if (typeof v === 'function') return `ƒ ()`;
      if (Array.isArray(v)) return '[' + v.map(formatVal).join(', ') + ']';
      if (typeof v === 'object') {
        try { return JSON.stringify(v); } catch { return String(v); }
      }
      if (typeof v === 'string') return `"${v}"`;
      return String(v);
    }

    function snapshot(line, note, eventType = 'STEP') {
      const varSnapshot = {};
      const allVars = currentEnv.getAllVisible();
      for (const [k, v] of Object.entries(allVars)) {
        varSnapshot[k] = deepClone(v);
      }
      steps.push({
        index: stepCounter++,
        line,
        note,
        eventType,
        variables: varSnapshot,
        output: [...output],
        callStack: callStack.map(f => ({ name: f.name, line: f.line, args: f.args.map(formatVal) }))
      });
    }

    class BreakSignal {}
    class ContinueSignal {}
    class ReturnSignal { constructor(value) { this.value = value; } }

    let ast;
    try {
      ast = acorn.parse(source, { ecmaVersion: 2020, locations: true });
    } catch (e) {
      const errLine = e.loc ? e.loc.line : 0;
      return {
        steps: [],
        variables: {},
        output: '',
        error: { message: e.message.replace(/\s*\(.*\)/, ''), line: errLine },
        exitCode: 1,
        codeLines
      };
    }

    function hoistFunctions(body, env) {
      if (!Array.isArray(body)) return;
      for (const stmt of body) {
        if (stmt && stmt.type === 'FunctionDeclaration') {
          const fn = {
            __isFunc: true,
            name: stmt.id.name,
            params: stmt.params,
            body: stmt.body,
            isExpression: false,
            env: env
          };
          env.declare(stmt.id.name, fn);
        }
      }
    }

    function evalExpr(node) {
      switch (node.type) {
        case 'Literal':
          return node.value;

        case 'Identifier':
          return currentEnv.get(node.name);

        case 'BinaryExpression': {
          const l = evalExpr(node.left);
          const r = evalExpr(node.right);
          switch (node.operator) {
            case '+': return l + r;
            case '-': return l - r;
            case '*': return l * r;
            case '/': return l / r;
            case '%': return l % r;
            case '**': return l ** r;
            case '==': return l == r;
            case '===': return l === r;
            case '!=': return l != r;
            case '!==': return l !== r;
            case '<': return l < r;
            case '>': return l > r;
            case '<=': return l <= r;
            case '>=': return l >= r;
            case '&': return l & r;
            case '|': return l | r;
            case '^': return l ^ r;
            case '<<': return l << r;
            case '>>': return l >> r;
            case '>>>': return l >>> r;
            default: throw new Error(`Unknown operator: ${node.operator}`);
          }
        }

        case 'UnaryExpression': {
          const arg = evalExpr(node.argument);
          switch (node.operator) {
            case '!': return !arg;
            case '-': return -arg;
            case '+': return +arg;
            case 'typeof': return typeof arg;
            case '~': return ~arg;
            default: throw new Error(`Unknown unary: ${node.operator}`);
          }
        }

        case 'AssignmentExpression': {
          let val = evalExpr(node.right);
          if (node.left.type === 'Identifier') {
            if (node.operator !== '=') {
              const old = currentEnv.has(node.left.name) ? currentEnv.get(node.left.name) : 0;
              switch (node.operator) {
                case '+=': val = old + val; break;
                case '-=': val = old - val; break;
                case '*=': val = old * val; break;
                case '/=': val = old / val; break;
                case '%=': val = old % val; break;
                case '**=': val = old ** val; break;
              }
            }
            currentEnv.set(node.left.name, val);
            snapshot(node.loc.start.line, `${node.left.name} = ${formatVal(val)}`, 'ASSIGNMENT');
            return val;
          } else if (node.left.type === 'MemberExpression') {
            const obj = evalExpr(node.left.object);
            const prop = node.left.computed ? evalExpr(node.left.property) : node.left.property.name;
            if (obj && (typeof obj === 'object' || Array.isArray(obj))) {
              if (node.operator !== '=') {
                const old = obj[prop] !== undefined ? obj[prop] : 0;
                switch (node.operator) {
                  case '+=': val = old + val; break;
                  case '-=': val = old - val; break;
                  case '*=': val = old * val; break;
                  case '/=': val = old / val; break;
                  case '%=': val = old % val; break;
                  case '**=': val = old ** val; break;
                }
              }
              obj[prop] = val;
              snapshot(node.loc.start.line, `${node.left.object.name || 'obj'}[${formatVal(prop)}] = ${formatVal(val)}`, 'ASSIGNMENT');
            }
            return val;
          }
          throw new Error('Invalid assignment target');
        }

        case 'MemberExpression': {
          const obj = evalExpr(node.object);
          const prop = node.computed ? evalExpr(node.property) : node.property.name;
          if (obj == null) throw new Error(`TypeError: Cannot read property '${prop}' of ${obj}`);
          return obj[prop];
        }

        case 'CallExpression':
          return evalCall(node);

        case 'ArrayExpression':
          return node.elements.map(e => e ? evalExpr(e) : undefined);

        case 'ObjectExpression': {
          const obj = {};
          for (const prop of node.properties) {
            if (prop.type === 'SpreadElement') {
              const spread = evalExpr(prop.argument);
              Object.assign(obj, spread);
            } else {
              const key = prop.key.type === 'Identifier' ? prop.key.name : evalExpr(prop.key);
              obj[key] = evalExpr(prop.value);
            }
          }
          return obj;
        }

        case 'ConditionalExpression':
          return evalExpr(node.test) ? evalExpr(node.consequent) : evalExpr(node.alternate);

        case 'LogicalExpression': {
          const l = evalExpr(node.left);
          if (node.operator === '&&') return l ? evalExpr(node.right) : l;
          if (node.operator === '||') return l ? l : evalExpr(node.right);
          if (node.operator === '??') return (l === null || l === undefined) ? evalExpr(node.right) : l;
          break;
        }

        case 'UpdateExpression': {
          if (node.argument.type === 'Identifier') {
            const old = currentEnv.has(node.argument.name) ? currentEnv.get(node.argument.name) : 0;
            const newVal = node.operator === '++' ? old + 1 : old - 1;
            currentEnv.set(node.argument.name, newVal);
            snapshot(node.loc.start.line, `${node.argument.name}${node.operator}`, 'UPDATE');
            return node.prefix ? newVal : old;
          }
          break;
        }

        case 'ArrowFunctionExpression':
        case 'FunctionExpression': {
          const fn = {
            __isFunc: true,
            name: node.id?.name || 'anonymous',
            params: node.params,
            body: node.body,
            isExpression: node.body.type !== 'BlockStatement',
            env: currentEnv
          };
          return fn;
        }

        case 'TemplateLiteral': {
          let str = '';
          for (let i = 0; i < node.quasis.length; i++) {
            str += node.quasis[i].value.cooked;
            if (i < node.expressions.length) {
              str += formatVal(evalExpr(node.expressions[i]));
            }
          }
          return str;
        }

        case 'SpreadElement':
          return evalExpr(node.argument);

        case 'SequenceExpression':
          return node.expressions.map(evalExpr).pop();

        case 'ThisExpression':
          return {};

        default:
          throw new Error(`Unsupported expression: ${node.type}`);
      }
    }

    function evalCall(node) {
      const args = node.arguments.map(a => {
        if (a.type === 'SpreadElement') {
          return ['__spread__', evalExpr(a.argument)];
        }
        const val = evalExpr(a);
        if (val && val.__isFunc) {
          return (...cbArgs) => callUserFunction(val, cbArgs, node.loc.start.line);
        }
        return val;
      });
      const flatArgs = [];
      for (const a of args) {
        if (Array.isArray(a) && a[0] === '__spread__') flatArgs.push(...a[1]);
        else flatArgs.push(a);
      }

      if (node.callee.type === 'MemberExpression') {
        const objName = node.callee.object.type === 'Identifier' ? node.callee.object.name : null;
        const methodName = node.callee.computed ? evalExpr(node.callee.property) : node.callee.property.name;

        if (objName === 'console') {
          const msg = flatArgs.map(formatVal).join(' ');
          output.push(msg);
          snapshot(node.loc.start.line, `console.log(${flatArgs.map(formatVal).join(', ')})`, 'LOG');
          return undefined;
        }

        const obj = evalExpr(node.callee.object);
        if (obj != null && typeof obj[methodName] === 'function') {
          const result = obj[methodName].apply(obj, flatArgs);
          snapshot(node.loc.start.line, `Called ${objName || 'expr'}.${methodName}(${flatArgs.map(formatVal).join(', ')}) → ${formatVal(result)}`, 'CALL');
          return result;
        }
      }

      const fn = evalExpr(node.callee);
      if (fn && fn.__isFunc) {
        return callUserFunction(fn, flatArgs, node.loc.start.line);
      }

      if (typeof fn === 'function') return fn(...flatArgs);

      throw new Error(`TypeError: ${formatVal(fn)} is not a function`);
    }

    function callUserFunction(fn, args, callLine) {
      const fnName = fn.name || 'anonymous';
      callStack.push({ name: fnName, line: callLine, args });

      const prevEnv = currentEnv;
      const fnEnv = new Environment(fn.env || globalEnv);
      currentEnv = fnEnv;

      fn.params.forEach((p, i) => {
        if (p.type === 'Identifier') fnEnv.declare(p.name, args[i]);
        else if (p.type === 'AssignmentPattern' && p.left.type === 'Identifier') {
          fnEnv.declare(p.left.name, args[i] !== undefined ? args[i] : evalExpr(p.right));
        } else if (p.type === 'RestElement' && p.argument.type === 'Identifier') {
          fnEnv.declare(p.argument.name, args.slice(i));
        }
      });

      if (!fn.isExpression && fn.body && fn.body.body) {
        hoistFunctions(fn.body.body, fnEnv);
      }

      snapshot(callLine, `Call ${fnName}(${args.map(formatVal).join(', ')})`, 'CALL');

      let result;
      try {
        if (fn.isExpression) {
          result = evalExpr(fn.body);
        } else {
          execBlock(fn.body);
        }
      } catch (e) {
        if (e instanceof ReturnSignal) {
          result = e.value;
        } else {
          currentEnv = prevEnv;
          callStack.pop();
          throw e;
        }
      }

      snapshot(callLine, `Return from ${fnName} → ${formatVal(result)}`, 'RETURN');

      callStack.pop();
      currentEnv = prevEnv;

      return result;
    }

    function assignTarget(targetNode, val, line, prefix = '') {
      if (!targetNode) return;
      if (targetNode.type === 'Identifier') {
        currentEnv.declare(targetNode.name, val);
        snapshot(line, `${prefix}${targetNode.name} = ${formatVal(val)}`, 'DECLARATION');
      } else if (targetNode.type === 'ArrayPattern') {
        if (Array.isArray(val) || (val && typeof val[Symbol.iterator] === 'function')) {
          const arr = Array.from(val);
          targetNode.elements.forEach((elem, idx) => {
            if (elem) assignTarget(elem, arr[idx], line, prefix);
          });
        }
      } else if (targetNode.type === 'ObjectPattern') {
        if (val && typeof val === 'object') {
          targetNode.properties.forEach(prop => {
            if (prop.type === 'Property') {
              const key = prop.key.name || evalExpr(prop.key);
              assignTarget(prop.value, val[key], line, prefix);
            }
          });
        }
      }
    }

    function execStmt(node) {
      switch (node.type) {
        case 'VariableDeclaration':
          for (const decl of node.declarations) {
            const val = decl.init ? evalExpr(decl.init) : undefined;
            if (decl.id.type === 'Identifier') {
              currentEnv.declare(decl.id.name, val);
              snapshot(node.loc.start.line, `${node.kind} ${decl.id.name} = ${formatVal(val)}`, 'DECLARATION');
            } else {
              assignTarget(decl.id, val, node.loc.start.line, `${node.kind} `);
            }
          }
          break;

        case 'ExpressionStatement':
          evalExpr(node.expression);
          break;

        case 'IfStatement': {
          const cond = evalExpr(node.test);
          snapshot(node.loc.start.line, `if (${formatVal(cond)}) → ${cond ? 'true' : 'false'}`, 'CONDITION');
          if (cond) execStmt(node.consequent);
          else if (node.alternate) execStmt(node.alternate);
          break;
        }

        case 'ForStatement': {
          if (node.init) {
            if (node.init.type === 'VariableDeclaration') execStmt(node.init);
            else evalExpr(node.init);
          }
          let iter = 0;
          while (node.test ? evalExpr(node.test) : true) {
            snapshot(node.loc.start.line, `Loop iteration ${iter}`, 'LOOP');
            try {
              execStmt(node.body);
            } catch (e) {
              if (e instanceof BreakSignal) break;
              if (e instanceof ContinueSignal) { }
              else throw e;
            }
            if (node.update) evalExpr(node.update);
            iter++;
            if (iter > 10000) throw new Error('RangeError: Maximum loop iterations exceeded (10000)');
          }
          break;
        }

        case 'ForOfStatement': {
          const iterable = evalExpr(node.right);
          if (iterable == null || typeof iterable[Symbol.iterator] !== 'function') {
            throw new Error(`TypeError: ${formatVal(iterable)} is not iterable`);
          }
          let iter = 0;
          for (const item of iterable) {
            snapshot(node.loc.start.line, `for..of iteration ${iter}`, 'LOOP');
            if (node.left.type === 'VariableDeclaration') {
              assignTarget(node.left.declarations[0].id, item, node.loc.start.line);
            } else if (node.left.type === 'Identifier') {
              currentEnv.set(node.left.name, item);
              snapshot(node.loc.start.line, `${node.left.name} = ${formatVal(item)}`, 'ASSIGNMENT');
            } else {
              assignTarget(node.left, item, node.loc.start.line);
            }
            try {
              execStmt(node.body);
            } catch (e) {
              if (e instanceof BreakSignal) break;
              if (e instanceof ContinueSignal) { }
              else throw e;
            }
            iter++;
            if (iter > 10000) throw new Error('RangeError: Maximum loop iterations exceeded (10000)');
          }
          break;
        }

        case 'ForInStatement': {
          const obj = evalExpr(node.right);
          if (obj == null) break;
          let iter = 0;
          for (const key in obj) {
            snapshot(node.loc.start.line, `for..in iteration ${iter} (key: "${key}")`, 'LOOP');
            if (node.left.type === 'VariableDeclaration') {
              assignTarget(node.left.declarations[0].id, key, node.loc.start.line);
            } else if (node.left.type === 'Identifier') {
              currentEnv.set(node.left.name, key);
              snapshot(node.loc.start.line, `${node.left.name} = "${key}"`, 'ASSIGNMENT');
            } else {
              assignTarget(node.left, key, node.loc.start.line);
            }
            try {
              execStmt(node.body);
            } catch (e) {
              if (e instanceof BreakSignal) break;
              if (e instanceof ContinueSignal) { }
              else throw e;
            }
            iter++;
            if (iter > 10000) throw new Error('RangeError: Maximum loop iterations exceeded (10000)');
          }
          break;
        }

        case 'DoWhileStatement': {
          let iter = 0;
          do {
            snapshot(node.loc.start.line, `do..while iteration ${iter}`, 'LOOP');
            try {
              execStmt(node.body);
            } catch (e) {
              if (e instanceof BreakSignal) break;
              if (e instanceof ContinueSignal) { }
              else throw e;
            }
            iter++;
            if (iter > 10000) throw new Error('RangeError: Maximum loop iterations exceeded (10000)');
          } while (evalExpr(node.test));
          break;
        }

        case 'SwitchStatement': {
          const discriminant = evalExpr(node.discriminant);
          let matched = false;
          let defaultCase = null;
          try {
            for (const caseNode of node.cases) {
              if (!caseNode.test) {
                defaultCase = caseNode;
                continue;
              }
              if (matched || evalExpr(caseNode.test) === discriminant) {
                matched = true;
                for (const stmt of caseNode.consequent) {
                  execStmt(stmt);
                }
              }
            }
            if (!matched && defaultCase) {
              for (const stmt of defaultCase.consequent) {
                execStmt(stmt);
              }
            }
          } catch (e) {
            if (e instanceof BreakSignal) { /* break switch */ }
            else throw e;
          }
          break;
        }

        case 'TryStatement': {
          try {
            execBlock(node.block);
          } catch (e) {
            if (e instanceof ReturnSignal || e instanceof BreakSignal || e instanceof ContinueSignal) {
              throw e;
            }
            if (node.handler) {
              const catchEnv = new Environment(currentEnv);
              const prevEnv = currentEnv;
              currentEnv = catchEnv;
              if (node.handler.param) {
                catchEnv.declare(node.handler.param.name, e.message || String(e));
              }
              snapshot(node.handler.loc?.start?.line || node.loc.start.line, `catch (${e.message || String(e)})`, 'ERROR');
              execBlock(node.handler.body);
              currentEnv = prevEnv;
            } else {
              throw e;
            }
          } finally {
            if (node.finalizer) {
              execBlock(node.finalizer);
            }
          }
          break;
        }

        case 'ThrowStatement': {
          const val = evalExpr(node.argument);
          if (val instanceof Error) throw val;
          throw new Error(String(val));
        }

        case 'WhileStatement': {
          let iter = 0;
          while (evalExpr(node.test)) {
            snapshot(node.loc.start.line, `While iteration ${iter}`, 'LOOP');
            try {
              execStmt(node.body);
            } catch (e) {
              if (e instanceof BreakSignal) break;
              if (e instanceof ContinueSignal) { }
              else throw e;
            }
            iter++;
            if (iter > 10000) throw new Error('RangeError: Maximum loop iterations exceeded (10000)');
          }
          break;
        }

        case 'FunctionDeclaration': {
          const fn = {
            __isFunc: true,
            name: node.id.name,
            params: node.params,
            body: node.body,
            isExpression: false,
            env: currentEnv
          };
          currentEnv.declare(node.id.name, fn);
          snapshot(node.loc.start.line, `function ${node.id.name}()`, 'FUNCTION_DECL');
          break;
        }

        case 'ReturnStatement': {
          const ret = node.argument ? evalExpr(node.argument) : undefined;
          throw new ReturnSignal(ret);
        }

        case 'BlockStatement':
          execBlock(node);
          break;

        case 'BreakStatement':
          throw new BreakSignal();

        case 'ContinueStatement':
          throw new ContinueSignal();

        case 'EmptyStatement':
          break;

        default:
          break;
      }
    }

    function execBlock(block) {
      if (!block || !block.body) return;
      hoistFunctions(block.body, currentEnv);
      for (const stmt of block.body) {
        execStmt(stmt);
      }
    }

    try {
      hoistFunctions(ast.body, globalEnv);
      snapshot(1, 'Program start', 'START');
      for (const stmt of ast.body) {
        execStmt(stmt);
      }
      const lastLine = codeLines.length;
      snapshot(lastLine, 'Program completed', 'END');
    } catch (e) {
      if (e instanceof ReturnSignal || e instanceof BreakSignal || e instanceof ContinueSignal) {
        snapshot(codeLines.length, 'Program completed', 'END');
      } else {
        const errLine = e.loc ? e.loc.start.line : (steps.length > 0 ? steps[steps.length - 1].line : 0);
        error = { message: e.message, line: errLine };
        snapshot(errLine, `❌ Error: ${e.message}`, 'ERROR');
      }
    }

    return {
      steps,
      variables: currentEnv.getAllVisible(),
      output: output.join('\n'),
      error,
      exitCode: error ? 1 : 0,
      codeLines
    };
  }

  return { execute };
})();