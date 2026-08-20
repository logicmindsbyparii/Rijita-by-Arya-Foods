const fs = require('fs');
const content = fs.readFileSync('src/components/layout/Header.tsx', 'utf-8');

// A very simple checker:
let tagStack = [];
const lines = content.split('\n');

for(let i = 0; i < lines.length; i++) {
  const line = lines[i];
  // ignore simple comment lines
  if(line.trim().startsWith('//')) continue;
  
  // Quick and dirty regex to find <Tag> and </Tag> 
  // It won't handle attributes with > but it's okay for Header.tsx
  const openTags = [...line.matchAll(/<([A-Za-z0-9_.]+)(?![^>]*\/>)[^>]*>/g)];
  const closeTags = [...line.matchAll(/<\/([A-Za-z0-9_.]+)>/g)];
  
  let events = [];
  openTags.forEach(m => events.push({type: 'open', tag: m[1], idx: m.index}));
  closeTags.forEach(m => events.push({type: 'close', tag: m[1], idx: m.index}));
  
  events.sort((a,b) => a.idx - b.idx);
  
  for(let ev of events) {
    if (ev.tag === 'img' || ev.tag === 'input' || ev.tag === 'br' || ev.tag === 'hr') continue; // self closing
    if (ev.type === 'open') {
      tagStack.push({tag: ev.tag, line: i+1});
    } else {
      if (tagStack.length === 0) {
        console.log(`EXTRA CLOSE TAG: </${ev.tag}> at line ${i+1}`);
      } else {
        const top = tagStack.pop();
        if (top.tag !== ev.tag && top.tag !== '' && ev.tag !== '') {
          console.log(`MISMATCH at line ${i+1}: expected </${top.tag}> (from line ${top.line}) but found </${ev.tag}>`);
          // Push back top so we don't destroy stack completely
          tagStack.push(top);
        }
      }
    }
  }
}

console.log("Remaining stack: ", tagStack.map(t => `${t.tag}:${t.line}`).join(', '));
