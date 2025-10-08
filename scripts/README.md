# Admin Scripts - ArqCashflow

**Purpose**: Utility scripts for database administration and testing
**Audience**: Developers, system administrators
**Environment**: Pre-launch and production maintenance

---

## 🗂️ Available Scripts

### 1. **List Users** (`list-users.ts`)
Lists all users in the database with their teams and metadata.

**Usage:**
```bash
npx tsx scripts/list-users.ts
```

**Output:**
- Email, name, team name
- Onboarding status
- Creation date
- Total count

**Use Case:**
- Check which users exist before deletion
- Verify test vs production users
- Audit user accounts

---

### 2. **Delete Test User** (`delete-test-user.ts`)
Safely deletes a user and their entire team (cascades to all entities).

**Usage:**
```bash
npx tsx scripts/delete-test-user.ts <email>
```

**Example:**
```bash
npx tsx scripts/delete-test-user.ts teste5@teste.com.br
```

**What Gets Deleted (Cascade):**
- ✅ User account
- ✅ Team
- ✅ All Contracts
- ✅ All Receivables
- ✅ All Expenses
- ✅ All Recurring Expenses
- ✅ All Audit Logs
- ✅ All Events

**Safety Features:**
- Shows entity counts before deletion
- Displays summary after deletion
- Email becomes immediately available for re-registration
- Error handling with rollback

**⚠️ Important Notes:**
- **Pre-Launch**: Safe to use for test data cleanup
- **Production**: Use with EXTREME caution - deletion is permanent
- **Always run `list-users.ts` first** to verify the correct email
- **Backup database** before deleting production users

---

## 🛡️ Safety Guidelines

### Pre-Launch Phase (Current)
✅ **Safe to delete:**
- Test users (test@*, teste@*, agent-test@*)
- Demo accounts
- Development users

⚠️ **DO NOT delete:**
- `joselpq@gmail.com` - Main developer account
- Any user with real business data

### Production Phase (Future)
🚨 **Before deleting ANY user:**
1. Run `list-users.ts` to verify email
2. Backup database: `pg_dump arqcashflow > backup_$(date +%Y%m%d).sql`
3. Verify with team/user that deletion is authorized
4. Run deletion script
5. Verify email is available for re-registration

---

## 📋 Common Workflows

### Workflow 1: Clean Up Test Users
```bash
# Step 1: List all users
npx tsx scripts/list-users.ts

# Step 2: Identify test users (test@*, teste@*)
# Step 3: Delete each test user
npx tsx scripts/delete-test-user.ts test1@test.com
npx tsx scripts/delete-test-user.ts test2@test.com
# etc.

# Step 4: Verify cleanup
npx tsx scripts/list-users.ts
```

### Workflow 2: Reset User Account (Re-registration)
```bash
# Step 1: Delete existing account
npx tsx scripts/delete-test-user.ts user@example.com

# Step 2: User can now re-register with same email
# Navigate to /register and create new account
```

### Workflow 3: Remove Specific Team Data
```bash
# Option A: Delete entire team (recommended)
npx tsx scripts/delete-test-user.ts team-owner@example.com

# Option B: Manual cleanup via Prisma Studio
npx prisma studio
# Navigate to Team, find by ID, delete
```

---

## 🔧 Technical Details

### Database Cascade Behavior
All deletions leverage Prisma's `onDelete: Cascade` constraints:

```prisma
// From schema.prisma
model User {
  teamId String
  team   Team @relation(fields: [teamId], references: [id], onDelete: Cascade)
}

model Contract {
  teamId String
  team   Team @relation(fields: [teamId], references: [id], onDelete: Cascade)
}
// All entities cascade from Team
```

**Deletion Flow:**
1. Delete `Team` → Cascades to all entities
2. User, Contracts, Receivables, Expenses, RecurringExpenses, AuditLogs, Events all deleted automatically
3. Foreign key constraints satisfied
4. Email becomes available

### Why Delete Team Instead of User?
- **User deletion blocked by:** `RecurringExpense.createdBy` and `AuditLog.userId` (RESTRICT constraint)
- **Team deletion:** Clean cascade to everything, no manual cleanup needed
- **Result:** Simpler, safer, single SQL operation

---

## 🚀 Adding New Admin Scripts

When creating new admin scripts, follow these patterns:

```typescript
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function yourFunction() {
  try {
    // Your logic here
    console.log('✅ Success message')
  } catch (error) {
    console.error('❌ Error:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

yourFunction()
  .then(() => process.exit(0))
  .catch(() => process.exit(1))
```

**Documentation Requirements:**
1. Add script to this README with usage examples
2. Include safety notes for pre-launch vs production
3. Add error handling and user feedback
4. Test in development before production use

---

## 📚 Related Documentation

- [LLM Agent Guide](/LLM_AGENT_GUIDE.md) - References admin scripts location
- [Prisma Schema](/prisma/schema.prisma) - Database relationships and cascade behavior
- [BACKLOG.md](/BACKLOG.md) - Development priorities and maintenance notes

---

## 🆘 Troubleshooting

### Error: "User not found"
- Verify email with `list-users.ts`
- Check for typos in email address
- Confirm user exists in database

### Error: "Foreign key constraint failed"
- Should not happen with team deletion (cascades cleanly)
- If deleting user directly, check RecurringExpense and AuditLog constraints
- Use team deletion instead (recommended)

### Email Not Available After Deletion
- Verify deletion completed: `list-users.ts`
- Check database directly: `npx prisma studio`
- Clear any cached sessions

---

**Last Updated:** 2025-10-08
**Maintained By:** Development team
**Status:** Active (Pre-launch phase)
