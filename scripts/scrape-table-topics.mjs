import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = join(__dirname, '../src/data/table-topics.json');

async function scrape() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  console.log('Navigating to page...');
  await page.goto('https://powerfulspeak.com/table-topics-questions/', {
    waitUntil: 'networkidle',
  });

  console.log('Extracting questions...');
  const data = await page.evaluate(() => {
    const categories = [];

    // Try to find category headings and their associated questions
    // Common patterns: h2/h3 headings followed by ol/ul lists or p tags
    const headings = document.querySelectorAll('h2, h3');

    for (const heading of headings) {
      const name = heading.textContent?.trim();
      if (!name) continue;

      const questions = [];
      let sibling = heading.nextElementSibling;

      while (sibling && !['H2', 'H3'].includes(sibling.tagName)) {
        // Check for list items
        const listItems = sibling.querySelectorAll('li');
        if (listItems.length > 0) {
          for (const li of listItems) {
            const text = li.textContent?.trim();
            if (text) questions.push(text);
          }
        } else {
          // Check for paragraphs that look like questions
          const text = sibling.textContent?.trim();
          if (text && text.endsWith('?')) questions.push(text);
        }
        sibling = sibling.nextElementSibling;
      }

      if (questions.length > 0) {
        categories.push({ name, questions });
      }
    }

    return categories;
  });

  await browser.close();

  if (data.length === 0) {
    console.error('No categories found. Dumping page text for inspection...');
    const browser2 = await chromium.launch();
    const page2 = await browser2.newPage();
    await page2.goto('https://powerfulspeak.com/table-topics-questions/', { waitUntil: 'networkidle' });
    const bodyText = await page2.evaluate(() => document.body.innerText);
    await browser2.close();
    console.log('Page text (first 3000 chars):\n', bodyText.slice(0, 3000));
    process.exit(1);
  }

  const totalQuestions = data.reduce((sum, cat) => sum + cat.questions.length, 0);
  console.log(`Found ${data.length} categories, ${totalQuestions} questions total.`);

  mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
  writeFileSync(OUTPUT_PATH, JSON.stringify({ categories: data }, null, 2));
  console.log(`Saved to ${OUTPUT_PATH}`);
}

scrape().catch((err) => {
  console.error(err);
  process.exit(1);
});
