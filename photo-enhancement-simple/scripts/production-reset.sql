-- ⚠️  PRODUCTION DATABASE RESET SCRIPT ⚠️
-- This script will DELETE ALL PHOTOS and RESET USER ACCOUNTS
-- CAUTION: This action is IRREVERSIBLE - ensure you have backups!

-- Step 1: Create backup tables (recommended before running)
-- CREATE TABLE photos_backup AS SELECT * FROM "Photo";
-- CREATE TABLE users_backup AS SELECT * FROM "User";
-- CREATE TABLE transactions_backup AS SELECT * FROM "Transaction";

BEGIN;

-- Step 2: Delete all photos and related data
DELETE FROM "Photo";

-- Step 3: Reset user accounts (preserve authentication but reset usage data)
UPDATE "User" SET 
    credits = 3,              -- Reset to default 3 credits
    subscriptionTier = NULL,   -- Clear subscription
    subscriptionId = NULL,     -- Clear Stripe subscription
    subscriptionStatus = NULL, -- Clear subscription status
    "updatedAt" = NOW();      -- Update timestamp

-- Step 4: Clear all transactions (optional - preserves payment history if commented out)
DELETE FROM "Transaction";

-- Step 5: Clear all subscriptions (optional)
DELETE FROM "Subscription";

-- Step 6: Verify the reset
SELECT 
    'Users' as table_name,
    COUNT(*) as total_records,
    SUM(credits) as total_credits,
    COUNT(*) FILTER (WHERE credits = 3) as users_with_default_credits
FROM "User"
UNION ALL
SELECT 
    'Photos' as table_name,
    COUNT(*) as total_records,
    NULL as total_credits,
    NULL as users_with_default_credits
FROM "Photo"
UNION ALL
SELECT 
    'Transactions' as table_name,
    COUNT(*) as total_records,
    NULL as total_credits,
    NULL as users_with_default_credits
FROM "Transaction";

-- Uncomment the line below to commit changes
-- COMMIT;

-- Keep transaction open for review - you must manually COMMIT or ROLLBACK
SELECT 'Transaction is open - review results above, then run COMMIT; or ROLLBACK;' as status;