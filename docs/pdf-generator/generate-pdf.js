const fs = require('fs');
const path = require('path');
const { marked } = require('marked');
const puppeteer = require('puppeteer');

const MANUAL_PATH = path.join(__dirname, '..', '..', 'USER_MANUAL.md');
const OUTPUT_PATH = path.join(__dirname, '..', 'USER_MANUAL.pdf');

if (!fs.existsSync(MANUAL_PATH)) {
  console.error('❌ Файл руководства не найден:', MANUAL_PATH);
  process.exit(1);
}

console.log('📄 Генерация PDF из руководства пользователя...');

async function generatePDF() {
  const mdContent = fs.readFileSync(MANUAL_PATH, 'utf-8');

  // Заменяем относительные пути на base64 для встраивания изображений
  const baseDir = path.dirname(MANUAL_PATH);
  let processedMd = mdContent;

  const imgRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
  let match;
  while ((match = imgRegex.exec(mdContent)) !== null) {
    const [fullMatch, alt, src] = match;
    const absolutePath = path.resolve(baseDir, src);
    if (fs.existsSync(absolutePath)) {
      const ext = path.extname(absolutePath).toLowerCase();
      const mimeType = ext === '.png' ? 'image/png' : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'image/png';
      const base64 = fs.readFileSync(absolutePath).toString('base64');
      const dataUri = `data:${mimeType};base64,${base64}`;
      processedMd = processedMd.replace(fullMatch, `![${alt}](${dataUri})`);
    }
  }

  const htmlBody = marked.parse(processedMd);

  const fullHtml = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <title>Складская Система Управления — Руководство Пользователя</title>
  <style>
    @page {
      size: A4;
      margin: 20mm 15mm 20mm 15mm;
    }
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.6;
      color: #333;
      max-width: 100%;
    }
    h1 {
      font-size: 22pt;
      color: #1a1a1a;
      border-bottom: 3px solid #0066cc;
      padding-bottom: 10px;
      margin-top: 0;
      page-break-before: always;
    }
    h1:first-of-type {
      page-break-before: avoid;
    }
    h2 {
      font-size: 15pt;
      color: #0066cc;
      border-bottom: 1px solid #ddd;
      padding-bottom: 5px;
      margin-top: 25px;
    }
    h3 {
      font-size: 12pt;
      color: #444;
      margin-top: 20px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
      font-size: 10pt;
    }
    th {
      background-color: #0066cc;
      color: white;
      padding: 8px 10px;
      text-align: left;
      font-weight: 600;
    }
    td {
      padding: 6px 10px;
      border-bottom: 1px solid #ddd;
    }
    tr:nth-child(even) {
      background-color: #f8f9fa;
    }
    img {
      max-width: 100%;
      height: auto;
      display: block;
      margin: 15px auto;
      border: 1px solid #ddd;
      border-radius: 4px;
      page-break-inside: avoid;
    }
    p em {
      display: block;
      text-align: center;
      font-size: 10pt;
      color: #666;
      margin-top: 5px;
      margin-bottom: 15px;
    }
    code {
      background-color: #f4f4f4;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: 'Consolas', monospace;
      font-size: 10pt;
    }
    pre {
      background-color: #f8f9fa;
      padding: 15px;
      border-radius: 5px;
      border-left: 4px solid #0066cc;
      overflow-x: auto;
      font-size: 9pt;
    }
    ul, ol {
      margin: 10px 0;
      padding-left: 25px;
    }
    li {
      margin: 5px 0;
    }
    hr {
      border: none;
      border-top: 2px solid #eee;
      margin: 30px 0;
    }
    a {
      color: #0066cc;
      text-decoration: none;
    }
    strong {
      color: #1a1a1a;
    }
    blockquote {
      background-color: #f0f7ff;
      border-left: 4px solid #0066cc;
      padding: 15px 20px;
      margin: 15px 0;
      border-radius: 0 5px 5px 0;
    }
    blockquote p {
      margin: 5px 0;
    }
  </style>
</head>
<body>
${htmlBody}
</body>
</html>`;

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setContent(fullHtml, { waitUntil: 'networkidle0' });

  await page.pdf({
    path: OUTPUT_PATH,
    format: 'A4',
    printBackground: true,
    margin: {
      top: '20mm',
      bottom: '20mm',
      left: '15mm',
      right: '15mm'
    },
    displayHeaderFooter: true,
    headerTemplate: '<div></div>',
    footerTemplate: `
      <div style="font-size: 9pt; width: 100%; text-align: center; color: #999; padding: 5mm 0;">
        <span class="pageNumber"></span> / <span class="totalPages"></span>
      </div>
    `
  });

  await browser.close();

  const stats = fs.statSync(OUTPUT_PATH);
  console.log('✅ PDF успешно создан!');
  console.log('📊 Размер файла:', (stats.size / 1024 / 1024).toFixed(2), 'MB');
  console.log('📍 Путь к файлу:', OUTPUT_PATH);
}

generatePDF().catch(err => {
  console.error('❌ Ошибка генерации PDF:', err.message);
  process.exit(1);
});
