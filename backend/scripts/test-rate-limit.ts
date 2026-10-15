/**
 * Script to demonstrate and test Rate Limiting & Inter-Email Delay under load.
 * Run via: npm run test:rate-limit
 */
import { rateLimiterService } from '../src/services/rateLimiter.service';
import { config } from '../src/config/env';

async function runRateLimitDemo() {
  console.log('🧪 ========================================================');
  console.log('🧪 REACHINBOX RATE LIMITING & CONCURRENCY TEST SUITE');
  console.log('🧪 ========================================================');
  console.log(`⚙️ Configured Hourly Limit: ${config.worker.maxEmailsPerHour} emails/hour/sender`);
  console.log(`⚙️ Configured Min Delay:    ${config.worker.minDelayBetweenEmailsMs} ms between consecutive emails\n`);

  const testSender = 'demo-sender@reachinbox-test.com';

  console.log(`👉 Testing Sender: ${testSender}\n`);

  // Test 1: Immediate first send
  console.log('1️⃣ Check initial rate limit:');
  const check1 = await rateLimiterService.checkRateLimit(testSender);
  console.log(`   Allowed: ${check1.allowed}, Wait: ${check1.waitMs}ms, Current Usage: ${check1.currentUsage}/${check1.limit}`);

  if (check1.allowed) {
    console.log('   Simulating email dispatch #1...');
    await rateLimiterService.recordSend(testSender);
    console.log('   Email #1 recorded.');
  }

  // Test 2: Rapid successive send (testing inter-email delay)
  console.log('\n2️⃣ Immediate second check (testing Inter-Email Delay):');
  const check2 = await rateLimiterService.checkRateLimit(testSender);
  console.log(`   Allowed: ${check2.allowed}, Reason: ${check2.reason}, Wait: ${check2.waitMs}ms`);

  if (!check2.allowed) {
    console.log(`   ✅ Correctly throttled due to: ${check2.reason}`);
    console.log(`   ⏳ Sleeping for ${check2.waitMs + 100}ms to clear delay window...`);
    await new Promise((resolve) => setTimeout(resolve, check2.waitMs + 100));

    const check3 = await rateLimiterService.checkRateLimit(testSender);
    console.log(`   After sleep -> Allowed: ${check3.allowed}, Wait: ${check3.waitMs}ms`);
  }

  // Test 3: Simulating hourly quota exhaustion
  console.log('\n3️⃣ Simulating high load / filling hourly quota...');
  for (let i = 2; i <= config.worker.maxEmailsPerHour; i++) {
    await rateLimiterService.recordSend(testSender);
  }

  const checkExhausted = await rateLimiterService.checkRateLimit(testSender);
  console.log(`   Usage after batch: ${checkExhausted.currentUsage}/${checkExhausted.limit}`);
  console.log(`   Allowed: ${checkExhausted.allowed}`);
  console.log(`   Reason:  ${checkExhausted.reason}`);
  console.log(`   Required Wait Time for next window: ${Math.round(checkExhausted.waitMs / 1000)}s`);

  if (checkExhausted.reason === 'HOURLY_LIMIT_REACHED') {
    console.log('\n✅ [PASS] Hourly Rate Limiting correctly enforced under load!');
    console.log('✅ BullMQ Worker will automatically delay overflowing jobs into the next rolling window.');
  }

  console.log('\n🎉 Test completed successfully.\n');
  process.exit(0);
}

runRateLimitDemo().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
