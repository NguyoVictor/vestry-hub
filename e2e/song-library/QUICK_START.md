# Song Library E2E Tests - Quick Start Guide

## 🚀 Getting Started in 5 Minutes

### 1. Install Dependencies

```bash
# Install all project dependencies
npm install

# Install Playwright browsers (one-time setup)
npx playwright install
```

### 2. Start the Application

```bash
# In one terminal, start the dev server
npm run dev
```

### 3. Run the Tests

```bash
# In another terminal, run all E2E tests
npm run test:e2e

# Or run specific test suites
npm run test:e2e:workflows      # Complete user workflows
npm run test:e2e:performance    # Performance benchmarks
npm run test:e2e:accessibility  # Accessibility compliance
```

### 4. View Results

```bash
# Open the HTML report
npm run test:e2e:report
```

---

## 📋 Common Commands

### Running Tests

```bash
# Run all tests
npm run test:e2e

# Run with UI mode (interactive)
npm run test:e2e:ui

# Run in headed mode (see browser)
npm run test:e2e:headed

# Run in debug mode (step through)
npm run test:e2e:debug

# Run specific test file
npx playwright test e2e/song-library/complete-workflows.spec.ts

# Run specific test by name
npx playwright test -g "should complete full search workflow"

# Run on specific browser
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

### Debugging

```bash
# Run with debug mode
npm run test:e2e:debug

# Run with trace
npx playwright test --trace on

# View trace
npx playwright show-trace trace.zip

# Run with headed browser and slow motion
npx playwright test --headed --slow-mo=1000
```

### Reports

```bash
# Generate and open HTML report
npm run test:e2e:report

# Generate JSON report
npx playwright test --reporter=json

# Generate JUnit report (for CI)
npx playwright test --reporter=junit
```

---

## 🎯 What Gets Tested

### Complete Workflows (`complete-workflows.spec.ts`)
- ✅ Search and discovery
- ✅ Setlist creation and management
- ✅ Real-time collaboration
- ✅ Theme switching
- ✅ View mode switching
- ✅ Chord transposition
- ✅ Mobile responsiveness
- ✅ Performance and loading
- ✅ Basic accessibility

**Duration**: ~15 minutes

### Performance Benchmarks (`performance-benchmarks.spec.ts`)
- ✅ Large dataset handling (1000+ songs)
- ✅ Concurrent users (up to 20)
- ✅ Mobile performance
- ✅ Network conditions (3G, offline)
- ✅ Real-time sync performance
- ✅ Memory usage

**Duration**: ~20 minutes

### Accessibility Compliance (`accessibility-compliance.spec.ts`)
- ✅ WCAG 2.1 AA automated scans
- ✅ Keyboard navigation
- ✅ Screen reader compatibility
- ✅ Focus management
- ✅ High contrast mode
- ✅ Color accessibility

**Duration**: ~10 minutes

---

## 🔧 Configuration

### Environment Variables

Create `.env.test`:

```env
BASE_URL=http://localhost:5173
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=password123
```

### Performance Thresholds

Edit `performance-benchmarks.spec.ts`:

```typescript
const PERFORMANCE_THRESHOLDS = {
  initialLoad: 3000,    // 3 seconds
  searchResponse: 100,  // 100ms
  viewSwitch: 500,      // 500ms
  // ... adjust as needed
};
```

---

## 📊 Understanding Results

### Test Output

```
Running 80 tests using 4 workers

  ✓ complete-workflows.spec.ts:15:5 › should complete full search workflow (2.3s)
  ✓ complete-workflows.spec.ts:45:5 › should create and manage setlist (3.1s)
  ✗ performance-benchmarks.spec.ts:20:5 › should load within threshold (4.2s)

80 passed (75.2s)
```

### What to Look For

- ✅ **Green checkmarks**: Tests passed
- ❌ **Red X**: Tests failed (check error message)
- ⏱️ **Duration**: Time taken (watch for slow tests)
- 📸 **Screenshots**: Captured on failure in `test-results/`

### Common Issues

**Issue**: Tests timeout
**Solution**: Increase timeout in test or check if app is running

**Issue**: Element not found
**Solution**: Check if `data-testid` attributes exist in components

**Issue**: Flaky tests
**Solution**: Add proper wait conditions or increase timeouts

---

## 🎨 Test Structure

### Test File Organization

```
e2e/song-library/
├── complete-workflows.spec.ts      # User workflows
├── performance-benchmarks.spec.ts  # Performance tests
├── accessibility-compliance.spec.ts # A11y tests
├── test-utils.ts                   # Shared helpers
├── global-setup.ts                 # Setup before all tests
├── global-teardown.ts              # Cleanup after all tests
└── README.md                       # Full documentation
```

### Test Pattern

```typescript
test.describe('Feature Area', () => {
  test.beforeEach(async ({ page }) => {
    // Setup for each test
    await login(page);
    await navigateToSongLibrary(page);
  });

  test('should do something', async ({ page }) => {
    // Arrange
    await openCommandPalette(page);
    
    // Act
    await page.fill('[data-testid="search-input"]', 'test');
    
    // Assert
    await expect(page.locator('[data-testid="results"]')).toBeVisible();
  });
});
```

---

## 🐛 Debugging Tips

### 1. Use UI Mode

```bash
npm run test:e2e:ui
```

Interactive mode with:
- Test picker
- Time travel debugging
- Watch mode
- Screenshots

### 2. Use Debug Mode

```bash
npm run test:e2e:debug
```

Opens Playwright Inspector:
- Step through tests
- Inspect elements
- View console logs
- Edit selectors

### 3. Add Breakpoints

```typescript
test('my test', async ({ page }) => {
  await page.goto('/songs');
  await page.pause(); // Pauses here
  // ... rest of test
});
```

### 4. Take Screenshots

```typescript
await page.screenshot({ path: 'debug.png', fullPage: true });
```

### 5. Log Page State

```typescript
console.log('URL:', page.url());
console.log('Title:', await page.title());
```

---

## 📱 Mobile Testing

### Run Mobile Tests

```bash
# Mobile Chrome
npx playwright test --project="Mobile Chrome"

# Mobile Safari
npx playwright test --project="Mobile Safari"

# iPad
npx playwright test --project="iPad"
```

### Mobile-Specific Tests

Tests automatically detect mobile context:

```typescript
test('mobile feature', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'Mobile-only test');
  // Mobile-specific test code
});
```

---

## 🔄 CI/CD Integration

### GitHub Actions

```yaml
- name: Run E2E Tests
  run: |
    npm ci
    npx playwright install --with-deps
    npm run build
    npm run test:e2e
```

### Test Reports in CI

```yaml
- uses: actions/upload-artifact@v3
  if: always()
  with:
    name: playwright-report
    path: playwright-report/
```

---

## 📚 Additional Resources

- [Full Documentation](./README.md)
- [Test Coverage Report](./TEST_COVERAGE.md)
- [Playwright Docs](https://playwright.dev/)
- [WCAG Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)

---

## 🆘 Getting Help

### Check These First

1. **Test output**: Read error messages carefully
2. **Screenshots**: Check `test-results/` folder
3. **Trace viewer**: `npx playwright show-trace trace.zip`
4. **Documentation**: Read [README.md](./README.md)

### Still Stuck?

1. Run with `--debug` flag
2. Check if app is running
3. Verify test data exists
4. Check browser console for errors
5. Contact the development team

---

## ✅ Success Checklist

Before committing:

- [ ] All tests pass locally
- [ ] No console errors
- [ ] Screenshots look correct
- [ ] Performance within thresholds
- [ ] Accessibility violations fixed
- [ ] Tests run on all browsers
- [ ] Mobile tests pass
- [ ] Documentation updated

---

## 🎉 You're Ready!

You now have everything you need to run and maintain the Song Library E2E tests. Happy testing! 🚀
