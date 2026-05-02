# Song Library UI Revamp - End-to-End Testing Suite

This directory contains comprehensive end-to-end tests for the Song Library UI Revamp feature, validating all requirements and ensuring WCAG 2.1 AA compliance.

## Test Files

### 1. `complete-workflows.spec.ts`
Tests complete user workflows including:
- Search and discovery workflows
- Setlist creation and management
- Real-time collaboration scenarios
- Theme switching and persistence
- View mode switching
- Chord transposition workflows
- Mobile responsiveness
- Performance and loading
- Accessibility features

**Coverage**: Requirements 1-15, Properties 1-55

### 2. `performance-benchmarks.spec.ts`
Tests performance requirements including:
- Large dataset handling (1000+ songs)
- Concurrent user scenarios (up to 20 users)
- Mobile performance optimization
- Network condition variations (3G, offline)
- Real-time synchronization performance
- Memory and resource usage

**Coverage**: Requirements 11, 14, Properties 33-36, 45-50

### 3. `accessibility-compliance.spec.ts`
Tests WCAG 2.1 AA compliance including:
- Automated accessibility scans with axe-core
- Keyboard navigation completeness
- Screen reader compatibility
- Focus management
- High contrast mode support
- Color accessibility
- Responsive accessibility
- Error handling accessibility

**Coverage**: Requirement 12, Properties 37-41

## Running the Tests

### Prerequisites

```bash
# Install dependencies
npm install

# Install Playwright browsers
npx playwright install
```

### Run All Tests

```bash
# Run all E2E tests
npm run test:e2e

# Or with Playwright directly
npx playwright test e2e/song-library
```

### Run Specific Test Suites

```bash
# Complete workflows only
npx playwright test e2e/song-library/complete-workflows.spec.ts

# Performance benchmarks only
npx playwright test e2e/song-library/performance-benchmarks.spec.ts

# Accessibility compliance only
npx playwright test e2e/song-library/accessibility-compliance.spec.ts
```

### Run Tests in Different Modes

```bash
# Run in headed mode (see browser)
npx playwright test --headed

# Run in debug mode
npx playwright test --debug

# Run specific test
npx playwright test -g "should complete full search workflow"

# Run on specific browser
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

### Run Mobile Tests

```bash
# Run mobile-specific tests
npx playwright test --project="Mobile Chrome"
npx playwright test --project="Mobile Safari"
```

## Test Configuration

### Environment Variables

Create a `.env.test` file:

```env
BASE_URL=http://localhost:5173
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=password123
TEST_TIMEOUT=60000
```

### Performance Thresholds

Current performance thresholds (defined in `performance-benchmarks.spec.ts`):

- Initial load: 3000ms
- Search response: 100ms
- View switch: 500ms
- Drag & drop: 200ms
- Real-time sync: 2000ms
- Image load: 1000ms
- Scroll FPS: 30 FPS minimum

### Browser Support

Tests run on:
- Chromium (Chrome, Edge)
- Firefox
- WebKit (Safari)
- Mobile Chrome
- Mobile Safari

## Test Reports

### Generate HTML Report

```bash
npx playwright test --reporter=html
npx playwright show-report
```

### Generate JSON Report

```bash
npx playwright test --reporter=json
```

### Generate JUnit Report (for CI)

```bash
npx playwright test --reporter=junit
```

## Continuous Integration

### GitHub Actions Example

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run build
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

## Test Data Setup

### Database Seeding

Before running tests, ensure the database has test data:

```bash
# Run database migrations
npm run db:migrate

# Seed test data
npm run db:seed:test
```

### Test Data Requirements

- Minimum 1000 songs for performance tests
- Multiple users for collaboration tests
- Songs with various metadata (BPM, keys, tags)
- Songs with and without cover art
- Existing setlists for testing

## Debugging Tests

### Visual Debugging

```bash
# Run with headed browser and slow motion
npx playwright test --headed --slow-mo=1000
```

### Screenshot on Failure

Tests automatically capture screenshots on failure. Find them in:
```
test-results/
```

### Video Recording

Enable video recording in `playwright.config.ts`:

```typescript
use: {
  video: 'on-first-retry',
}
```

### Trace Viewer

```bash
# Run with trace
npx playwright test --trace on

# View trace
npx playwright show-trace trace.zip
```

## Accessibility Testing

### Axe-core Integration

Tests use `axe-playwright` for automated accessibility scanning:

```typescript
import { injectAxe, checkA11y } from 'axe-playwright';

await injectAxe(page);
await checkA11y(page);
```

### Manual Testing Checklist

In addition to automated tests, perform manual testing:

- [ ] Test with actual screen readers (NVDA, JAWS, VoiceOver)
- [ ] Test with keyboard only (no mouse)
- [ ] Test with browser zoom at 200%
- [ ] Test with Windows High Contrast mode
- [ ] Test with reduced motion preferences
- [ ] Test with color blindness simulators

## Performance Testing

### Lighthouse Integration

Run Lighthouse audits:

```bash
npx playwright test --project=chromium --grep "performance"
```

### Performance Monitoring

Tests log performance metrics:
- Initial load time
- Search response time
- Scroll FPS
- Memory usage
- Network requests

Check console output for detailed metrics.

## Known Issues and Limitations

### Current Limitations

1. **Real-time collaboration tests**: Require actual WebSocket connections
2. **Mobile tests**: May need actual devices for accurate touch testing
3. **Performance tests**: Results vary based on hardware
4. **Accessibility tests**: Automated tools catch ~30-40% of issues

### Flaky Tests

If tests are flaky, increase timeouts or add wait conditions:

```typescript
await page.waitForSelector('[data-testid="element"]', { 
  timeout: 10000,
  state: 'visible' 
});
```

## Contributing

### Adding New Tests

1. Follow existing test structure
2. Use descriptive test names
3. Add proper test documentation
4. Include requirement/property references
5. Add appropriate timeouts
6. Handle cleanup in `afterEach`

### Test Naming Convention

```typescript
test.describe('Feature Area', () => {
  test('should [expected behavior] when [condition]', async ({ page }) => {
    // Test implementation
  });
});
```

### Best Practices

- Use data-testid attributes for selectors
- Avoid brittle CSS selectors
- Test user behavior, not implementation
- Keep tests independent
- Clean up test data
- Use page object pattern for complex pages
- Add comments for complex test logic

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Axe-core Rules](https://github.com/dequelabs/axe-core/blob/develop/doc/rule-descriptions.md)
- [Testing Library Best Practices](https://testing-library.com/docs/queries/about)

## Support

For issues or questions:
1. Check existing test documentation
2. Review Playwright documentation
3. Check test output and screenshots
4. Use trace viewer for debugging
5. Contact the development team

## License

Same as main project license.
