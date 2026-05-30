const fs   = require('fs');
const path = require('path');

const TEMPLATE = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');

module.exports = (req, res) => {
  const html = TEMPLATE
    .replace('%%WEBHOOK_URL%%', process.env.WEBHOOK_URL || '')
    .replace('%%ACCESS_CODE%%', process.env.ACCESS_CODE || '');

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(html);
};
