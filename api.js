const fs = require('fs');
const path = require('path');

module.exports = (req, res) => {
  const webhookUrl  = process.env.WEBHOOK_URL  || '';
  const accessCode  = process.env.ACCESS_CODE  || '';

  const templatePath = path.join(process.cwd(), 'template.html');
  let html = fs.readFileSync(templatePath, 'utf8');

  html = html
    .replace('%%WEBHOOK_URL%%', webhookUrl)
    .replace('%%ACCESS_CODE%%', accessCode);

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(html);
};
