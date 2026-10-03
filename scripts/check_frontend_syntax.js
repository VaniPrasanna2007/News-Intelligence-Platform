const fs = require('fs');
const path = require('path');

function getFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(getFiles(file));
    } else if (file.endsWith('.js') || file.endsWith('.jsx')) {
      results.push(file);
    }
  });
  return results;
}

const files = getFiles('frontend/src');

// Common globals or React built-ins
const GLOBALS = new Set([
  'React', 'window', 'document', 'console', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval',
  'FormData', 'Blob', 'File', 'URL', 'Math', 'Date', 'Promise', 'Array', 'Object', 'String', 'Number',
  'Boolean', 'RegExp', 'JSON', 'parseInt', 'parseFloat', 'isNaN', 'isFinite', 'encodeURIComponent',
  'decodeURIComponent', 'Set', 'Map', 'WeakSet', 'WeakMap', 'Error', 'TypeError', 'alert', 'confirm'
]);

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  
  // Find all imports
  const imports = new Set();
  
  // import default from '...'
  const defaultImports = [...content.matchAll(/import\s+([A-Za-z0-9_$]+)\s+from/g)];
  defaultImports.forEach(m => imports.add(m[1]));
  
  // import { A, B as C } from '...'
  const namedImports = [...content.matchAll(/import\s*\{([^}]+)\}\s*from/g)];
  namedImports.forEach(m => {
    m[1].split(',').forEach(part => {
      const trimmed = part.trim();
      if (!trimmed) return;
      if (trimmed.includes(' as ')) {
        imports.add(trimmed.split(' as ')[1].trim());
      } else {
        imports.add(trimmed);
      }
    });
  });

  // Local declarations: const/let/var/function/class
  const localDecls = new Set();
  const declMatches = [...content.matchAll(/(?:const|let|var|function|class)\s+([A-Za-z0-9_$]+)/g)];
  declMatches.forEach(m => localDecls.add(m[1]));

  // Also component function params, e.g. function Comp({ a, b }) or ({ a, b }) =>
  
  // Check JSX tags: <Tag ... or <Tag>
  const jsxTags = [...content.matchAll(/<([A-Z][a-zA-Z0-9_$]*)/g)].map(m => m[1]);
  jsxTags.forEach(tag => {
    if (!imports.has(tag) && !localDecls.has(tag) && !GLOBALS.has(tag)) {
      console.error(`[UNDECLARED JSX TAG] ${file}: <${tag}> is used but neither imported nor declared!`);
    }
  });

  // Check icon references: icon: IconName
  const iconRefs = [...content.matchAll(/icon:\s*([A-Z][a-zA-Z0-9_$]*)/g)].map(m => m[1]);
  iconRefs.forEach(icon => {
    if (!imports.has(icon) && !localDecls.has(icon) && !GLOBALS.has(icon)) {
      console.error(`[UNDECLARED ICON REF] ${file}: icon: ${icon} is used but neither imported nor declared!`);
    }
  });
});

console.log("Deep scan complete.");
