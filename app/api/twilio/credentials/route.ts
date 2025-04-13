import { NextResponse } from 'next/server';
import { writeFile, readFile } from 'fs/promises';
import { resolve } from 'path';
import { existsSync } from 'fs';

export async function GET() {
  try {
    const envPath = resolve(process.cwd(), '.env');
    
    if (!existsSync(envPath)) {
      return NextResponse.json({
        accountSid: '',
        authToken: ''
      });
    }
    
    const envContent = await readFile(envPath, 'utf-8');
    
    // Extract the Twilio credentials using regex
    const accountSidMatch = envContent.match(/TWILIO_ACCOUNT_SID="([^"]+)"/);
    const authTokenMatch = envContent.match(/TWILIO_AUTH_TOKEN="([^"]+)"/);
    
    const accountSid = accountSidMatch?.[1] || '';
    const authToken = authTokenMatch?.[1] || '';

    // Return obfuscated credentials for display in the UI
    // Keep first 4 and last 4 characters visible
    const obfuscatedSid = accountSid ? 
      `${accountSid.substring(0, 4)}${'*'.repeat(Math.max(0, accountSid.length - 8))}${accountSid.substring(accountSid.length - 4)}` : 
      '';
    
    const obfuscatedToken = authToken ? 
      `${authToken.substring(0, 4)}${'*'.repeat(Math.max(0, authToken.length - 8))}${authToken.substring(authToken.length - 4)}` : 
      '';

    return NextResponse.json({
      accountSid: obfuscatedSid,
      authToken: obfuscatedToken
    });
  } catch (error) {
    console.error('Error reading credentials:', error);
    return NextResponse.json(
      { error: 'Failed to read credentials' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { accountSid, authToken } = await request.json();

    if (!accountSid || !authToken) {
      return NextResponse.json(
        { error: 'Account SID and Auth Token are required' },
        { status: 400 }
      );
    }

    // Create or update the .env file
    const envPath = resolve(process.cwd(), '.env');
    
    // Read existing .env file or create a new one
    let envContent = '';
    const envExists = existsSync(envPath);
    
    if (envExists) {
      const existingContent = await readFile(envPath, 'utf-8');
      
      // Remove existing Twilio credentials if they exist
      envContent = existingContent
        .replace(/^\s*TWILIO_ACCOUNT_SID=.*$/m, '')
        .replace(/^\s*TWILIO_AUTH_TOKEN=.*$/m, '')
        .replace(/\n\n+/g, '\n')  // Remove multiple consecutive blank lines
        .trim();
      
      if (envContent) {
        envContent += '\n\n';
      }
    }
    
    // Add a comment and the Twilio credentials
    if (!envContent.includes('# Twilio credentials')) {
      envContent += '# Twilio credentials\n';
    }
    
    envContent += `TWILIO_ACCOUNT_SID="${accountSid}"\n`;
    envContent += `TWILIO_AUTH_TOKEN="${authToken}"\n`;

    await writeFile(envPath, envContent);

    // In development, Next.js doesn't automatically reload environment variables
    // The client will handle reloading the page

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving credentials:', error);
    return NextResponse.json(
      { error: 'Failed to save credentials' },
      { status: 500 }
    );
  }
} 