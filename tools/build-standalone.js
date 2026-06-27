/* Bundle the preview pages into single self-contained HTML files
   (CSS + JS inlined) so they open by double-click — no server needed. */
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const css = fs.readFileSync(path.join(root, 'docs/base.css'), 'utf8');
const js = fs.readFileSync(path.join(root, 'docs/theme.js'), 'utf8');
const catalog = fs.readFileSync(path.join(root, 'docs/catalog.js'), 'utf8');

['index', 'product'].forEach((name) => {
  let html = fs.readFileSync(path.join(root, `docs/${name}.html`), 'utf8');
  html = html.replace('<link rel="stylesheet" href="./base.css">', '<style>\n' + css + '\n</style>');
  html = html.replace('<script src="./catalog.js"></script>', '<script>\n' + catalog + '\n</script>');
  html = html.replace('<script src="./theme.js"></script>', '<script>\n' + js + '\n</script>');
  // make in-file links point at the standalone siblings
  html = html.replace(/href="index\.html/g, 'href="atelier-bismuth-home.html');
  html = html.replace(/href="product\.html/g, 'href="atelier-bismuth-product.html');
  const out = name === 'index' ? 'atelier-bismuth-home.html' : 'atelier-bismuth-product.html';
  fs.writeFileSync(path.join(root, out), html);
  console.log('wrote', out, html.length, 'bytes');
});
