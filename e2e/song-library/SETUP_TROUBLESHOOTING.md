# Song Library E2E Tests - Setup Troubleshooting Guide

## Common Setup Issues and Solutions

### Issue 1: Missing System Dependencies (Linux/WSL)

**Symptom**: You see this warning when running `npx playwright install`:

```
Host system is missing dependencies to run browsers.
Please install them with the following command:
    sudo npx playwright install-deps
```

**Solution Options**:

#### Option A: Install All Dependencies (Recommended)

```bash
# Install all required system dependencies
sudo npx playwright install-deps
```

This installs all necessary libraries for Chromium, Firefox, and WebKit.

#### Option B: Install Specific Dependencies

If you don't have sudo access or prefer minimal installation:

```bash
# For Ubuntu/Debian
sudo apt-get install libasound2t64

# Or install all required packages manually
sudo apt-get install \
  libasound2t64 \
  libatk-bridge2.0-0 \
  libatk1.0-0 \
  libatspi2.0-0 \
  libcairo2 \
  libcups2 \
  libdbus-1-3 \
  libdrm2 \
  libgbm1 \
  libglib2.0-0 \
  libnspr4 \
  libnss3 \
  libpango-1.0-0 \
  libx11-6 \
  libxcb1 \
  libxcomposite1 \
  libxdamage1 \
  libxext6 \
  libxfixes3 \
  libxkbcommon0 \
  libxrandr2
```

#### Option C: Use Docker (No System Changes)

If you can't install system dependencies, use Docker:

```bash
# Pull Playwright Docker image
docker pull mcr.microsoft.com/playwright:v1.40.0-focal

# Run tests in Docker
docker run --rm -v $(pwd):/work -w /work \
  mcr.microsoft.com/playwright:v1.40.0-focal \
  npm run test:e2e
```

#### Option D: Run on Windows (WSL Alternative)

If you're using WSL, you can run tests on Windows instead:

```powershell
# In Windows PowerShell (not WSL)
cd C:\Users\ADMIN\vestry-hub
npm run test:e2e
```

---

### Issue 2: Playwright Browsers Not Installed

**Symptom**: Error message about missing browsers

**Solution**:

```bash
# Install all browsers
npx playwright install

# Or install specific browsers
npx playwright install chromium
npx playwright install firefox
npx playwright install webkit
```

---

### Issue 3: Port Already in Use

**Symptom**: Error about port 5173 already in use

**Solution**:

```bash
# Find process using port 5173
lsof -i :5173

# Kill the process
kill -9 <PID>

# Or use a different port
BASE_URL=http://localhost:5174 npm run test:e2e
```

---

### Issue 4: Tests Timeout

**Symptom**: Tests fail with timeout errors

**Solution**:

1. **Increase timeout in test**:
```typescript
test('my test', async ({ page }) => {
  test.setTimeout(120000); // 2 minutes
  // ... test code
});
```

2. **Check if app is running**:
```bash
# Make sure dev server is running
npm run dev
```

3. **Check network connectivity**:
```bash
curl http://localhost:5173
```

---

### Issue 5: Permission Denied

**Symptom**: Permission errors when installing or running

**Solution**:

```bash
# Fix npm permissions
sudo chown -R $USER:$USER ~/.npm
sudo chown -R $USER:$USER ~/.cache

# Or use npx without sudo
npx playwright install --with-deps
```

---

### Issue 6: Out of Memory

**Symptom**: Tests crash with out of memory errors

**Solution**:

1. **Increase Node memory**:
```bash
NODE_OPTIONS="--max-old-space-size=4096" npm run test:e2e
```

2. **Run fewer tests in parallel**:
```bash
npx playwright test --workers=1
```

3. **Close other applications**

---

### Issue 7: Slow Test Execution

**Symptom**: Tests take too long to run

**Solution**:

1. **Run specific test suite**:
```bash
npm run test:e2e:workflows  # Only workflows
```

2. **Run on single browser**:
```bash
npx playwright test --project=chromium
```

3. **Skip slow tests**:
```bash
npx playwright test --grep-invert "@slow"
```

---

### Issue 8: Database Connection Issues

**Symptom**: Tests fail with database errors

**Solution**:

1. **Check Supabase connection**:
```bash
# Verify .env file has correct credentials
cat .env | grep SUPABASE
```

2. **Check database is running**:
```bash
# For local Supabase
supabase status
```

3. **Seed test data**:
```bash
npm run db:seed:test
```

---

### Issue 9: Authentication Failures

**Symptom**: Tests fail at login step

**Solution**:

1. **Verify test user exists**:
```sql
SELECT * FROM auth.users WHERE email = 'test@example.com';
```

2. **Create test user**:
```bash
# Use Supabase CLI or dashboard to create test user
```

3. **Check credentials in test**:
```typescript
// In test file
await login(page, 'test@example.com', 'correct-password');
```

---

### Issue 10: Flaky Tests

**Symptom**: Tests pass sometimes, fail other times

**Solution**:

1. **Add proper wait conditions**:
```typescript
// Bad
await page.click('[data-testid="button"]');

// Good
await page.waitForSelector('[data-testid="button"]', { state: 'visible' });
await page.click('[data-testid="button"]');
```

2. **Increase timeouts**:
```typescript
await page.waitForSelector('[data-testid="element"]', { 
  timeout: 10000 
});
```

3. **Use retry logic**:
```typescript
test.describe.configure({ retries: 2 });
```

---

## Verification Steps

After resolving issues, verify your setup:

### 1. Check Playwright Installation

```bash
npx playwright --version
```

Expected output: `Version 1.40.0` (or similar)

### 2. Check Browsers

```bash
npx playwright install --dry-run
```

Should show all browsers are installed.

### 3. Run Simple Test

```bash
# Create a simple test
cat > test-simple.spec.ts << 'EOF'
import { test, expect } from '@playwright/test';

test('basic test', async ({ page }) => {
  await page.goto('https://playwright.dev/');
  await expect(page).toHaveTitle(/Playwright/);
});
EOF

# Run it
npx playwright test test-simple.spec.ts

# Clean up
rm test-simple.spec.ts
```

### 4. Check Application

```bash
# Start dev server
npm run dev

# In another terminal, check it's running
curl http://localhost:5173
```

### 5. Run One Test

```bash
# Run a single test to verify everything works
npx playwright test e2e/song-library/complete-workflows.spec.ts -g "should complete full search workflow"
```

---

## Platform-Specific Notes

### Windows (Native)

- Use PowerShell or Command Prompt
- No system dependencies needed
- Browsers install automatically

### macOS

```bash
# Install Xcode Command Line Tools if needed
xcode-select --install

# Install Playwright
npx playwright install --with-deps
```

### Linux (Ubuntu/Debian)

```bash
# Install dependencies
sudo npx playwright install-deps

# Or manually
sudo apt-get update
sudo apt-get install -y \
  libasound2t64 \
  libatk-bridge2.0-0 \
  # ... (see Option B above)
```

### WSL (Windows Subsystem for Linux)

**Option 1**: Install dependencies in WSL
```bash
sudo npx playwright install-deps
```

**Option 2**: Run tests on Windows host
```powershell
# In Windows PowerShell
cd C:\Users\ADMIN\vestry-hub
npm run test:e2e
```

**Option 3**: Use Docker
```bash
docker run --rm -v $(pwd):/work -w /work \
  mcr.microsoft.com/playwright:v1.40.0-focal \
  npm run test:e2e
```

---

## Getting Help

### Debug Information to Collect

When asking for help, provide:

1. **System information**:
```bash
uname -a
node --version
npm --version
npx playwright --version
```

2. **Error message**: Full error output

3. **Test command**: Exact command you ran

4. **Environment**: OS, Node version, WSL/Docker/Native

### Resources

- [Playwright Documentation](https://playwright.dev/)
- [Playwright Discord](https://discord.com/invite/playwright-807756831384403968)
- [GitHub Issues](https://github.com/microsoft/playwright/issues)
- Project README: `e2e/song-library/README.md`

---

## Quick Reference

### Most Common Solutions

```bash
# 1. Install system dependencies (Linux)
sudo npx playwright install-deps

# 2. Install browsers
npx playwright install

# 3. Start dev server
npm run dev

# 4. Run tests (in another terminal)
npm run test:e2e

# 5. View report
npm run test:e2e:report
```

### Environment Variables

Create `.env.test`:

```env
BASE_URL=http://localhost:5173
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=password123
SKIP_ANALYTICS=true
TEST_MODE=true
```

### Minimal Test Run

```bash
# Run just one test on one browser
npx playwright test \
  e2e/song-library/complete-workflows.spec.ts \
  --project=chromium \
  -g "should complete full search workflow"
```

---

## Success Checklist

- [ ] Node.js 18+ installed
- [ ] npm dependencies installed (`npm install`)
- [ ] Playwright browsers installed (`npx playwright install`)
- [ ] System dependencies installed (Linux: `sudo npx playwright install-deps`)
- [ ] Dev server running (`npm run dev`)
- [ ] Test user exists in database
- [ ] Test data seeded
- [ ] Simple test passes
- [ ] Full test suite runs

Once all items are checked, you're ready to run the full test suite! 🚀
