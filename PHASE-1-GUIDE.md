# Phase 1 - Deployment & Testing Guide

## ✅ What's Included in Phase 1

**Files Created:** 13 files
- ✅ `package.json` - Dependencies and scripts
- ✅ `tsconfig.json` - TypeScript configuration
- ✅ `.env.example` - Environment variables template
- ✅ `.gitignore` - Git ignore rules
- ✅ `lib/utils/validator.ts` - Phone & STX validation
- ✅ `lib/utils/parser.ts` - Command parsing
- ✅ `lib/utils/formatter.ts` - Message formatting
- ✅ `lib/config/database.ts` - Database config
- ✅ `lib/config/stacks.ts` - Stacks network config
- ✅ `lib/config/whatsapp.ts` - Twilio config
- ✅ `api/webhook.ts` - Basic "Hello World" endpoint
- ✅ `test-utilities.ts` - Utility function tests
- ✅ `README.md` - Full documentation

## 🚀 Quick Start (5 Minutes)

### Step 1: Install Dependencies

```bash
cd stx-whatsapp-bot
npm install
```

### Step 2: Test Utilities Locally

```bash
# Install tsx for running TypeScript
npm install -g tsx

# Run the utility tests
tsx test-utilities.ts
```

You should see output like:
```
🧪 Testing Phase 1 Utilities

📋 VALIDATOR TESTS
==================

Phone Number Validation:
  ✅ Valid Nigerian number: "+2348012345678" → true
  ✅ Valid Nigerian number (070): "+2347012345678" → true
  ❌ Missing +234 prefix: "08012345678" → false
  ...

✅ Phase 1 Utilities Test Complete!
```

### Step 3: Set Up Environment Variables

Create a `.env` file:
```bash
cp .env.example .env
```

**For now, you can leave most values as placeholders.** We'll fill them in when we:
- Create Supabase database (Phase 2)
- Set up Twilio (Phase 2)
- Deploy Clarity contract (Phase 4)

### Step 4: Deploy to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy
vercel
```

Follow the prompts:
- **Set up and deploy?** Yes
- **Which scope?** Your personal account
- **Link to existing project?** No
- **Project name?** stx-whatsapp-bot
- **Directory?** ./
- **Override settings?** No

Vercel will give you a URL like: `https://stx-whatsapp-bot-xyz.vercel.app`

### Step 5: Test the Webhook

Visit your webhook URL in a browser:
```
https://your-app.vercel.app/api/webhook
```

You should see:
```json
{"error": "Method not allowed"}
```

This is correct! The webhook only accepts POST requests (from Twilio).

## 🧪 Testing Phase 1 (Without Twilio)

You can test the webhook using curl:

```bash
curl -X POST https://your-app.vercel.app/api/webhook \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "Body=Hello&From=whatsapp:+2348012345678&To=whatsapp:+14155238886"
```

You should receive a TwiML response:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>👋 Hello! I'm your STX payment bot. 

Phase 1 is working! ✅

I received your message: "Hello"

More features coming soon! 🚀</Message>
</Response>
```

## 📊 Verify Everything Works

### ✅ Checklist

- [ ] `npm install` runs without errors
- [ ] `tsx test-utilities.ts` passes all tests
- [ ] Project deploys to Vercel successfully
- [ ] Webhook endpoint is accessible
- [ ] Webhook responds to POST requests
- [ ] No TypeScript compilation errors

### 🔍 Check Vercel Logs

View logs in real-time:
```bash
vercel logs --follow
```

Or check in the Vercel dashboard:
1. Go to https://vercel.com
2. Select your project
3. Click "Logs" tab
4. Send a test POST request
5. You should see: `📨 Incoming message: {...}`

## 🎯 What Phase 1 Proves

✅ **Infrastructure:** Vercel deployment works  
✅ **TypeScript:** All code compiles without errors  
✅ **Utilities:** Validation, parsing, formatting all work  
✅ **Webhook:** Can receive and respond to messages  
✅ **Configs:** All configuration files are properly structured  

## ⚠️ Known Limitations (Expected)

These are **intentional** for Phase 1:
- ❌ No database connection yet (Phase 2)
- ❌ Can't register users yet (Phase 2)
- ❌ Can't save contacts yet (Phase 3)
- ❌ Can't send STX yet (Phase 4)
- ❌ No escrow contract yet (Phase 4)
- ❌ Twilio not configured yet (we'll do this in Phase 2)

## 🐛 Troubleshooting

### "Module not found" errors
```bash
npm install
npm run build
```

### "Cannot find module '@vercel/postgres'"
This is fine for Phase 1. We'll use the database in Phase 2.

### TypeScript errors
Make sure you're using Node 18+:
```bash
node --version  # Should be v18.0.0 or higher
```

### Vercel deployment fails
1. Check you're logged in: `vercel whoami`
2. Make sure you're in the project directory
3. Try: `vercel --prod` to force production deployment

## ✨ Success Criteria

Phase 1 is complete when:

1. ✅ All files created (13 files)
2. ✅ npm install works
3. ✅ Utility tests pass
4. ✅ Deployed to Vercel
5. ✅ Webhook responds to POST requests
6. ✅ No compilation errors

## 📝 Next Steps: Phase 2

Once Phase 1 is confirmed working, we'll build:

1. **Database Setup**
   - Create Supabase project
   - Run migrations (5 tables)
   - Test connection

2. **User Registration**
   - User service (create, getByPhone)
   - Registration handler
   - Update webhook to handle registration
   - Store phone ↔ STX address mapping

3. **Twilio Integration**
   - Set up WhatsApp sandbox
   - Configure webhook URL
   - Test real WhatsApp messages
   - Implement WhatsApp service (send messages)

4. **State Management**
   - Conversation states table
   - State service (set, get, clear)
   - Multi-step conversation handling

**Estimated Time for Phase 2:** 6-8 hours

## 🎉 Congratulations!

Phase 1 foundation is complete! You now have:
- ✅ Solid project structure
- ✅ All utility functions tested
- ✅ Working webhook endpoint
- ✅ Deployed infrastructure
- ✅ Configuration ready for next phases

Ready to move to Phase 2? 🚀

---

**Questions or Issues?**
- Check the main README.md for detailed documentation
- Review Vercel logs for error messages
- Ensure all dependencies are installed
- Verify Node.js version is 18+
