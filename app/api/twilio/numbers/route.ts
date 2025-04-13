import { createTwilioClient } from "@/lib/twilio";
import { headers } from 'next/headers';

export async function GET() {
  const headersList = headers();
  const accountSid = headersList.get('x-twilio-account-sid');
  const authToken = headersList.get('x-twilio-auth-token');
  
  const twilioClient = createTwilioClient(accountSid || undefined, authToken || undefined);
  
  if (!twilioClient) {
    return Response.json(
      { error: "Twilio client not initialized" },
      { status: 500 }
    );
  }

  const incomingPhoneNumbers = await twilioClient.incomingPhoneNumbers.list({
    limit: 20,
  });
  return Response.json(incomingPhoneNumbers);
}

export async function POST(req: Request) {
  const headersList = headers();
  const accountSid = headersList.get('x-twilio-account-sid');
  const authToken = headersList.get('x-twilio-auth-token');
  
  const twilioClient = createTwilioClient(accountSid || undefined, authToken || undefined);
  
  if (!twilioClient) {
    return Response.json(
      { error: "Twilio client not initialized" },
      { status: 500 }
    );
  }

  const { phoneNumberSid, voiceUrl } = await req.json();
  const incomingPhoneNumber = await twilioClient
    .incomingPhoneNumbers(phoneNumberSid)
    .update({ voiceUrl });

  return Response.json(incomingPhoneNumber);
}
