# Haiku 4.5 Testing Guide

**Date**: 2025-11-05
**Status**: Phase 1B Complete - Ready for Testing
**Related**: ADR-022, FILE_IMPORT_DEEP_ANALYSIS.md

---

## 🎯 What Was Implemented

### Phase 1A: Prisma createMany ✅
- Parallel validation with Promise.allSettled
- Batch insert with createMany (85-90% faster)
- Batch audit logs (1 per operation)
- **Tested & Working**: User confirmed significant speed improvement

### Phase 1B: Haiku 4.5 Feature Flag ✅
- Dynamic model selection based on environment variable
- Feature flag: `SETUP_ASSISTANT_USE_HAIKU=true`
- Reduced thinking budgets for Haiku (2000/5000 vs 5000/10000)
- Console logging to show which model is being used

---

## 🧪 How to Test

### Test 1: Sonnet 4 (Baseline - Default)

**Setup:**
```bash
# In your .env.local file:
SETUP_ASSISTANT_USE_HAIKU=false
# Or leave unset (defaults to false)
```

**Expected Behavior:**
- Console logs: "🤖 Phase 1 Analysis using Sonnet 4 (accurate) with 5000 thinking tokens"
- Console logs: "🤖 Phase 2 Extraction... using Sonnet 4 (accurate) with 10000 thinking tokens"
- Processing time: 90-130s for typical 4-sheet file
- High accuracy baseline

### Test 2: Haiku 4.5 (Fast Mode)

**Setup:**
```bash
# In your .env.local file:
SETUP_ASSISTANT_USE_HAIKU=true
```

**Expected Behavior:**
- Console logs: "🤖 Phase 1 Analysis using Haiku 4.5 (fast) with 2000 thinking tokens"
- Console logs: "🤖 Phase 2 Extraction... using Haiku 4.5 (fast) with 5000 thinking tokens"
- Processing time: 20-35s for typical 4-sheet file (75-80% faster)
- Accuracy to be validated

### Test 3: Restart Server

**Important:** After changing the environment variable:
```bash
# Stop server
# Update .env.local
# Restart server
npm run dev
```

---

## 📊 What to Measure

### Speed Metrics
- [ ] **Phase 1 Analysis time**: Should be ~1s with Haiku vs ~5s with Sonnet
- [ ] **Phase 2 Extraction time**: Should be ~12-20s with Haiku vs ~60-100s with Sonnet
- [ ] **Total processing time**: Should be ~20-35s with Haiku vs ~90-130s with Sonnet

### Accuracy Metrics
- [ ] **Entity counts**: Compare Haiku vs Sonnet (should be within 5%)
- [ ] **Field accuracy**: Check dates, amounts, status values
- [ ] **Cross-references**: Verify contractId mapping for receivables
- [ ] **Edge cases**: Empty values, special characters, formatting

### Quality Checks
For each test file:
1. **Contracts extracted**: Count matches expected?
2. **Receivables extracted**: Count matches expected?
3. **Expenses extracted**: Count matches expected?
4. **Dates parsed correctly**: ISO-8601 format?
5. **Amounts accurate**: Decimal values correct?
6. **Status inference**: Pending/paid/active assignments make sense?
7. **Categories**: Correct or reasonable inference?

---

## 🧰 Test Files Needed

### Recommended Test Suite (15 files)

**Simple Files (2-3 sheets, <50 rows)**
1. Small contract file with receivables
2. Small expense file only
3. Mixed file with all entity types

**Medium Files (4-5 sheets, 100-150 rows)**
4. Standard architecture firm file
5. File with cross-sheet references
6. File with mixed date formats

**Complex Files (6+ sheets, 200+ rows)**
7. Large multi-project file
8. File with special characters
9. File with empty rows/columns

**Edge Cases**
10. File with duplicate project names
11. File with missing required fields
12. File with unusual formatting
13. File with very long text fields

**Production Files**
14. Actual user file #1
15. Actual user file #2

---

## ✅ Success Criteria

### Must Have (Blocking)
- ✅ **Speed improvement**: 60-80% faster than Sonnet
- ✅ **Accuracy**: ≥ 90% entity extraction (compared to Sonnet)
- ✅ **No crashes**: All test files complete without errors
- ✅ **Data integrity**: No corruption or data loss

### Should Have (Important)
- ✅ **Cost reduction**: ~67% cheaper per file
- ✅ **Edge case handling**: Works with special characters, empty values
- ✅ **Cross-references**: ContractId mapping works correctly

### Nice to Have (Optional)
- ✅ **Better than Sonnet**: Haiku extracts more entities in some cases
- ✅ **Faster thinking**: Less thinking tokens = even faster

---

## 🚨 Failure Conditions

**Stop testing if:**
- ❌ Accuracy drops below 85% (more than 15% error rate)
- ❌ Systematic errors (same issue across multiple files)
- ❌ Data corruption (entities created with wrong values)
- ❌ Crashes or timeouts (API failures)

**Rollback plan:**
```bash
# In .env.local:
SETUP_ASSISTANT_USE_HAIKU=false

# Restart server
npm run dev
```

---

## 📝 Testing Checklist

### Pre-Testing
- [ ] `.env.local` has `SETUP_ASSISTANT_USE_HAIKU` variable
- [ ] Server restarted after env change
- [ ] Database has test team/user
- [ ] Console is visible for model selection logs

### During Testing
- [ ] Log start time for each file
- [ ] Log end time for each file
- [ ] Note which model was used (check console)
- [ ] Screenshot entity counts in UI
- [ ] Manually verify 3-5 random entities per file

### Post-Testing
- [ ] Compare Haiku vs Sonnet entity counts
- [ ] Calculate average processing times
- [ ] Document any accuracy issues
- [ ] Take screenshots for documentation

---

## 📊 Test Results Template

```
File: [filename]
Date: [test date]
Model: [Haiku/Sonnet]
Size: [sheets] sheets, [rows] rows

Performance:
- Phase 1 (Analysis): [time]
- Phase 2 (Extraction): [time]
- Total: [time]

Results:
- Contracts created: [count]
- Receivables created: [count]
- Expenses created: [count]

Accuracy:
- Expected vs Actual: [diff]
- Field accuracy: [percentage]
- Issues: [list]

Notes:
[Any observations]
```

---

## 🚀 Next Steps After Testing

### If Tests Pass (≥90% accuracy):
1. Update BACKLOG.md - mark Phase 1B as tested & validated
2. Create comparison table (Haiku vs Sonnet metrics)
3. Proceed to gradual rollout planning
4. Consider Phase 2 (prompt caching)

### If Tests Fail (<90% accuracy):
1. Document specific failure patterns
2. Analyze which entity types have issues
3. Consider hybrid approach (Haiku for simple, Sonnet for complex)
4. Adjust thinking budgets if needed
5. Re-test with adjusted settings

---

## 💡 Quick Commands

```bash
# Test with Sonnet (baseline)
echo "SETUP_ASSISTANT_USE_HAIKU=false" >> .env.local
npm run dev

# Test with Haiku (fast mode)
echo "SETUP_ASSISTANT_USE_HAIKU=true" >> .env.local
npm run dev

# Check current setting
cat .env.local | grep SETUP_ASSISTANT_USE_HAIKU

# View logs in real-time
tail -f .next/server/server.log  # or check terminal output
```

---

*Ready to test!* 🎉

Start with 1-2 files using Sonnet (baseline), then test the same files with Haiku and compare results.
