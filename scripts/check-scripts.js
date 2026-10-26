const fs = require('fs');

const html = fs.readFileSync('presentation-slides.html', 'utf8');

// Extract all <script> tags
const scripts = [...html.matchAll(/<script(?:\s+[^>]*)?>([\s\S]*?)<\/script>/gi)].map(m => m[1]);
console.log('Total script blocks:', scripts.length);

// Let's check each script block for syntax errors using new Function() or vm
const vm = require('vm');
scripts.forEach((code, idx) => {
  try {
    new vm.Script(code);
    console.log(`Script block ${idx + 1}: Syntax OK (${code.length} chars)`);
  } catch (err) {
    console.error(`Script block ${idx + 1}: Syntax ERROR:`, err.message);
  }
});
