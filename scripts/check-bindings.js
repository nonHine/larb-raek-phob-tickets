const fs = require('fs');

const html = fs.readFileSync('presentation-slides.html', 'utf8');

// Find all document.getElementById calls
const getElemMatches = [...html.matchAll(/document\.getElementById\(['"]([^'"]+)['"]\)/g)].map(m => m[1]);
console.log('Total document.getElementById calls:', getElemMatches.length);

const uniqueIds = [...new Set(getElemMatches)];
const missingIds = [];
uniqueIds.forEach(id => {
  // Check if id exists in HTML: id="id" or id='id'
  const idRegex = new RegExp(`id=["']${id}["']`, 'i');
  if (!idRegex.test(html)) {
    missingIds.push(id);
  }
});

console.log('Missing IDs referenced by getElementById:', missingIds);

// Find all inline onclick calls: onclick="funcName(...)"
const onclickMatches = [...html.matchAll(/onclick=["']([^"']+)["']/g)].map(m => m[1]);
console.log('Total onclick handlers in HTML:', onclickMatches.length);

// Extract script content
const scriptMatch = html.match(/<script(?:\s+[^>]*)?>([\s\S]*?)<\/script>/i);
const scriptCode = scriptMatch ? scriptMatch[1] : '';

// Find functions defined in script: function name( or window.name =
const definedFunctions = [...scriptCode.matchAll(/(?:function\s+([a-zA-Z0-9_$]+)|(?:window\.)?([a-zA-Z0-9_$]+)\s*=\s*(?:function|\()|\b([a-zA-Z0-9_$]+)\s*\([^)]*\)\s*\{)/g)]
  .map(m => m[1] || m[2] || m[3])
  .filter(Boolean);

console.log('Sample defined functions in script:', [...new Set(definedFunctions)].slice(0, 25));

// Check if any onclick handler calls a function that isn't defined
const calledFuncs = onclickMatches.map(h => {
  const m = h.match(/^([a-zA-Z0-9_$]+)\s*\(/);
  return m ? m[1] : null;
}).filter(Boolean);

const missingFuncs = [...new Set(calledFuncs)].filter(fn => !definedFunctions.includes(fn));
console.log('Potentially missing onclick functions:', missingFuncs);
