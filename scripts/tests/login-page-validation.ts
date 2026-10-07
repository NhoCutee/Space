import { loginAction } from '../../src/actions/auth';
import { LoginInputSchema, getSafeRedirectUrl } from '../../src/lib/security/validation';
import { prisma } from '../../src/lib/prisma';
import { hashPassword } from '../../src/lib/auth/password';

let passed = 0;
let failed = 0;

function assert(condition: boolean, title: string, detail?: string) {
  if (condition) {
    console.log(`  [PASS] ${title}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${title} - ${detail || 'Assertion failed'}`);
    failed++;
  }
}

async function runLoginValidationTests() {
  console.log('\n======================================================');
  console.log('      RUNNING LOGIN PAGE & INTEGRATION TEST SUITE      ');
  console.log('======================================================\n');

  // 1. Zod Schema Validation
  console.log('--- 1. Login Input Schema Validation ---');
  const validSchema = LoginInputSchema.safeParse({
    identifier: 'maya_curates',
    password: 'SpacesPassword2026!',
  });
  assert(validSchema.success, 'Valid identifier and password pass schema');

  const emptySchema = LoginInputSchema.safeParse({
    identifier: '',
    password: '',
  });
  assert(!emptySchema.success, 'Empty identifier and password fail schema');

  const tooLongSchema = LoginInputSchema.safeParse({
    identifier: 'a'.repeat(101),
    password: 'p'.repeat(129),
  });
  assert(!tooLongSchema.success, 'Excessively long inputs fail schema boundaries');

  // 2. Open Redirect Defense for Login Redirects
  console.log('--- 2. Redirect Parameter Sanitization ---');
  assert(
    getSafeRedirectUrl('https://evil-phishing.com/login', '/') === '/',
    'External phishing URL sanitized to fallback'
  );
  assert(
    getSafeRedirectUrl('//evil.com', '/') === '/',
    'Protocol-relative URL sanitized to fallback'
  );
  assert(
    getSafeRedirectUrl('javascript:alert(1)', '/') === '/',
    'Javascript pseudo-protocol sanitized to fallback'
  );
  assert(
    getSafeRedirectUrl('/s/saigon-film', '/') === '/s/saigon-film',
    'Legitimate internal space redirect preserved'
  );
  assert(
    getSafeRedirectUrl('/explore', '/') === '/explore',
    'Legitimate internal explore redirect preserved'
  );

  // 3. User Seed / Verification for Maya Curates
  console.log('--- 3. Credentials & Rate Limiting ---');
  let testUser = await prisma.user.findUnique({
    where: { username: 'maya_curates' },
  });

  if (!testUser) {
    const passwordHash = await hashPassword('SpacesPassword2026!');
    testUser = await prisma.user.create({
      data: {
        username: 'maya_curates',
        displayName: 'Maya Lin',
        email: 'maya@spaces.gallery',
        passwordHash,
        bio: 'Architecture curator & spatial photographer',
        role: 'CURATOR',
      },
    });
  } else if (!testUser.passwordHash) {
    const passwordHash = await hashPassword('SpacesPassword2026!');
    testUser = await prisma.user.update({
      where: { id: testUser.id },
      data: { passwordHash },
    });
  }

  // Test invalid login credentials
  const invalidRes = await loginAction('maya_curates', 'WrongPassword123!');
  assert(!invalidRes.success, 'Rejects invalid password with failure response');
  assert(
    invalidRes.error === 'Invalid credentials',
    'Returns generic error message without enumerating accounts'
  );

  // Test valid login credentials
  const validRes = await loginAction('maya_curates', 'SpacesPassword2026!');
  assert(validRes.success, 'Authenticates successfully with valid credentials');
  assert(validRes.user?.username === 'maya_curates', 'Returns authenticated user profile');

  // Test rate limit enforcement on repeated brute force attempts
  console.log('--- 4. Brute Force Protection on Login ---');
  const bruteIdentifier = `brute_test_${Date.now()}`;
  let wasRateLimited = false;
  for (let i = 0; i < 7; i++) {
    const res = await loginAction(bruteIdentifier, 'wrong_pass');
    if (!res.success && res.error && res.error.includes('Too many login attempts')) {
      wasRateLimited = true;
      break;
    }
  }
  assert(wasRateLimited, 'Rate limit cuts off repeated login brute-force attempts');

  console.log('\n======================================================');
  console.log(`  LOGIN TESTS COMPLETED: ${passed} PASSED, ${failed} FAILED  `);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runLoginValidationTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
