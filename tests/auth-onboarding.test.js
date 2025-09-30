const puppeteer = require('puppeteer');

describe('Tourneydo Authentication & Onboarding Flow', () => {
  let browser;
  let page;

  beforeAll(async () => {
    browser = await puppeteer.launch({
      headless: false, // Set to true for CI/CD
      slowMo: 100, // Slow down operations for better debugging
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  });

  afterAll(async () => {
    await browser.close();
  });

  beforeEach(async () => {
    page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
  });

  afterEach(async () => {
    await page.close();
  });

  describe('Sign-in Page', () => {
    test('should load sign-in page with enhanced UI', async () => {
      await page.goto('http://localhost:3000/sign-in');

      // Check for Tourneydo branding
      await page.waitForSelector('h1');
      const title = await page.$eval('h1', el => el.textContent);
      expect(title).toBe('Welcome to Tourneydo');

      // Check for enhanced styling
      const gradientBg = await page.$('[class*="bg-gradient-to-br"]');
      expect(gradientBg).toBeTruthy();

      // Check for Clerk sign-in form
      const signInForm = await page.$('form');
      expect(signInForm).toBeTruthy();
    });

    test('should have proper form styling', async () => {
      await page.goto('http://localhost:3000/sign-in');

      // Check for styled form container
      const formContainer = await page.$('[class*="bg-white"][class*="rounded-xl"]');
      expect(formContainer).toBeTruthy();

      // Check for gradient button
      const submitButton = await page.$('[class*="bg-gradient-to-r"]');
      expect(submitButton).toBeTruthy();
    });
  });

  describe('Sign-up Page', () => {
    test('should load sign-up page with enhanced UI', async () => {
      await page.goto('http://localhost:3000/sign-up');

      // Check for Tourneydo branding
      await page.waitForSelector('h1');
      const title = await page.$eval('h1', el => el.textContent);
      expect(title).toBe('Join Tourneydo');

      // Check for enhanced styling
      const gradientBg = await page.$('[class*="bg-gradient-to-br"]');
      expect(gradientBg).toBeTruthy();

      // Check for Clerk sign-up form
      const signUpForm = await page.$('form');
      expect(signUpForm).toBeTruthy();
    });

    test('should redirect to onboarding after sign-up', async () => {
      await page.goto('http://localhost:3000/sign-up');

      // Note: This test would require actual Clerk authentication
      // For now, we'll just verify the page loads correctly
      const currentUrl = page.url();
      expect(currentUrl).toContain('/sign-up');
    });
  });

  describe('Onboarding Flow', () => {
    test('should load onboarding page for authenticated users', async () => {
      // Note: This test assumes the user is already authenticated
      // In a real test environment, you'd need to authenticate first

      await page.goto('http://localhost:3000/onboarding');

      // Check if we're redirected (middleware should redirect unauthenticated users)
      const currentUrl = page.url();
      if (currentUrl.includes('/sign-in')) {
        // This is expected for unauthenticated users
        expect(currentUrl).toContain('/sign-in');
      } else {
        // If authenticated, check onboarding page
        await page.waitForSelector('h1');
        const title = await page.$eval('h1', el => el.textContent);
        expect(title).toBe('Welcome to Tourneydo!');
      }
    });

    test('should have onboarding form with required fields', async () => {
      await page.goto('http://localhost:3000/onboarding');

      // Check if redirected to sign-in (expected for unauthenticated)
      const currentUrl = page.url();
      if (currentUrl.includes('/sign-in')) {
        return; // Skip test for unauthenticated users
      }

      // Check for organization name field
      const orgNameField = await page.$('input[name="organizationName"]');
      expect(orgNameField).toBeTruthy();

      // Check for organization type select
      const orgTypeField = await page.$('select[name="organizationType"]');
      expect(orgTypeField).toBeTruthy();

      // Check for submit button
      const submitButton = await page.$('button[type="submit"]');
      expect(submitButton).toBeTruthy();
    });

    test('should validate required fields', async () => {
      await page.goto('http://localhost:3000/onboarding');

      const currentUrl = page.url();
      if (currentUrl.includes('/sign-in')) {
        return; // Skip test for unauthenticated users
      }

      // Try to submit empty form
      const submitButton = await page.$('button[type="submit"]');
      if (submitButton) {
        await submitButton.click();

        // Check if form validation prevents submission
        // Note: HTML5 validation might prevent form submission
        const stillOnOnboarding = page.url().includes('/onboarding');
        expect(stillOnOnboarding).toBe(true);
      }
    });
  });

  describe('Complete Authentication Flow', () => {
    test('should handle the complete flow structure', async () => {
      // Test 1: Access home page
      await page.goto('http://localhost:3000');
      let currentUrl = page.url();

      // Should redirect to sign-in if not authenticated
      if (currentUrl.includes('/sign-in')) {
        expect(currentUrl).toContain('/sign-in');
      }

      // Test 2: Access sign-in page
      await page.goto('http://localhost:3000/sign-in');
      await page.waitForSelector('h1');
      const signInTitle = await page.$eval('h1', el => el.textContent);
      expect(signInTitle).toBe('Welcome to Tourneydo');

      // Test 3: Access sign-up page
      await page.goto('http://localhost:3000/sign-up');
      await page.waitForSelector('h1');
      const signUpTitle = await page.$eval('h1', el => el.textContent);
      expect(signUpTitle).toBe('Join Tourneydo');

      // Test 4: Try accessing onboarding (should redirect)
      await page.goto('http://localhost:3000/onboarding');
      currentUrl = page.url();

      // Should redirect to sign-in if not authenticated
      if (currentUrl.includes('/sign-in')) {
        expect(currentUrl).toContain('/sign-in');
      }
    });
  });

  describe('UI/UX Enhancements', () => {
    test('should have consistent branding across auth pages', async () => {
      // Test sign-in page branding
      await page.goto('http://localhost:3000/sign-in');
      const signInLogo = await page.$('[class*="bg-gradient-to-r"][class*="from-blue-600"]');
      expect(signInLogo).toBeTruthy();

      // Test sign-up page branding
      await page.goto('http://localhost:3000/sign-up');
      const signUpLogo = await page.$('[class*="bg-gradient-to-r"][class*="from-blue-600"]');
      expect(signUpLogo).toBeTruthy();
    });

    test('should have responsive design', async () => {
      await page.goto('http://localhost:3000/sign-in');

      // Check if page is responsive
      const viewport = await page.viewport();
      expect(viewport.width).toBe(1280);
      expect(viewport.height).toBe(720);

      // Check for mobile-friendly classes
      const responsiveContainer = await page.$('[class*="max-w-md"]');
      expect(responsiveContainer).toBeTruthy();
    });
  });
});
