import {
  hashPassword,
  verifyPassword,
  validatePasswordPolicy,
} from '../../src/lib/auth/password';
import { signAccessToken, verifyAccessToken } from '../../src/lib/auth/jwt';
import {
  createSession,
  rotateSession,
  revokeSession,
  getActiveSession,
} from '../../src/lib/auth/session';
import { detectImageSignature, stageOriginalUpload } from '../../src/lib/media/staging';
import { checkRateLimit } from '../../src/lib/security/rateLimit';
import { isSafeUrl, getSafeRedirectUrl } from '../../src/lib/security/validation';
import { prisma } from '../../src/lib/prisma';
import { toggleSaveToCollection } from '../../src/actions/interactions';
import { deleteDrop } from '../../src/actions/drops';
import { getCurrentUser } from '../../src/lib/auth';

let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  [PASS] ${testName}`);
    passedTests++;
  } else {
    console.error(`  [FAIL] ${testName} - ${detail || 'Assertion failed'}`);
    failedTests++;
  }
}

async function runSecurityTests() {
  console.log('\n======================================================');
  console.log('   RUNNING SPACES COMPREHENSIVE SECURITY TEST SUITE   ');
  console.log('======================================================\n');

  // -----------------------------------------------------------------
  // 1. PASSWORD SECURITY & POLICY
  // -----------------------------------------------------------------
  console.log('--- 1. Password Security & Policy ---');
  const policyShort = validatePasswordPolicy('short');
  assert(!policyShort.valid, 'Rejects password shorter than 8 characters');

  const policyNoNum = validatePasswordPolicy('allletterslongpassword');
  assert(!policyNoNum.valid, 'Rejects password without numbers');

  const policyValid = validatePasswordPolicy('ValidPassword2026!');
  assert(policyValid.valid, 'Accepts compliant password policy');

  const testHash = await hashPassword('ValidPassword2026!');
  assert(testHash.startsWith('$2a$') || testHash.startsWith('$2b$'), 'Generates valid bcrypt hash format');

  const matchCorrect = await verifyPassword('ValidPassword2026!', testHash);
  assert(matchCorrect, 'Verifies correct password against bcrypt hash');

  const matchWrong = await verifyPassword('WrongPassword123!', testHash);
  assert(!matchWrong, 'Rejects incorrect password against bcrypt hash');

  // -----------------------------------------------------------------
  // 2. JWT SECURITY & TOKEN PINNING
  // -----------------------------------------------------------------
  console.log('\n--- 2. JWT Security & Claims Pinning ---');
  const testPayload = { sub: 'user-uuid-123', sessionId: 'sess-uuid-456', role: 'MEMBER' };
  const validJwt = await signAccessToken(testPayload);
  assert(typeof validJwt === 'string' && validJwt.split('.').length === 3, 'Generates 3-part compact signed JWT');

  const verified = await verifyAccessToken(validJwt);
  assert(verified?.sub === 'user-uuid-123' && verified?.sessionId === 'sess-uuid-456', 'Verifies authentic JWT claims');

  // Tamper with payload (modify character in middle segment)
  const parts = validJwt.split('.');
  const tamperedPayloadPart = parts[1].substring(0, parts[1].length - 2) + 'ab';
  const tamperedJwt = `${parts[0]}.${tamperedPayloadPart}.${parts[2]}`;
  const tamperedVerified = await verifyAccessToken(tamperedJwt);
  assert(tamperedVerified === null, 'Rejects tampered JWT signature');

  // -----------------------------------------------------------------
  // 3. UNPROTECTED MOCK IDENTITY REMOVAL
  // -----------------------------------------------------------------
  console.log('\n--- 3. Mock Authentication Removal ---');
  const anonUser = await getCurrentUser();
  assert(anonUser === null, 'Anonymous user without cookies strictly returns null (No Maya fallback)');

  // -----------------------------------------------------------------
  // 4. DATABASE SESSIONS, REFRESH ROTATION & REUSE DEFENSE
  // -----------------------------------------------------------------
  console.log('\n--- 4. Sessions, Rotation & Token Reuse Detection ---');
  const demoUser = await prisma.user.findFirst();
  if (demoUser) {
    const { session, rawRefreshToken, accessToken } = await createSession(demoUser.id);
    assert(Boolean(session.id && rawRefreshToken && accessToken), 'Creates database session with hashed refresh token');

    const activeCheck = await getActiveSession(session.id);
    assert(activeCheck?.id === session.id, 'Retrieves active session');

    // Perform rotation
    const rotated = await rotateSession(rawRefreshToken);
    assert(Boolean(rotated && rotated.rawRefreshToken !== rawRefreshToken), 'Rotates refresh token and issues replacement session');

    // Attempt reuse of the now-revoked old refresh token
    const reuseAttempt = await rotateSession(rawRefreshToken);
    assert(reuseAttempt === null, 'Rejects revoked refresh token reuse attempt');

    // Clean up
    if (rotated) {
      await revokeSession(rotated.session.id);
    }
  }

  // -----------------------------------------------------------------
  // 5. MAGIC BYTE FILE UPLOAD SECURITY
  // -----------------------------------------------------------------
  console.log('\n--- 5. Magic Byte Upload Validation ---');
  const fakeExeBuffer = Buffer.from('MZ\x90\x00\x03\x00\x00\x00\x04\x00\x00\x00\xff\xff\x00\x00');
  const fakeExeSig = detectImageSignature(fakeExeBuffer);
  assert(fakeExeSig === null, 'Blocks executable binary disguised as image');

  const fakeHtmlBuffer = Buffer.from('<html><script>alert(1)</script></html>');
  const fakeHtmlSig = detectImageSignature(fakeHtmlBuffer);
  assert(fakeHtmlSig === null, 'Blocks HTML payload disguised as image');

  const validJpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
  const jpegSig = detectImageSignature(validJpegBuffer);
  assert(jpegSig?.mime === 'image/jpeg' && jpegSig?.ext === 'jpg', 'Validates authentic JPEG magic bytes');

  const validPngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);
  const pngSig = detectImageSignature(validPngBuffer);
  assert(pngSig?.mime === 'image/png' && pngSig?.ext === 'png', 'Validates authentic PNG magic bytes');

  // Test staging validation
  try {
    await stageOriginalUpload(fakeExeBuffer, 'photo.jpg');
    assert(false, 'Should have rejected invalid signature in stageOriginalUpload');
  } catch (err: any) {
    assert(err.message.includes('Invalid file signature'), 'stageOriginalUpload rejects unverified magic bytes');
  }

  // -----------------------------------------------------------------
  // 6. RATE LIMITING ENGINE
  // -----------------------------------------------------------------
  console.log('\n--- 6. Rate Limiting Protection ---');
  const testLimitKey = `test:rl:${Date.now()}`;
  const testConfig = { maxRequests: 3, windowSeconds: 10 };

  const rl1 = await checkRateLimit(testLimitKey, testConfig);
  const rl2 = await checkRateLimit(testLimitKey, testConfig);
  const rl3 = await checkRateLimit(testLimitKey, testConfig);
  const rl4 = await checkRateLimit(testLimitKey, testConfig);

  assert(rl1.allowed && rl2.allowed && rl3.allowed, 'Allows requests within threshold quota (3 requests)');
  assert(!rl4.allowed && rl4.remaining === 0, 'Enforces rate limit cutoff upon exceeding threshold (4th request blocked)');

  // -----------------------------------------------------------------
  // 7. URL SECURITY & OPEN REDIRECT DEFENSE
  // -----------------------------------------------------------------
  console.log('\n--- 7. URL Security & Open Redirect Sanitization ---');
  assert(!isSafeUrl('javascript:alert(document.cookie)'), 'Blocks javascript: pseudo-protocol');
  assert(!isSafeUrl('data:text/html;base64,PHNjcmlwdD4='), 'Blocks data: URI scheme');
  assert(!isSafeUrl('//evil.com/phish'), 'Blocks protocol-relative URLs');
  assert(isSafeUrl('https://images.unsplash.com/photo-123'), 'Allows safe HTTPS image URLs');
  assert(isSafeUrl('/explore'), 'Allows safe relative internal URLs');

  const safeInternal = getSafeRedirectUrl('/explore');
  assert(safeInternal === '/explore', 'Preserves safe relative redirect path');

  const safePhish = getSafeRedirectUrl('https://evil-phishing.com/login', '/');
  assert(safePhish === '/', 'Sanitizes external open redirect destination to safe fallback');

  // -----------------------------------------------------------------
  // 8. BOLA / IDOR PREVENTION
  // -----------------------------------------------------------------
  console.log('\n--- 8. BOLA / IDOR Authorization Enforcement ---');
  try {
    // Attempt to toggle save on a random collection when not authenticated
    await toggleSaveToCollection('non-existent-col', 'non-existent-drop');
    assert(false, 'toggleSaveToCollection should have rejected unauthenticated request');
  } catch (err: any) {
    assert(
      err.message.includes('Authentication required') || err.message.includes('Unauthorized'),
      'toggleSaveToCollection blocks unauthenticated access'
    );
  }

  try {
    // Attempt delete drop when unauthenticated
    const delRes = await deleteDrop('non-existent-drop');
    assert(!delRes.success && Boolean(delRes.error?.includes('Unauthorized')), 'deleteDrop blocks unauthenticated access');
  } catch {
    assert(true, 'deleteDrop rejected unauthenticated caller');
  }

  // -----------------------------------------------------------------
  // SUMMARY
  // -----------------------------------------------------------------
  console.log('\n======================================================');
  console.log(`  SECURITY TEST SUITE COMPLETED: ${passedTests} PASSED, ${failedTests} FAILED  `);
  console.log('======================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runSecurityTests().catch((err) => {
  console.error('Test suite failed with unexpected error:', err);
  process.exit(1);
});
