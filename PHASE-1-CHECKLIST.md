# Phase 1 - Testing Checklist

Use this checklist to verify Phase 1 is working correctly before moving to Phase 2.

## 📦 Pre-Deployment Checks

### Local Environment
- [ ] Node.js version 18+ installed (`node --version`)
- [ ] npm or yarn installed
- [ ] Git initialized (optional, but recommended)
- [ ] TypeScript globally available (or use npx)

### Project Files
- [ ] All 14 files present in directory
- [ ] `.env.example` exists (don't need `.env` yet)
- [ ] `package.json` has all dependencies
- [ ] `tsconfig.json` properly configured
- [ ] `vercel.json` present

## 🧪 Local Testing

### Install Dependencies
```bash
cd stx-whatsapp-bot
npm install
```

- [ ] Installation completes without errors
- [ ] `node_modules/` directory created
- [ ] No peer dependency warnings

### Run Utility Tests
```bash
npx tsx test-utilities.ts
```

**Expected Output:**
- [ ] "🧪 Testing Phase 1 Utilities" appears
- [ ] All validator tests show ✅
- [ ] All parser tests show ✅
- [ ] All formatter tests show ✅
- [ ] "✅ Phase 1 Utilities Test Complete!" appears
- [ ] No errors or exceptions

### TypeScript Compilation
```bash
npx tsc --noEmit
```

- [ ] No compilation errors
- [ ] No type errors
- [ ] All imports resolve correctly

## 🚀 Deployment Checks

### Vercel Deployment
```bash
vercel
```

- [ ] Deployment starts successfully
- [ ] Build completes without errors
- [ ] Deployment URL provided (e.g., `https://xxx.vercel.app`)
- [ ] No function size warnings
- [ ] No runtime errors in build log

### Verify Deployment
```bash
# Visit in browser
https://your-app.vercel.app/api/webhook
```

- [ ] Page loads (should show "Method not allowed" error)
- [ ] No 404 error
- [ ] No 500 error
- [ ] Error message is JSON formatted

## 🌐 Webhook Testing

### Test with curl (GET - should fail)
```bash
curl https://your-app.vercel.app/api/webhook
```

**Expected Response:**
```json
{"error":"Method not allowed"}
```

- [ ] Returns JSON error
- [ ] Status code 405
- [ ] No server errors

### Test with curl (POST - should succeed)
```bash
curl -X POST https://your-app.vercel.app/api/webhook \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "Body=Hello&From=whatsapp:+2348012345678&To=whatsapp:+14155238886"
```

**Expected Response:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>👋 Hello! I'm your STX payment bot. 

Phase 1 is working! ✅

I received your message: "Hello"

More features coming soon! 🚀</Message>
</Response>
```

- [ ] Returns XML (TwiML format)
- [ ] Status code 200
- [ ] Contains "Phase 1 is working! ✅"
- [ ] Contains the echoed message ("Hello")

### Test with Different Messages
```bash
# Test with different body
curl -X POST https://your-app.vercel.app/api/webhook \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "Body=send+10+to+Bob&From=whatsapp:+2348012345678&To=whatsapp:+14155238886"
```

- [ ] Returns TwiML response
- [ ] Echoes "send 10 to Bob" correctly
- [ ] No errors

## 📊 Vercel Dashboard Checks

### View Logs
1. Go to https://vercel.com
2. Select your project
3. Click "Logs" or "Functions"

- [ ] Logs page loads
- [ ] Can see function executions
- [ ] See "📨 Incoming message" logs
- [ ] No error logs present

### Check Function Status
- [ ] `/api/webhook` function shows as deployed
- [ ] Function region is correct
- [ ] No function errors
- [ ] Response times are reasonable (<1s)

## 🔍 Code Quality Checks

### File Structure
- [ ] `api/` directory has webhook.ts
- [ ] `lib/config/` has 3 files (database, stacks, whatsapp)
- [ ] `lib/utils/` has 3 files (validator, parser, formatter)
- [ ] All files have proper TypeScript extensions

### Code Standards
- [ ] All files have JSDoc comments
- [ ] No console.errors (except in catch blocks)
- [ ] Consistent naming conventions
- [ ] Proper error handling in webhook

### Dependencies
- [ ] No unused dependencies in package.json
- [ ] All imports can be resolved
- [ ] @stacks packages at correct versions
- [ ] Twilio SDK properly installed

## 📝 Documentation Checks

- [ ] README.md is complete
- [ ] PHASE-1-GUIDE.md explains deployment
- [ ] PHASE-1-QUICKREF.md has quick commands
- [ ] .env.example lists all variables
- [ ] Code has sufficient comments

## ⚠️ Expected Limitations (These are OK!)

These should NOT work yet (Phase 2+):
- [ ] ❌ No database connection (expected)
- [ ] ❌ Cannot register users (expected)
- [ ] ❌ Cannot save contacts (expected)
- [ ] ❌ STX transfers not working (expected)
- [ ] ❌ No escrow functionality (expected)

## ✅ Final Verification

**All green? Phase 1 is complete!**

Summary:
- [ ] All files created (14 files)
- [ ] npm install works
- [ ] Utility tests pass
- [ ] TypeScript compiles
- [ ] Deploys to Vercel
- [ ] Webhook responds to POST
- [ ] Logs show incoming messages
- [ ] No critical errors
- [ ] Documentation complete

## 🎉 If All Checked: Phase 1 Complete!

**Status:** ✅ Ready for Phase 2

**What's Working:**
- Project structure ✅
- Utility functions ✅
- Configuration files ✅
- Basic webhook ✅
- Deployment infrastructure ✅

**What's Next:**
Phase 2 will add:
1. Database setup (Supabase)
2. User registration
3. Twilio WhatsApp integration
4. Real message handling

## 🐛 Troubleshooting

### If Tests Fail:
1. Check Node.js version (must be 18+)
2. Delete node_modules and reinstall
3. Check for TypeScript errors
4. Verify all imports are correct

### If Deployment Fails:
1. Check Vercel login (`vercel whoami`)
2. Verify you're in project directory
3. Check vercel.json syntax
4. Try `vercel --prod`

### If Webhook Doesn't Work:
1. Verify URL is correct
2. Check Vercel function logs
3. Test with curl (not browser for POST)
4. Ensure Content-Type header is set

---

**Date Completed:** _________________

**Verified By:** _________________

**Ready for Phase 2:** ☐ Yes ☐ No

**Notes:**
_________________________________________________
_________________________________________________
_________________________________________________
