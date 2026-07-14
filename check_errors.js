import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  page.on('requestfailed', request =>
    console.log('REQUEST FAILED:', request.url(), request.failure()?.errorText)
  );

  console.log('Navigating to http://localhost:8080/browse ...');
  await page.goto('http://localhost:8080/browse', { waitUntil: 'networkidle2' });
  
  // Wait a bit to see if any react errors pop up
  await new Promise(r => setTimeout(r, 2000));
  
  await browser.close();
})();
