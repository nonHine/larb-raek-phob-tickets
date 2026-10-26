const fs = require('fs');

const md = fs.readFileSync('PRESENTATION_SLIDES.md', 'utf8');

const tableRows = [...md.matchAll(/\|\s+\*\*(\d+)\*\*\s+\|\s+\*\*([^*]+)\*\*\s+\|/g)];
console.log('Grill-Me table questions count:', tableRows.length);
tableRows.forEach(r => console.log(`Q${r[1]}: ${r[2].slice(0, 60)}...`));

const drilldowns = [...md.matchAll(/####\s+\[สไลด์ที่\s+(\d+)\]/g)];
console.log('Grill-Me drill-down sections count:', drilldowns.length);
