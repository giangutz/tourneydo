# TourneyDo - Comprehensive End-to-End Test Suite

## 🧪 **Manual Testing Checklist**

Run these tests in order to verify all functionality is working correctly.

---

## 🔧 **Pre-Test Setup**

### 1. Environment Verification
```bash
# Verify environment variables
echo $SUPABASE_SERVICE_ROLE_KEY  # Should be set
echo $NEXT_PUBLIC_SUPABASE_URL   # Should be set
echo $NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY  # Should be set

# Start the application
npm run dev
```

### 2. Database Setup
```sql
-- Run in Supabase SQL Editor
-- Verify tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public';

-- Should see: profiles, teams, tournaments, member_invitations, etc.
```

---

## 📋 **Test Scenarios**

### **TEST 1: New User Registration & Profile Setup**

**Objective**: Verify complete user onboarding flow

**Steps**:
1. Open browser in incognito mode
2. Navigate to `http://localhost:3000`
3. Click "Sign In" → "Sign Up"
4. Create new account with email: `test-organizer@example.com`
5. Complete email verification
6. Sign in with new credentials

**Expected**: Should redirect to `/auth/complete-profile`

**Profile Completion Steps**:
1. **Step 1 - Role Selection**:
   - Select "Organizer" role only
   - Click "Next"

2. **Step 2 - Organization Info**:
   - Organization: "Test Taekwondo Academy"
   - Phone: "+1234567890"
   - Click "Next"

3. **Step 3 - Contact & Bio**:
   - Contact Email: Use same as account email
   - Bio: "Test organizer profile"
   - Click "Complete Setup"

**Expected Results**:
- ✅ Form validates all required fields
- ✅ User's actual name appears (not "User")
- ✅ Single role selection redirects directly to dashboard
- ✅ Dashboard loads with organizer-specific navigation
- ✅ No redirect loop occurs

---

### **TEST 2: Multi-Role User Setup**

**Objective**: Test multi-role user flow

**Steps**:
1. Create new account: `test-multi@example.com`
2. Complete profile with **multiple roles**:
   - Select: "Organizer" AND "Coach"
   - Fill organization info
   - Complete setup

**Expected Results**:
- ✅ Redirects to `/auth/select-role` (not dashboard)
- ✅ Role selection page shows both roles
- ✅ Can select either role
- ✅ Dashboard loads based on selected role
- ✅ Role switcher appears in sidebar

---

### **TEST 3: Role Switching**

**Objective**: Verify role switching works for multi-role users

**Steps**:
1. Sign in as multi-role user from Test 2
2. Navigate to dashboard
3. Look for role switcher in sidebar
4. Click role switcher dropdown
5. Select different role
6. Verify dashboard updates

**Expected Results**:
- ✅ Role switcher visible for multi-role users
- ✅ Can switch between available roles
- ✅ Dashboard navigation updates per role
- ✅ Current role indicator shows correctly

---

### **TEST 4: Member Invitation System**

**Objective**: Test comprehensive member invite functionality

**Steps**:
1. Sign in as organizer
2. Navigate to "Members" section
3. Click "Invite Member"
4. Fill invitation form:
   - Email: `invited-coach@example.com`
   - Role: "Coach"
   - Message: "Welcome to our team!"
5. Send invitation

**Expected Results**:
- ✅ Invite modal opens correctly
- ✅ Form validation works
- ✅ Invitation sent successfully
- ✅ Appears in "Pending Invitations" list
- ✅ Check server logs for email sending

**Invitation Acceptance**:
1. Create new account with `invited-coach@example.com`
2. Complete profile (should auto-assign to organization)
3. Verify appears in members list

---

### **TEST 5: Dashboard Navigation & Permissions**

**Objective**: Verify role-based access control

**Test Each Role**:

**Organizer Dashboard**:
- ✅ Can access: Tournaments, Members, Reports, Settings
- ✅ Can create tournaments
- ✅ Can invite members
- ✅ Can view all organization data

**Coach Dashboard**:
- ✅ Can access: Athletes, Teams, Tournament Registration
- ✅ Cannot access: Member management, Organization settings
- ✅ Can register athletes for tournaments

**Athlete Dashboard**:
- ✅ Can access: Profile, Registrations, Results
- ✅ Cannot access: Management features
- ✅ Can view own tournament history

---

### **TEST 6: Responsive Design & Mobile**

**Objective**: Verify mobile responsiveness

**Desktop Testing** (1920x1080):
- ✅ All elements properly spaced
- ✅ Navigation sidebar works
- ✅ Forms are well-laid out
- ✅ Tables display correctly

**Tablet Testing** (768x1024):
- ✅ Responsive navigation
- ✅ Forms stack properly
- ✅ Touch targets adequate size

**Mobile Testing** (375x667):
- ✅ Mobile-friendly navigation
- ✅ Forms are usable
- ✅ Buttons have proper spacing (min 44px)
- ✅ Text is readable without zooming

---

### **TEST 7: Tournament Management**

**Objective**: Test tournament creation and management

**Steps**:
1. Sign in as organizer
2. Navigate to "Tournaments"
3. Click "Create Tournament"
4. Fill tournament form:
   - Name: "Test Championship 2024"
   - Date: Future date
   - Venue: "Test Venue"
   - Registration deadline: Before event date
5. Save tournament

**Expected Results**:
- ✅ Tournament creation form loads
- ✅ Form validation works
- ✅ Tournament saves successfully
- ✅ Redirects to tournament details
- ✅ Tournament appears in tournaments list

---

### **TEST 8: Error Handling & Edge Cases**

**Objective**: Test error scenarios

**Test Cases**:

**Invalid Profile Data**:
- Try submitting empty required fields
- ✅ Proper validation messages shown
- ✅ Form doesn't submit with invalid data

**Network Errors**:
- Disconnect internet during form submission
- ✅ Proper error messages displayed
- ✅ Loading states work correctly

**Duplicate Invitations**:
- Try inviting same email twice
- ✅ Error message about duplicate invitation

**Expired Sessions**:
- Let session expire, try to access protected route
- ✅ Redirects to sign-in page

---

## 🤖 **Automated Test Scripts**

### Playwright E2E Test

Create `tests/e2e/complete-flow.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

test.describe('TourneyDo Complete Flow', () => {
  test('complete user onboarding flow', async ({ page }) => {
    // Navigate to app
    await page.goto('http://localhost:3000');
    
    // Sign up flow
    await page.click('text=Sign In');
    await page.click('text=Sign up');
    
    // Fill registration form
    await page.fill('[name="emailAddress"]', 'e2e-test@example.com');
    await page.fill('[name="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
    
    // Wait for email verification (skip in test)
    // In real test, you'd need to handle email verification
    
    // Profile completion
    await expect(page).toHaveURL(/.*complete-profile/);
    
    // Step 1: Role selection
    await page.check('[value="organizer"]');
    await page.click('button:has-text("Next")');
    
    // Step 2: Organization info
    await page.fill('[name="organization"]', 'E2E Test Academy');
    await page.fill('[name="phone"]', '+1234567890');
    await page.click('button:has-text("Next")');
    
    // Step 3: Contact & Bio
    await page.fill('[name="contactEmail"]', 'e2e-test@example.com');
    await page.fill('[name="bio"]', 'E2E test user');
    await page.click('button:has-text("Complete Setup")');
    
    // Should redirect to dashboard
    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.locator('h1')).toContainText('Dashboard');
    
    // Verify organizer navigation
    await expect(page.locator('text=Tournaments')).toBeVisible();
    await expect(page.locator('text=Members')).toBeVisible();
  });

  test('multi-role user flow', async ({ page }) => {
    // Similar setup but select multiple roles
    await page.goto('http://localhost:3000/auth/complete-profile');
    
    // Select multiple roles
    await page.check('[value="organizer"]');
    await page.check('[value="coach"]');
    await page.click('button:has-text("Next")');
    
    // Complete remaining steps...
    // Should redirect to role selection
    await expect(page).toHaveURL(/.*select-role/);
    
    // Select a role
    await page.click('text=Tournament Organizer');
    await page.click('button:has-text("Continue as")');
    
    // Should reach dashboard
    await expect(page).toHaveURL(/.*dashboard/);
  });

  test('member invitation flow', async ({ page }) => {
    // Sign in as organizer
    await page.goto('http://localhost:3000/dashboard/members');
    
    // Open invite modal
    await page.click('button:has-text("Invite Member")');
    
    // Fill invitation form
    await page.fill('[name="email"]', 'invited@example.com');
    await page.selectOption('[name="role"]', 'coach');
    await page.fill('[name="message"]', 'Welcome to the team!');
    
    // Send invitation
    await page.click('button:has-text("Send Invitation")');
    
    // Verify success
    await expect(page.locator('text=Invitation sent')).toBeVisible();
    await expect(page.locator('text=invited@example.com')).toBeVisible();
  });
});
```

### API Testing Script

Create `tests/api/profile-creation.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

test.describe('Profile API Tests', () => {
  test('profile creation API', async ({ request }) => {
    const response = await request.post('/api/profiles/create', {
      data: {
        roles: ['organizer'],
        organization: 'API Test Org',
        phone: '+1234567890',
        contactEmail: 'api-test@example.com',
        bio: 'API test profile'
      },
      headers: {
        'Authorization': 'Bearer test-token'
      }
    });
    
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.redirectTo).toBe('/dashboard');
  });

  test('member invitation API', async ({ request }) => {
    const response = await request.post('/api/members/invite', {
      data: {
        email: 'api-invite@example.com',
        role: 'coach',
        organizationId: 'test-org-id'
      }
    });
    
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.success).toBe(true);
  });
});
```

---

## 🔍 **Performance Testing**

### Load Testing Script

```bash
# Install artillery for load testing
npm install -g artillery

# Create artillery config
cat > load-test.yml << EOF
config:
  target: 'http://localhost:3000'
  phases:
    - duration: 60
      arrivalRate: 10
scenarios:
  - name: "Dashboard Load"
    requests:
      - get:
          url: "/dashboard"
EOF

# Run load test
artillery run load-test.yml
```

---

## 📊 **Test Results Checklist**

### ✅ **Authentication & Onboarding**
- [ ] New user registration works
- [ ] Email verification process
- [ ] Profile completion (single role)
- [ ] Profile completion (multi-role)
- [ ] Role selection page
- [ ] Dashboard redirect after completion
- [ ] No redirect loops

### ✅ **Role Management**
- [ ] Single role users go directly to dashboard
- [ ] Multi-role users see role selection
- [ ] Role switcher appears for multi-role users
- [ ] Role switching updates dashboard
- [ ] Proper role-based navigation

### ✅ **Member Management**
- [ ] Invite member modal works
- [ ] Email invitations sent
- [ ] Pending invitations displayed
- [ ] Invitation acceptance flow
- [ ] Member search and filtering
- [ ] Member activation/deactivation

### ✅ **UI/UX & Responsiveness**
- [ ] Desktop layout (1920x1080)
- [ ] Tablet layout (768x1024)
- [ ] Mobile layout (375x667)
- [ ] Touch targets minimum 44px
- [ ] Proper spacing and padding
- [ ] Loading states work
- [ ] Error states display correctly

### ✅ **Tournament Management**
- [ ] Tournament creation form
- [ ] Tournament listing
- [ ] Tournament details view
- [ ] Registration functionality
- [ ] Results management

### ✅ **Security & Permissions**
- [ ] Role-based access control
- [ ] Protected routes require auth
- [ ] Users can only access permitted features
- [ ] Data isolation between organizations
- [ ] Proper error handling for unauthorized access

---

## 🚀 **Running the Tests**

### Manual Testing
1. Follow each test scenario step-by-step
2. Check off completed items
3. Document any issues found
4. Verify fixes and re-test

### Automated Testing
```bash
# Install Playwright
npm install -D @playwright/test

# Run E2E tests
npx playwright test

# Run with UI
npx playwright test --ui

# Run specific test
npx playwright test complete-flow.spec.ts
```

### Performance Testing
```bash
# Run load tests
artillery run load-test.yml

# Monitor during tests
npm run dev
# Check browser dev tools for performance metrics
```

---

## 📋 **Test Report Template**

### Test Execution Summary
- **Date**: ___________
- **Tester**: ___________
- **Environment**: ___________
- **Browser**: ___________

### Results
- **Total Tests**: 8 scenarios
- **Passed**: ___/8
- **Failed**: ___/8
- **Blocked**: ___/8

### Issues Found
1. **Issue**: ___________
   - **Severity**: High/Medium/Low
   - **Steps to Reproduce**: ___________
   - **Expected**: ___________
   - **Actual**: ___________

### Performance Metrics
- **Page Load Time**: ___ seconds
- **Time to Interactive**: ___ seconds
- **Largest Contentful Paint**: ___ seconds

### Recommendations
1. ___________
2. ___________

---

## 🎯 **Success Criteria**

**All tests must pass with:**
- ✅ No redirect loops in authentication flow
- ✅ Proper role-based access control
- ✅ Responsive design on all devices
- ✅ Member invitation system working
- ✅ Tournament management functional
- ✅ Performance under acceptable limits
- ✅ No critical security vulnerabilities

**Ready for Production when all criteria met!**
