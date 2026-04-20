import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;

const isDemoMode = !accountSid || accountSid === 'your_twilio_account_sid';

const client = isDemoMode ? null : twilio(accountSid, authToken);

export async function sendSMS(to: string, body: string): Promise<boolean> {
  if (isDemoMode) {
    console.log(`[DEMO MODE] SMS to ${to}: ${body}`);
    return true;
  }

  try {
    await client!.messages.create({
      body,
      from: fromNumber,
      to,
    });
    return true;
  } catch (error) {
    console.error('Failed to send SMS:', error);
    return false;
  }
}

export async function sendVerificationCode(phone: string, code: string): Promise<boolean> {
  return sendSMS(phone, `Your Travis Ranch Compliance verification code is: ${code}. This code expires in 10 minutes.`);
}

export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export { isDemoMode };
