"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Circle, CheckCircle, Loader2, Eye, EyeOff } from "lucide-react";
import { PhoneNumber } from "@/components/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function ChecklistAndConfig({
  ready,
  setReady,
  selectedPhoneNumber,
  setSelectedPhoneNumber,
}: {
  ready: boolean;
  setReady: (val: boolean) => void;
  selectedPhoneNumber: string;
  setSelectedPhoneNumber: (val: string) => void;
}) {
  const [hasCredentials, setHasCredentials] = useState(false);
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([]);
  const [currentNumberSid, setCurrentNumberSid] = useState("");
  const [currentVoiceUrl, setCurrentVoiceUrl] = useState("");
  const [accountSid, setAccountSid] = useState("");
  const [authToken, setAuthToken] = useState("");
  const [showCredentials, setShowCredentials] = useState(false);
  const [savingCredentials, setSavingCredentials] = useState(false);

  const [publicUrl, setPublicUrl] = useState("");
  const [localServerUp, setLocalServerUp] = useState(false);
  const [publicUrlAccessible, setPublicUrlAccessible] = useState(false);

  const [allChecksPassed, setAllChecksPassed] = useState(false);
  const [webhookLoading, setWebhookLoading] = useState(false);
  const [ngrokLoading, setNgrokLoading] = useState(false);

  const appendedTwimlUrl = publicUrl ? `${publicUrl}/twiml` : "";
  const isWebhookMismatch =
    appendedTwimlUrl && currentVoiceUrl && appendedTwimlUrl !== currentVoiceUrl;

  useEffect(() => {
    let polling = true;

    const pollChecks = async () => {
      try {
        // 1. Check credentials
        let res = await fetch("/api/twilio");
        if (!res.ok) throw new Error("Failed credentials check");
        const credData = await res.json();
        setHasCredentials(!!credData?.credentialsSet);

        // If we have credentials, try to get the raw values (will be redacted for display)
        if (credData?.credentialsSet) {
          try {
            const credsRes = await fetch("/api/twilio/credentials");
            if (credsRes.ok) {
              const { accountSid: sid, authToken: token } = await credsRes.json();
              if (sid) setAccountSid(sid);
              if (token) setAuthToken(token);
            }
          } catch (err) {
            console.error("Error fetching credentials:", err);
          }
        }

        // 2. Fetch numbers
        res = await fetch("/api/twilio/numbers");
        if (!res.ok) throw new Error("Failed to fetch phone numbers");
        const numbersData = await res.json();
        if (Array.isArray(numbersData) && numbersData.length > 0) {
          setPhoneNumbers(numbersData);
          // If currentNumberSid not set or not in the list, use first
          const selected =
            numbersData.find((p: PhoneNumber) => p.sid === currentNumberSid) ||
            numbersData[0];
          setCurrentNumberSid(selected.sid);
          setCurrentVoiceUrl(selected.voiceUrl || "");
          setSelectedPhoneNumber(selected.friendlyName || "");
        }

        // 3. Check local server & public URL
        let foundPublicUrl = "";
        try {
          const resLocal = await fetch("https://websocket-server-callsmatic.callsmatic.com/public-url");
          if (resLocal.ok) {
            const pubData = await resLocal.json();
            foundPublicUrl = pubData?.publicUrl || "";
            setLocalServerUp(true);
            setPublicUrl(foundPublicUrl);
          } else {
            throw new Error("Local server not responding");
          }
        } catch {
          setLocalServerUp(false);
          setPublicUrl("");
        }
      } catch (err) {
        console.error(err);
      }
    };

    pollChecks();
    const intervalId = setInterval(() => polling && pollChecks(), 1000);
    return () => {
      polling = false;
      clearInterval(intervalId);
    };
  }, [currentNumberSid, setSelectedPhoneNumber]);

  const updateWebhook = async () => {
    if (!currentNumberSid || !appendedTwimlUrl) return;
    try {
      setWebhookLoading(true);
      const res = await fetch("/api/twilio/numbers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumberSid: currentNumberSid,
          voiceUrl: appendedTwimlUrl,
        }),
      });
      if (!res.ok) throw new Error("Failed to update webhook");
      setCurrentVoiceUrl(appendedTwimlUrl);
    } catch (err) {
      console.error(err);
    } finally {
      setWebhookLoading(false);
    }
  };

  const checkNgrok = async () => {
    if (!localServerUp || !publicUrl) return;
    setNgrokLoading(true);
    let success = false;
    for (let i = 0; i < 5; i++) {
      try {
        const resTest = await fetch(publicUrl + "/public-url");
        if (resTest.ok) {
          setPublicUrlAccessible(true);
          success = true;
          break;
        }
      } catch {
        // retry
      }
      if (i < 4) {
        await new Promise((r) => setTimeout(r, 3000));
      }
    }
    if (!success) {
      setPublicUrlAccessible(false);
    }
    setNgrokLoading(false);
  };

  const checklist = useMemo(() => {
    return [
      {
        label: "Set up Twilio account",
        done: hasCredentials,
        description: "Enter your Twilio credentials or update them in webapp/.env",
        field: (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Button
                className="w-full"
                onClick={() => window.open("https://console.twilio.com/", "_blank")}
              >
                Open Twilio Console
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowCredentials(!showCredentials)}
              >
                {showCredentials ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            {(showCredentials || !hasCredentials) && (
              <div className="space-y-2">
                <div className="space-y-1">
                  <div className="text-xs text-gray-500">Account SID</div>
                  <Input
                    placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    value={accountSid}
                    onChange={(e) => setAccountSid(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-gray-500">Auth Token</div>
                  <Input
                    placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    value={authToken}
                    onChange={(e) => setAuthToken(e.target.value)}
                    type={showCredentials ? "text" : "password"}
                  />
                </div>
                <Button 
                  onClick={async () => {
                    if (!accountSid || !authToken) return;
                    try {
                      setSavingCredentials(true);
                      const res = await fetch("/api/twilio/credentials", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          accountSid,
                          authToken,
                        }),
                      });
                      if (!res.ok) throw new Error("Failed to save credentials");
                      // Refresh the page to apply the new credentials
                      window.location.reload();
                    } catch (err) {
                      console.error(err);
                    } finally {
                      setSavingCredentials(false);
                    }
                  }}
                  disabled={!accountSid || !authToken || savingCredentials}
                  className="w-full"
                >
                  {savingCredentials ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    hasCredentials ? "Update Credentials" : "Save Credentials"
                  )}
                </Button>
              </div>
            )}
            {hasCredentials && !showCredentials && (
              <div className="text-xs text-green-500 mt-1">
                Credentials configured. Click the eye icon to edit.
              </div>
            )}
          </div>
        ),
      },
      {
        label: "Set up Twilio phone number",
        done: phoneNumbers.length > 0,
        description: "Costs around $1.15/month",
        field:
          phoneNumbers.length > 0 ? (
            phoneNumbers.length === 1 ? (
              <Input value={phoneNumbers[0].friendlyName || ""} disabled />
            ) : (
              <Select
                onValueChange={(value) => {
                  setCurrentNumberSid(value);
                  const selected = phoneNumbers.find((p) => p.sid === value);
                  if (selected) {
                    setSelectedPhoneNumber(selected.friendlyName || "");
                    setCurrentVoiceUrl(selected.voiceUrl || "");
                  }
                }}
                value={currentNumberSid}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a phone number" />
                </SelectTrigger>
                <SelectContent>
                  {phoneNumbers.map((phone) => (
                    <SelectItem key={phone.sid} value={phone.sid}>
                      {phone.friendlyName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )
          ) : (
            <Button
              className="w-full"
              onClick={() =>
                window.open(
                  "https://console.twilio.com/us1/develop/phone-numbers/manage/incoming",
                  "_blank"
                )
              }
            >
              Set up Twilio phone number
            </Button>
          ),
      },
      {
        label: "Configure Twilio calling number",
        done: phoneNumbers.length > 0,
        description: "Add TWILIO_PHONE_NUMBER to webapp/.env",
        field: (
          <Input
            value={selectedPhoneNumber}
            disabled
            className="w-full"
            placeholder="Will use first available number"
          />
        ),
      },
      {
        label: "Start local WebSocket server",
        done: localServerUp,
        description: "cd websocket-server && npm run dev",
        field: null,
      },
      {
        label: "Start ngrok",
        done: publicUrlAccessible,
        description: "Then set ngrok URL in websocket-server/.env",
        field: (
          <div className="flex items-center gap-2 w-full">
            <div className="flex-1">
              <Input value={publicUrl} disabled />
            </div>
            <div className="flex-1">
              <Button
                variant="outline"
                onClick={checkNgrok}
                disabled={ngrokLoading || !localServerUp || !publicUrl}
                className="w-full"
              >
                {ngrokLoading ? (
                  <Loader2 className="mr-2 h-4 animate-spin" />
                ) : (
                  "Check ngrok"
                )}
              </Button>
            </div>
          </div>
        ),
      },
      {
        label: "Update Twilio webhook URL",
        done: !!publicUrl && !isWebhookMismatch,
        description: "Can also be done manually in Twilio console",
        field: (
          <div className="flex items-center gap-2 w-full">
            <div className="flex-1">
              <Input value={currentVoiceUrl} disabled className="w-full" />
            </div>
            <div className="flex-1">
              <Button
                onClick={updateWebhook}
                disabled={webhookLoading}
                className="w-full"
              >
                {webhookLoading ? (
                  <Loader2 className="mr-2 h-4 animate-spin" />
                ) : (
                  "Update Webhook"
                )}
              </Button>
            </div>
          </div>
        ),
      },
    ];
  }, [
    hasCredentials,
    phoneNumbers,
    currentNumberSid,
    localServerUp,
    publicUrl,
    publicUrlAccessible,
    currentVoiceUrl,
    isWebhookMismatch,
    appendedTwimlUrl,
    webhookLoading,
    ngrokLoading,
    setSelectedPhoneNumber,
    selectedPhoneNumber,
    showCredentials,
    accountSid,
    authToken,
    savingCredentials,
  ]);

  useEffect(() => {
    setAllChecksPassed(checklist.every((item) => item.done));
  }, [checklist]);

  useEffect(() => {
    if (!ready) {
      checkNgrok();
    }
  }, [localServerUp, ready]);

  useEffect(() => {
    if (!allChecksPassed) {
      setReady(false);
    }
  }, [allChecksPassed, setReady]);

  const handleDone = () => setReady(true);

  return (
    <Dialog open={!ready}>
      <DialogContent className="w-full max-w-[800px]">
        <DialogHeader>
          <DialogTitle>Setup Checklist</DialogTitle>
          <DialogDescription>
            This sample app requires a few steps before you get started
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-0">
          {checklist.map((item, i) => (
            <div
              key={i}
              className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 py-2"
            >
              <div className="flex flex-col">
                <div className="flex items-center gap-2 mb-1">
                  {item.done ? (
                    <CheckCircle className="text-green-500" />
                  ) : (
                    <Circle className="text-gray-400" />
                  )}
                  <span className="font-medium">{item.label}</span>
                </div>
                {item.description && (
                  <p className="text-sm text-gray-500 ml-8">
                    {item.description}
                  </p>
                )}
              </div>
              <div className="flex items-center mt-2 sm:mt-0">{item.field}</div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-col sm:flex-row sm:justify-end">
          <Button
            variant="outline"
            onClick={handleDone}
            disabled={!allChecksPassed}
          >
            Let's go!
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
