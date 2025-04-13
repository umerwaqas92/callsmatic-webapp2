// PhoneNumberChecklist.tsx
"use client";

import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { CheckCircle, Circle, Eye, EyeOff, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

type PhoneNumberChecklistProps = {
  selectedPhoneNumber: string;
  allConfigsReady: boolean;
  setAllConfigsReady: (ready: boolean) => void;
};

const PhoneNumberChecklist: React.FC<PhoneNumberChecklistProps> = ({
  selectedPhoneNumber,
  allConfigsReady,
  setAllConfigsReady,
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [showOutboundDialog, setShowOutboundDialog] = useState(false);
  const [outboundNumber, setOutboundNumber] = useState("");
  const [isCallInProgress, setIsCallInProgress] = useState(false);
  const [callError, setCallError] = useState("");
  const [callSuccess, setCallSuccess] = useState(false);

  const handleOutboundCall = async () => {
    if (!outboundNumber) return;
    
    setIsCallInProgress(true);
    setCallError("");
    setCallSuccess(false);
    
    try {
      const storedAccountSid = localStorage.getItem('TWILIO_ACCOUNT_SID');
      const storedAuthToken = localStorage.getItem('TWILIO_AUTH_TOKEN');
      
      if (!storedAccountSid || !storedAuthToken) {
        throw new Error("Twilio credentials not found. Please configure them in the checklist.");
      }

      const response = await fetch("/api/twilio/call", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Twilio-Account-Sid": storedAccountSid,
          "X-Twilio-Auth-Token": storedAuthToken
        },
        body: JSON.stringify({ phoneNumber: outboundNumber }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to make call");
      }
      
      setCallSuccess(true);
      // Leave dialog open to show success message for 2 seconds
      setTimeout(() => {
        setShowOutboundDialog(false);
        setOutboundNumber("");
      }, 2000);
    } catch (error) {
      setCallError(error instanceof Error ? error.message : "Failed to make call");
    } finally {
      setIsCallInProgress(false);
    }
  };

  return (
    <>
      <Card className="flex items-center justify-between p-4">
        <div className="flex flex-col">
          <span className="text-sm text-gray-500">Number</span>
          <div className="flex items-center">
            <span className="font-medium w-36">
              {isVisible ? selectedPhoneNumber || "None" : "••••••••••"}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsVisible(!isVisible)}
              className="h-8 w-8"
            >
              {isVisible ? (
                <Eye className="h-4 w-4" />
              ) : (
                <EyeOff className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {allConfigsReady ? (
              <CheckCircle className="text-green-500 w-4 h-4" />
            ) : (
              <Circle className="text-gray-400 w-4 h-4" />
            )}
            <span className="text-sm text-gray-700">
              {allConfigsReady ? "Setup Ready" : "Setup Not Ready"}
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAllConfigsReady(false)}
          >
            Checklist
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={() => setShowOutboundDialog(true)}
            disabled={!allConfigsReady}
            className="gap-1"
          >
            <Phone className="h-4 w-4 mr-1" /> Call
          </Button>
        </div>
      </Card>

      <Dialog open={showOutboundDialog} onOpenChange={(open) => {
        if (!open) {
          setCallError("");
          setCallSuccess(false);
        }
        setShowOutboundDialog(open);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Make Outbound Call</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {callSuccess ? (
              <div className="bg-green-50 p-4 rounded-md mb-4">
                <p className="text-green-800 font-medium">Call initiated successfully!</p>
                <p className="text-sm text-green-700">The call is being connected...</p>
              </div>
            ) : (
              <p className="text-sm text-gray-600 mb-4">
                Enter a phone number to call. The AI assistant will call this number 
                and start a conversation. Make sure your Twilio account has sufficient 
                credits for outbound calling.
              </p>
            )}
            
            <label className="text-sm font-medium mb-2 block">Phone Number</label>
            <Input
              value={outboundNumber}
              onChange={(e) => setOutboundNumber(e.target.value)}
              placeholder="+1234567890"
              className="mb-2"
              disabled={callSuccess}
            />
            {callError && (
              <div className="bg-red-50 p-3 rounded-md mt-2 mb-1">
                <p className="text-sm text-red-800">{callError}</p>
                {callError.includes("Public URL") && (
                  <p className="text-xs text-red-700 mt-1">
                    Make sure your ngrok tunnel is running and the PUBLIC_URL is set in 
                    websocket-server/.env file.
                  </p>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowOutboundDialog(false)}
              disabled={isCallInProgress}
            >
              {callSuccess ? "Close" : "Cancel"}
            </Button>
            {!callSuccess && (
              <Button 
                onClick={handleOutboundCall} 
                disabled={!outboundNumber || isCallInProgress}
              >
                {isCallInProgress ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Calling...
                  </>
                ) : "Call Now"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PhoneNumberChecklist;
