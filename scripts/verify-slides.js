const fs = require('fs');

const html = fs.readFileSync('presentation-slides.html', 'utf8');
const md = fs.readFileSync('PRESENTATION_SLIDES.md', 'utf8');

console.log('--- HTML CHECK ---');
// Find slide containers
const slideDivs = [...html.matchAll(/class="slide([^"]*)"/g)].map(m => m[0]);
console.log('class="slide..." matches:', slideDivs.slice(0, 20));

// Find all tags with id containing slide
const idMatches = [...html.matchAll(/id="([^"]*slide[^"]*)"/gi)].map(m => m[1]);
console.log('id="...slide..." matches:', idMatches);

// Find section tags
const sections = [...html.matchAll(/<section([^>]*)>/g)].map(m => m[1]);
console.log('section tags count:', sections.length);
console.log('section tags first 5:', sections.slice(0, 5));

// Check speakerNotes structure
const notesMatch = html.match(/const speakerNotes = \[([\s\S]*?)\];/);
if (notesMatch) {
  const notes = eval(`[${notesMatch[1]}]`);
  console.log('First note keys:', Object.keys(notes[0]));
  console.log('First note sample:', notes[0]);
}

console.log('\n--- MD CHECK ---');
const mdHeadings = [...md.matchAll(/^(#{1,3})\s+(.*)$/gm)].map(m => `${m[1]} ${m[2]}`);
console.log('MD headings sample:');
console.log(mdHeadings.slice(0, 30));
