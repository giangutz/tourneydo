# Tourneydo Authentication & Onboarding Tests

This directory contains end-to-end tests for the Tourneydo authentication and onboarding flow using Puppeteer.

## Test Coverage

### 🔐 Authentication Pages
- **Sign-in page**: Enhanced UI, branding, form styling
- **Sign-up page**: Enhanced UI, branding, form styling
- **Responsive design**: Mobile-friendly layouts

### 🎯 Onboarding Flow
- **Access control**: Redirects unauthenticated users
- **Form validation**: Required field validation
- **Organization types**: Support for different org types
- **Role-based redirects**: Different dashboards based on org type

### 🎨 UI/UX Enhancements
- **Consistent branding**: Tourneydo logo and colors
- **Enhanced styling**: Gradients, shadows, animations
- **Professional appearance**: Taekwondo tournament theme

## Running Tests

### Prerequisites
1. Development server must be running: `npm run dev`
2. Application accessible at `http://localhost:3000`
3. Testing dependencies installed (automatic with test commands)

### Run All Tests
```bash
npm test
```
*Automatically installs testing dependencies if needed*

### Run Authentication Tests Only
```bash
npm run test:auth
```
*Automatically installs testing dependencies if needed*

### Manual Testing Dependency Installation
```bash
npm run test:install
```

### Run Specific Test File
```bash
npm run test:install && npx jest tests/auth-onboarding.test.js
```

## Test Configuration

### Puppeteer Settings
- **Headless mode**: Set to `false` for debugging, `true` for CI/CD
- **Slow motion**: 100ms delay between actions for better debugging
- **Viewport**: 1280x720 (desktop testing)

### Jest Configuration
- **Test environment**: Node.js
- **Timeout**: 30 seconds for Puppeteer operations
- **Coverage**: Collects coverage from app components

## Test Structure

```
tests/
├── auth-onboarding.test.js    # Main test suite
└── README.md                  # This file
```

## Test Suites

### 1. Sign-in Page Tests
- ✅ Page loads with enhanced UI
- ✅ Tourneydo branding present
- ✅ Form styling and layout
- ✅ Responsive design

### 2. Sign-up Page Tests
- ✅ Page loads with enhanced UI
- ✅ Tourneydo branding present
- ✅ Form styling and layout
- ✅ Redirect flow verification

### 3. Onboarding Flow Tests
- ✅ Access control (redirects unauthenticated users)
- ✅ Form validation (required fields)
- ✅ Organization type selection
- ✅ Submit button functionality

### 4. Complete Flow Tests
- ✅ Home page redirects
- ✅ Sign-in/sign-up page access
- ✅ Onboarding access control
- ✅ Flow consistency

### 5. UI/UX Tests
- ✅ Consistent branding across pages
- ✅ Gradient backgrounds and styling
- ✅ Responsive container layouts

## Notes

### Authentication Testing
- Tests verify UI structure but don't perform actual authentication
- Clerk authentication would require test credentials and API keys
- Manual testing recommended for full authentication flow

### Onboarding Testing
- Tests verify form structure and validation
- Server action testing requires authenticated sessions
- Manual testing recommended for complete onboarding flow

### CI/CD Considerations
- Set `headless: true` in Puppeteer config for CI/CD
- Increase timeouts for slower CI environments
- Use test-specific Clerk credentials if needed

## Manual Testing Checklist

For comprehensive testing beyond automated tests:

### Authentication Flow
- [ ] Sign-in page loads correctly
- [ ] Sign-up page loads correctly
- [ ] Clerk authentication works
- [ ] Redirect to onboarding after sign-up

### Onboarding Flow
- [ ] Onboarding form displays correctly
- [ ] Form validation works
- [ ] Organization details save correctly
- [ ] Redirect to appropriate dashboard
- [ ] Completed users bypass onboarding

### Dashboard Access
- [ ] Tournament organizers → `/dashboard/tournaments`
- [ ] Federations → `/dashboard/tournaments`
- [ ] Other orgs → `/dashboard/athletes`
- [ ] Future logins skip onboarding

## Troubleshooting

### Common Issues
1. **Tests timeout**: Increase `testTimeout` in jest.config.js
2. **Page not found**: Ensure dev server is running on port 3000
3. **Element not found**: Check if selectors match current UI
4. **Authentication required**: Some tests expect authenticated state

### Debug Mode
Set `headless: false` in test file to see browser actions:
```javascript
browser = await puppeteer.launch({
  headless: false, // Set to true for CI/CD
  slowMo: 100,
});
