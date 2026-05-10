const fs = require('fs');
const path = require('path');
const base = 'f:/Projects/validifypro-visa-portal';

function writeFile(relPath, content) {
  const full = path.join(base, relPath);
  const dir = path.dirname(full);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(full, content, 'utf8');
  console.log('Created: ' + full);
}

const adminList = fs.readFileSync(path.join(base, 'scripts', 'admin_messages_list.template'), 'utf8');
const adminThread = fs.readFileSync(path.join(base, 'scripts', 'admin_messages_thread.template'), 'utf8');

writeFile('app/admin/messages/page.js', adminList);
writeFile('app/admin/messages/[conversationId]/page.js', adminThread);
console.log('Done.');
