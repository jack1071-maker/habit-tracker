// Runs after `expo export --platform web`.
// Adds tags to every exported HTML page so phones can save the site to the
// Home Screen and open it full screen like a real app, with its own icon and name.
const fs = require('fs');
const path = require('path');

const DIST = path.join(__dirname, '..', 'dist');

const TAGS = [
  '<meta name="apple-mobile-web-app-capable" content="yes"/>',
  '<meta name="mobile-web-app-capable" content="yes"/>',
  '<meta name="apple-mobile-web-app-title" content="Habits"/>',
  '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"/>',
  '<meta name="theme-color" content="#231B47"/>',
  '<meta name="description" content="Track your habits and grow a tree with your streak."/>',
  '<link rel="apple-touch-icon" href="/apple-touch-icon.png"/>',
  '<link rel="manifest" href="/manifest.json"/>',
].join('');

function htmlFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return htmlFiles(full);
    return entry.name.endsWith('.html') ? [full] : [];
  });
}

const files = htmlFiles(DIST);
for (const file of files) {
  let html = fs.readFileSync(file, 'utf8');
  if (html.includes('apple-mobile-web-app-capable')) continue; // already done
  html = html
    // Let the app draw under the iPhone's notch and status bar (the app pads for them itself).
    .replace(/<meta name="viewport" content="[^"]*"\/>/, '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"/>')
    .replace('</head>', `${TAGS}</head>`);
  // Give each page a proper title.
  html = html.includes('<title>') ? html : html.replace('</head>', '<title>Habit Tracker</title></head>');
  fs.writeFileSync(file, html);
}
console.log(`Added Home Screen tags to ${files.length} page(s).`);
