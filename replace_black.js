const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('.tsx') || file.endsWith('.ts') || file.endsWith('.css')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk('client/src');
let changedCount = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let newContent = content
    .replace(/bg-black(\/[0-9]+)?/g, 'bg-brand-950$1')
    .replace(/text-black(\/[0-9]+)?/g, 'text-brand-950$1')
    .replace(/border-black(\/[0-9]+)?/g, 'border-brand-950$1')
    .replace(/ring-black(\/[0-9]+)?/g, 'ring-brand-950$1')
    .replace(/fill-black(\/[0-9]+)?/g, 'fill-brand-950$1')
    .replace(/rgba\(0,0,0,/g, 'rgba(5,20,8,')
    .replace(/rgba\(0, 0, 0,/g, 'rgba(5, 20, 8,')
    .replace(/#000000/g, '#051408');

  newContent = newContent.replace(/color:\s*black\b/g, 'color: var(--color-ink)');

  if (content !== newContent) {
    fs.writeFileSync(file, newContent, 'utf8');
    changedCount++;
    console.log(`Updated: ${file}`);
  }
});
console.log(`Finished updating ${changedCount} files.`);
