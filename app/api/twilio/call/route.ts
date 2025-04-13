import twilioClient from "@/lib/twilio";

export async function POST(req: Request) {
  if (!twilioClient) {
    return Response.json(
      { error: "Twilio client not initialized" },
      { status: 500 }
    );
  }

  try {
    const { phoneNumber } = await req.json();
    
    if (!phoneNumber) {
      return Response.json(
        { error: "Phone number is required" },
        { status: 400 }
      );
    }

    // Check if we have a webhook URL configured
    let twimlUrl = process.env.TWILIO_WEBHOOK_URL;
    
    // If not, try to get it from the server
    if (!twimlUrl) {
      try {
        const webhookResponse = await fetch("http://websocket-server-callsmatic.callsmatic.com/public-url");
        if (webhookResponse.ok) {
          const data = await webhookResponse.json();
          const publicUrl = data.publicUrl;
          
          if (publicUrl) {
            twimlUrl = `${publicUrl}/twiml`;
          } else {
            return Response.json(
              { error: "Public URL not configured. Make sure ngrok is running and PUBLIC_URL is set in websocket-server/.env" },
              { status: 400 }
            );
          }
        } else {
          return Response.json(
            { error: "Could not connect to websocket server. Make sure it's running." },
            { status: 500 }
          );
        }
      } catch (error) {
        return Response.json(
          { error: "Could not determine TwiML URL. Check your websocket server configuration." },
          { status: 500 }
        );
      }
    }
    
    // Ensure twimlUrl exists and is valid
    if (!twimlUrl) {
      return Response.json(
        { error: "TwiML URL not configured. Set TWILIO_WEBHOOK_URL or PUBLIC_URL." },
        { status: 400 }
      );
    }
    
    // Get a valid from number - either from env or fetch the first available number
    let fromNumber = process.env.TWILIO_PHONE_NUMBER;
    
    if (!fromNumber) {
      // Get the first available phone number
      const incomingPhoneNumbers = await twilioClient.incomingPhoneNumbers.list({
        limit: 1,
      });
      
      if (incomingPhoneNumbers.length === 0) {
        return Response.json(
          { error: "No phone numbers available for outbound calling" },
          { status: 400 }
        );
      }
      
      fromNumber = incomingPhoneNumbers[0].phoneNumber;
    }
    
    console.log(`Making outbound call: from=${fromNumber}, to=${phoneNumber}, url=${twimlUrl}`);
    
    const call = await twilioClient.calls.create({
      to: phoneNumber,
      from: fromNumber,
      url: twimlUrl,
    });

    return Response.json({ success: true, callSid: call.sid });
  } catch (error) {
    console.error("Error making outbound call:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to make outbound call" },
      { status: 500 }
    );
  }
} 