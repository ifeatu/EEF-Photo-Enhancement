# 🚨 Production Database Reset Guide

## ⚠️ CRITICAL WARNING

This guide covers resetting the production database. **This action is IRREVERSIBLE and will DELETE ALL PHOTOS and RESET USER ACCOUNTS.**

## 📋 Pre-Reset Checklist

### 1. Verify Database Connection
Ensure you're connected to the correct production database:
```bash
echo $POSTGRES_PRISMA_URL
```

### 2. Create Manual Backup (Recommended)
Before running any reset scripts:
```bash
# If using Vercel Postgres, export via dashboard
# Or create a manual backup using pg_dump
```

### 3. Notify Users (if applicable)
If you have active users, consider notifying them of the maintenance window.

## 🔧 Reset Methods

### Method 1: Safe Interactive Script (Recommended)

**Safest approach with confirmations and backups:**

```bash
# Enable the safety override
export ALLOW_PRODUCTION_RESET=true

# Run the interactive reset script
node scripts/safe-production-reset.js
```

**Features:**
- ✅ Shows current database stats
- ✅ Creates automatic backup file
- ✅ Multiple confirmation prompts
- ✅ Preserves user authentication by default
- ✅ Option to preserve transaction history
- ✅ Verification of results

### Method 2: Direct SQL Execution

**For advanced users who prefer SQL control:**

1. **Review the SQL script first:**
```bash
cat scripts/production-reset.sql
```

2. **Connect to production database:**
```bash
# Using psql with your production connection string
psql $POSTGRES_PRISMA_URL
```

3. **Execute the SQL script:**
```sql
-- Copy and paste the content from production-reset.sql
-- The script uses a transaction that you must manually commit
```

### Method 3: Prisma Studio (Manual)

**For small datasets or precise control:**

1. **Open Prisma Studio:**
```bash
npx prisma studio
```

2. **Manually delete records:**
- Delete all records from `Photo` table
- Update `User` records to reset credits to 3
- Optionally clear `Transaction` and `Subscription` tables

## 🔄 What Gets Reset

### Photos Table
- **Action**: Complete deletion of all photo records
- **Impact**: All uploaded and enhanced photos removed
- **Storage**: Vercel Blob files may need separate cleanup

### User Accounts
- **Credits**: Reset to 3 (default)
- **Subscriptions**: Cleared (tier, ID, status)
- **Authentication**: Preserved (email, OAuth accounts)
- **Profile**: Preserved (name, image)

### Transactions (Optional)
- **Payment History**: Can be preserved or cleared
- **Stripe Data**: Webhook history may be retained

### Subscriptions (Optional)
- **Active Subscriptions**: Cleared
- **Stripe Integration**: May require Stripe dashboard cleanup

## ✅ Post-Reset Verification

After completing the reset, verify the following:

### 1. Database State
```bash
# Run the verification query
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verify() {
  const users = await prisma.user.count();
  const photos = await prisma.photo.count();
  const credits = await prisma.user.aggregate({ _sum: { credits: true } });
  
  console.log('Verification Results:');
  console.log('- Users:', users);
  console.log('- Photos:', photos);
  console.log('- Total Credits:', credits._sum.credits);
  
  await prisma.\$disconnect();
}

verify();
"
```

### 2. Application Health
```bash
# Test the deployed application
curl https://photoenhance-frontend-h84ca7miz-pierre-malbroughs-projects.vercel.app/api/photos/enhance
```

### 3. User Experience
- Test user login flow
- Verify credit system shows 3 credits for existing users
- Confirm photo upload and enhancement workflow

## 🗑️ Cleanup Tasks

### Vercel Blob Storage
Photos are stored in Vercel Blob. After database reset, you may want to cleanup blob storage:

```bash
# List current blobs (if you have vercel CLI access)
vercel blob ls

# Delete specific blobs if needed
# Note: Be careful not to delete essential application assets
```

### Stripe Dashboard
If you cleared transactions/subscriptions:
- Review Stripe dashboard for orphaned subscriptions
- Cancel any active subscriptions that no longer have database records
- Clean up webhook event history if needed

## 🚨 Emergency Rollback

If something goes wrong:

### 1. Database Rollback
If using the SQL method and haven't committed:
```sql
ROLLBACK;
```

### 2. Restore from Backup
If you have the backup file from the safe script:
```bash
# The backup is in JSON format - you'd need to write a restore script
# Or restore from your external database backup
```

### 3. Vercel Deployment Rollback
```bash
# If needed, rollback to previous deployment
vercel --prod rollback
```

## 📞 Support

If you encounter issues:
1. Check the application health endpoint
2. Review Vercel function logs
3. Verify database connectivity
4. Ensure all environment variables are correct

## 🔒 Security Notes

- The reset scripts include safety checks to prevent accidental execution
- Always verify you're connected to the intended database
- Consider running in a maintenance window
- Inform users of potential service interruption
- Keep backups until you're confident the reset was successful

---

**Remember**: Production database operations are irreversible. Always have backups and proceed with extreme caution.