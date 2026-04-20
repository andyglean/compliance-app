# Travis Ranch Compliance Reporter

Community courtesy reporting tool for Travis Ranch HOA (Kaufman County, TX). Helps residents report the most egregious compliance violations — overgrown yards, junk/bulk trash, and unauthorized vehicles — while giving property owners a heads-up to address issues before official enforcement.

## How It Works

1. Residents verify their phone number via SMS
2. Select one of 3 violation categories, enter the property address, and upload photos
3. The property owner receives a courtesy text notification
4. If 3+ separate residents report the same property, it escalates to the compliance team's priority queue
5. Compliance team manages the queue from the admin dashboard

## Key Features

- **Phone verification** — prevents anonymous abuse
- **3-complaint threshold** — properties only enter the compliance queue after 3 distinct residents report them
- **AI photo analysis** — validates photos match the selected category and scores severity
- **Courtesy notifications** — property owners get a heads-up text, not an official violation
- **Admin dashboard** — compliance queue sorted by priority, property detail views, board reports
- **Rate limiting** — 5 reports per day per phone number
- **Partial anonymity** — reporter identity is hidden from property owners, visible to admin only

## Tech Stack

- **Next.js 16** (App Router)
- **Prisma + SQLite** (PostgreSQL-ready for production)
- **Twilio** (SMS verification and notifications)
- **OpenAI GPT-4o** (photo analysis and priority scoring)
- **Tailwind CSS** (mobile-first UI)

## Local Development

```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Create database
npx prisma db push

# Copy env and fill in your keys
cp .env.example .env

# Start dev server
npm run dev
```

Open http://localhost:3000

**Admin dashboard:** http://localhost:3000/admin
Default login: `admin` / `TravisRanch2024!`

### Demo Mode

With placeholder API keys, the app runs in demo mode:
- SMS codes are printed to the console (and returned in the API response)
- AI analysis returns mock results
- Notifications are logged to the console instead of sending real texts

## Deploy to Digital Ocean

### Quick Deploy

1. Create an Ubuntu 22.04+ droplet (1GB RAM minimum)
2. SSH into the droplet
3. Run:

```bash
curl -sL https://raw.githubusercontent.com/YOURUSER/compliance-app/main/deploy.sh -o deploy.sh
chmod +x deploy.sh
./deploy.sh https://github.com/YOURUSER/compliance-app.git
```

4. Edit `/opt/compliance-app/.env` with your real API keys
5. Restart: `cd /opt/compliance-app && docker compose up -d --build`

### Add SSL (HTTPS)

```bash
./setup-ssl.sh compliance.travisranchlife.com
```

Requires DNS A record pointing to the droplet's IP.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | SQLite path (`file:./dev.db`) |
| `TWILIO_ACCOUNT_SID` | For SMS | Twilio account SID |
| `TWILIO_AUTH_TOKEN` | For SMS | Twilio auth token |
| `TWILIO_PHONE_NUMBER` | For SMS | Twilio phone number (with country code) |
| `OPENAI_API_KEY` | For AI | OpenAI API key |
| `ADMIN_JWT_SECRET` | Yes | Random string for JWT signing |
| `PROPERTY_MANAGER_PHONE` | For alerts | PM phone number |
| `COMPLIANCE_DIRECTOR_PHONE` | For alerts | Compliance director phone |
| `SNAP_HOA_API_URL` | Future | Snap HOA API endpoint |
| `SNAP_HOA_API_KEY` | Future | Snap HOA API key |

## Snap HOA Integration

The Snap HOA API integration is stubbed out in `src/lib/snap-hoa.ts`. When API credentials are available, update the placeholder functions to make real API calls for property owner lookup.
