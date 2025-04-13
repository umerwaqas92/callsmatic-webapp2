import "server-only";
import twilio from "twilio";

export function createTwilioClient(accountSid?: string, authToken?: string) {
  if (!accountSid || !authToken) {
    console.warn("Twilio credentials not provided. Twilio client will be disabled.");
    return null;
  }
  return twilio(accountSid, authToken);
}

// Default client for backward compatibility
const { TWILIO_ACCOUNT_SID: accountSid, TWILIO_AUTH_TOKEN: authToken } = process.env;
export const twilioClient = accountSid && authToken ? twilio(accountSid, authToken) : null;
export default twilioClient;
