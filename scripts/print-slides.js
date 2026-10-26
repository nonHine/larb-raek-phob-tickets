const fs = require('fs');

const html = fs.readFileSync('presentation-slides.html', 'utf8');

const slideRegex = /<section[^>]*class=["']slide-content-wrap[^"']*["'][^>]*data-slide=["'](\d+)["'][^>]*data-title=["']([^"']*)["'][^>]*>([\s\S]*?)<\/section>/gi;

let match;
while ((match = slideRegex.exec(html)) !== null) {
  const slideNum = match[1];
  const slideTitle = match[2];
  const body = match[3];
  
  // Extract h1, h2, pill
  const pillMatch = body.match(/<span[^>]*class=["']slide-tag-pill["'][^>]*>([\s\S]*?)<\/span>/i);
  const pill = pillMatch ? pillMatch[1].replace(/<[^>]+>/g, '').trim() : '';
  const h1Match = body.match(/<h1[^>]*class=["']slide-title["'][^>]*>([\s\S]*?)<\/h1>/i);
  const h1 = h1Match ? h1Match[1].replace(/<[^>]+>/g, '').trim() : '';
  
  console.log(`Slide ${slideNum}: [${pill}] ${h1}`);
}
