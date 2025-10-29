# STX WhatsApp Payment Bot

A non-custodial WhatsApp bot for peer-to-peer STX (Stacks) cryptocurrency payments with automatic Clarity-based escrow for unregistered recipients.

## 🎯 Project Status: Phase 1 - Foundation Complete

✅ **Phase 1 Completed:**
- [x] Project structure setup
- [x] Utility functions (Validator, Parser, Formatter)
- [x] Configuration files (Database, Stacks, WhatsApp)
- [x] Basic webhook endpoint (Hello World)
- [x] TypeScript configuration
- [x] Environment setup

🚧 **Next Phases:**
- [ ] Phase 2: User registration & database setup
- [ ] Phase 3: Contact management
- [ ] Phase 4: P2P transfers
- [ ] Phase 5: Escrow system
- [ ] Phase 6: Testing & deployment

## 🏗️ Architecture

- **Backend:** Node.js/TypeScript on Vercel Functions (Serverless)
- **Database:** Supabase PostgreSQL
- **Messaging:** Twilio WhatsApp API
- **Blockchain:** Stacks (Hiro API)
- **Smart Contract:** Clarity escrow contract
- **Cost:** $0 for MVP (all free tiers)

## 📋 Prerequisites

- Node.js 18+ installed
- Vercel account (free tier)
- Supabase account (free tier)
- Twilio account with WhatsApp sandbox (free trial)
- Stacks wallet (for testing)

## 🚀 Getting Started

### 1. Clone & Install

```bash
# Clone the repository
git clone <your-repo-url>
cd stx-whatsapp-bot

# Install dependencies
npm install
```

### 2. Environment Configuration

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Required environment variables:
- `POSTGRES_URL` - Supabase connection string
- `TWILIO_ACCOUNT_SID` - From Twilio console
- `TWILIO_AUTH_TOKEN` - From Twilio console
- `TWILIO_PHONE_NUMBER` - Your Twilio WhatsApp number
- `STACKS_NETWORK` - "testnet" or "mainnet"
- `STACKS_API_URL` - Hiro API endpoint
- `ESCROW_CONTRACT_ADDRESS` - (Deploy contract first)

### 3. Local Development

```bash
# Start local development server
npm run dev

# Your webhook will be available at:
# http://localhost:3000/api/webhook
```

### 4. Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Or deploy to production
npm run deploy
```

## 📱 Testing Phase 1

### Step 1: Deploy to Vercel

Deploy your app to get a public URL (e.g., `https://your-app.vercel.app`)

### Step 2: Configure Twilio Webhook

1. Go to [Twilio Console](https://console.twilio.com)
2. Navigate to **Messaging** → **Try it out** → **Send a WhatsApp message**
3. In the sandbox settings, set the webhook URL to:
   ```
   https://your-app.vercel.app/api/webhook
   ```
4. Select **POST** as the method

### Step 3: Test the Bot

1. Send the join code to your Twilio WhatsApp number (shown in sandbox)
2. Send any message (e.g., "Hello")
3. You should receive:
   ```
   👋 Hello! I'm your STX payment bot.
   
   Phase 1 is working! ✅
   
   I received your message: "Hello"
   
   More features coming soon! 🚀
   ```

### Step 4: Verify Logs

Check Vercel logs to see incoming messages:
```bash
vercel logs
```

You should see:
```
📨 Incoming message: {
  from: 'whatsapp:+234...',
  to: 'whatsapp:+1415...',
  body: 'Hello',
  timestamp: '2025-10-27T...'
}
```

## 🧪 Testing Utilities

### Validator Tests

Test phone validation:
```typescript
import { isValidPhoneNumber } from './lib/utils/validator';

console.log(isValidPhoneNumber('+2348012345678')); // true
console.log(isValidPhoneNumber('08012345678'));     // false
console.log(isValidPhoneNumber('+234 801 234 5678')); // false
```

### Parser Tests

Test command parsing:
```typescript
import { parseSendCommand } from './lib/utils/parser';

const result = parseSendCommand('send 10 to Bob');
// { amount: 10, contactName: 'Bob', originalMessage: 'send 10 to Bob' }
```

### Formatter Tests

Test message formatting:
```typescript
import { formatSTXAmount, abbreviateAddress } from './lib/utils/formatter';

console.log(formatSTXAmount(10.5));  // "10.5 STX"
console.log(abbreviateAddress('SP1234...'));  // "SP12...234"
```

## 📁 Project Structure

```
stx-whatsapp-bot/
├── api/
│   └── webhook.ts              # Main webhook endpoint
├── lib/
│   ├── config/
│   │   ├── database.ts         # Database connection
│   │   ├── stacks.ts           # Stacks network config
│   │   └── whatsapp.ts         # Twilio config
│   └── utils/
│       ├── validator.ts        # Phone & address validation
│       ├── parser.ts           # Command parsing
│       └── formatter.ts        # Message formatting
├── package.json
├── tsconfig.json
├── .env.example
├── .gitignore
└── README.md
```

## 🔧 Configuration Files

### vercel.json (Coming in Phase 2)
Will configure:
- Function timeouts
- Cron jobs for transaction monitoring
- Environment variables

### Database Schema (Coming in Phase 2)
Will include tables for:
- `users` - Phone ↔ STX address mapping
- `contacts` - User contacts
- `transactions` - Transaction records
- `escrows` - Escrow state
- `conversation_states` - Multi-step conversations

## 🎨 Features (Planned)

### MVP Features
- ✅ User registration (link phone to STX address)
- ✅ Smart contact addition (just-in-time phone capture)
- ✅ P2P transfers (direct STX transfers)
- ✅ Escrow system (for unregistered recipients)
- ✅ Transaction monitoring
- ✅ Claim web page
- ✅ Contact list management

### Phone Number Handling
- **Format:** `+234XXXXXXXXXX` (exactly 14 characters)
- **Validation:** Strict regex `/^\+234\d{10}$/`
- **No Normalization:** Reject any format variations
- **Helpful Errors:** Guide users to correct format

## 📊 Development Timeline

| Phase | Duration | Status |
|-------|----------|--------|
| Phase 1: Foundation | Week 1 | ✅ Complete |
| Phase 2: Database & Registration | Week 2 | 🚧 Next |
| Phase 3: Contacts & Services | Week 3 | 📅 Planned |
| Phase 4: Transactions | Week 4 | 📅 Planned |
| Phase 5: Escrow & Monitoring | Week 5 | 📅 Planned |
| Phase 6: Testing & Launch | Week 6 | 📅 Planned |

## 🛠️ Development Commands

```bash
# Install dependencies
npm install

# Start local development
npm run dev

# Build TypeScript
npm run build

# Deploy to Vercel
npm run deploy

# Run tests (when implemented)
npm test

# Lint code
npm run lint
```

## 🐛 Troubleshooting

### Webhook not receiving messages
1. Check Twilio webhook configuration
2. Verify your Vercel deployment URL
3. Check Vercel logs for errors
4. Ensure webhook URL is publicly accessible

### Environment variables not working
1. Set variables in Vercel dashboard
2. Redeploy after changing variables
3. Use `vercel env pull` to sync locally

### Twilio errors
1. Verify account SID and auth token
2. Check WhatsApp sandbox status
3. Ensure phone numbers are in E.164 format

## 📝 Next Steps

**For Phase 2**, we'll implement:
1. Database migrations (create all tables)
2. User service (registration logic)
3. Enhanced webhook (handle registration)
4. State management (multi-step conversations)

## 🤝 Contributing

This is an MVP for the Stacks Ascent grant application. Contributions welcome after initial launch!

## 📄 License

MIT

## 🔗 Resources

- [Stacks Documentation](https://docs.stacks.co)
- [Clarity Language](https://docs.stacks.co/clarity)
- [Twilio WhatsApp API](https://www.twilio.com/docs/whatsapp)
- [Vercel Documentation](https://vercel.com/docs)
- [Supabase Documentation](https://supabase.com/docs)

---

**Built for Stacks Ascent Grant Application** 🚀
