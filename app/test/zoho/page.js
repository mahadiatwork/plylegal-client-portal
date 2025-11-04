"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ZohoTestPage() {
  const [contactId, setContactId] = useState("1915689000107084355");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [tokenStatus, setTokenStatus] = useState(null);
  const [verifyingToken, setVerifyingToken] = useState(false);
  const [contactData, setContactData] = useState({
    First_Name: "",
    Last_Name: "",
    Email: "",
    Phone: "",
    Mailing_Street: "",
    Mailing_City: "",
    Mailing_State: "",
    Mailing_Zip: "",
    Mailing_Country: "",
  });

  const fetchContact = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(`/api/test/zoho-get?contactId=${contactId}`);
      const data = await response.json();

      if (data.success && data.contact) {
        setContactData({
          First_Name: data.contact.First_Name || "",
          Last_Name: data.contact.Last_Name || "",
          Email: data.contact.Email || "",
          Phone: data.contact.Phone || "",
          Mailing_Street: data.contact.Mailing_Street || "",
          Mailing_City: data.contact.Mailing_City || "",
          Mailing_State: data.contact.Mailing_State || "",
          Mailing_Zip: data.contact.Mailing_Zip || "",
          Mailing_Country: data.contact.Mailing_Country || "",
        });
        setResult({ type: "fetch", data: data.contact });
      } else {
        const errorMsg = data.error || "Failed to fetch contact";
        const errorDetails = {
          message: errorMsg,
          code: data.errorCode,
          statusCode: data.statusCode,
          details: data.details,
        };
        setError(errorDetails);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateContact = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/test/zoho-update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contactId,
          ...contactData,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setResult({ type: "update", data: data.result });
      } else {
        const errorDetails = {
          message: data.error || "Failed to update contact",
          code: data.errorCode,
          statusCode: data.statusCode,
          details: data.details,
        };
        setError(errorDetails);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const verifyToken = async () => {
    setVerifyingToken(true);
    setTokenStatus(null);

    try {
      const response = await fetch("/api/test/zoho-verify-token");
      const data = await response.json();
      setTokenStatus(data);
    } catch (err) {
      setTokenStatus({
        success: false,
        error: err.message,
        tokenFetched: false,
        tokenValid: false,
      });
    } finally {
      setVerifyingToken(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-2xl">Zoho CRM Test - Contact Update</CardTitle>
          <p className="text-sm text-muted-foreground">
            Test page for updating Zoho CRM contacts. This is independent of the portal and Firebase.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Token Verification Section */}
          <div className="border-t pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-semibold">Access Token Status</Label>
                <p className="text-sm text-muted-foreground">
                  Verify if your Zoho access token is valid and working
                </p>
              </div>
              <Button 
                onClick={verifyToken} 
                disabled={verifyingToken}
                variant="outline"
              >
                {verifyingToken ? "Verifying..." : "Verify Token"}
              </Button>
            </div>

            {tokenStatus && (
              <div className={`p-4 rounded-lg border-2 ${
                tokenStatus.tokenValid 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-red-50 border-red-200'
              }`}>
                <div className="flex items-start gap-3">
                  <div className={`text-2xl ${tokenStatus.tokenValid ? 'text-green-600' : 'text-red-600'}`}>
                    {tokenStatus.tokenValid ? '✓' : '✗'}
                  </div>
                  <div className="flex-1 space-y-2">
                    <div>
                      <p className={`font-semibold ${tokenStatus.tokenValid ? 'text-green-800' : 'text-red-800'}`}>
                        {tokenStatus.tokenValid 
                          ? 'Access Token is Valid and Working' 
                          : 'Access Token is Invalid or Not Working'}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {tokenStatus.message || tokenStatus.error}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm mt-3">
                      <div>
                        <span className="font-medium">Token Fetched:</span>{' '}
                        <span className={tokenStatus.tokenFetched ? 'text-green-600' : 'text-red-600'}>
                          {tokenStatus.tokenFetched ? 'Yes' : 'No'}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium">Token Valid:</span>{' '}
                        <span className={tokenStatus.tokenValid ? 'text-green-600' : 'text-red-600'}>
                          {tokenStatus.tokenValid ? 'Yes' : 'No'}
                        </span>
                      </div>
                      {tokenStatus.tokenLength && (
                        <div>
                          <span className="font-medium">Token Length:</span>{' '}
                          {tokenStatus.tokenLength} characters
                        </div>
                      )}
                      {tokenStatus.tokenPreview && (
                        <div>
                          <span className="font-medium">Token Preview:</span>{' '}
                          <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">
                            {tokenStatus.tokenPreview}
                          </code>
                        </div>
                      )}
                    </div>

                    {tokenStatus.responseFormat && (
                      <details className="mt-3">
                        <summary className="cursor-pointer text-sm font-medium text-gray-700">
                          Response Format Details
                        </summary>
                        <div className="mt-2 text-xs bg-gray-50 p-3 rounded">
                          <pre>{JSON.stringify(tokenStatus.responseFormat, null, 2)}</pre>
                        </div>
                      </details>
                    )}

                    {tokenStatus.moduleInfo && (
                      <div className="mt-3 p-3 bg-white rounded border">
                        <p className="text-sm font-medium mb-2">Module Information:</p>
                        <p className="text-xs text-gray-600">
                          Successfully accessed {tokenStatus.moduleInfo.moduleName || 'Contacts'} module
                        </p>
                      </div>
                    )}
                    {tokenStatus.datacenter && (
                      <div className="mt-2 text-xs text-gray-600">
                        <span className="font-medium">Datacenter:</span> {tokenStatus.datacenter}
                      </div>
                    )}

                    {tokenStatus.errorDetails && (
                      <details className="mt-3">
                        <summary className="cursor-pointer text-sm font-medium text-red-700">
                          Error Details
                        </summary>
                        <div className="mt-2 text-xs bg-red-50 p-3 rounded">
                          <pre>{JSON.stringify(tokenStatus.errorDetails, null, 2)}</pre>
                        </div>
                      </details>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="border-t pt-4 space-y-2">
            <Label htmlFor="contactId">Contact ID</Label>
            <div className="flex gap-2">
              <Input
                id="contactId"
                value={contactId}
                onChange={(e) => setContactId(e.target.value)}
                placeholder="1915689000107084355"
              />
              <Button onClick={fetchContact} disabled={loading || !contactId}>
                Fetch Contact
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contact Data</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">First Name</Label>
              <Input
                id="first_name"
                value={contactData.First_Name}
                onChange={(e) =>
                  setContactData({ ...contactData, First_Name: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="last_name">Last Name</Label>
              <Input
                id="last_name"
                value={contactData.Last_Name}
                onChange={(e) =>
                  setContactData({ ...contactData, Last_Name: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={contactData.Email}
                onChange={(e) =>
                  setContactData({ ...contactData, Email: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={contactData.Phone}
                onChange={(e) =>
                  setContactData({ ...contactData, Phone: e.target.value })
                }
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="mailing_street">Mailing Street</Label>
              <Input
                id="mailing_street"
                value={contactData.Mailing_Street}
                onChange={(e) =>
                  setContactData({
                    ...contactData,
                    Mailing_Street: e.target.value,
                  })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="mailing_city">City</Label>
              <Input
                id="mailing_city"
                value={contactData.Mailing_City}
                onChange={(e) =>
                  setContactData({ ...contactData, Mailing_City: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="mailing_state">State</Label>
              <Input
                id="mailing_state"
                value={contactData.Mailing_State}
                onChange={(e) =>
                  setContactData({ ...contactData, Mailing_State: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="mailing_zip">Postcode</Label>
              <Input
                id="mailing_zip"
                value={contactData.Mailing_Zip}
                onChange={(e) =>
                  setContactData({ ...contactData, Mailing_Zip: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="mailing_country">Country</Label>
              <Input
                id="mailing_country"
                value={contactData.Mailing_Country}
                onChange={(e) =>
                  setContactData({
                    ...contactData,
                    Mailing_Country: e.target.value,
                  })
                }
              />
            </div>
          </div>

          <div className="pt-4">
            <Button
              onClick={updateContact}
              disabled={loading || !contactId}
              className="w-full"
            >
              {loading ? "Updating..." : "Update Contact"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card className="mt-6 border-red-500">
          <CardHeader>
            <CardTitle className="text-red-600">
              Error {error.statusCode ? `(${error.statusCode})` : ""}
              {error.code ? ` - ${error.code}` : ""}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-red-50 p-4 rounded">
              <p className="font-semibold text-red-800 mb-2">{error.message}</p>
              {error.code && (
                <p className="text-sm text-red-700 mb-2">
                  <strong>Error Code:</strong> {error.code}
                </p>
              )}
              {error.statusCode && (
                <p className="text-sm text-red-700 mb-2">
                  <strong>Status Code:</strong> {error.statusCode}
                </p>
              )}
            </div>
            {error.details && (
              <details className="mt-4">
                <summary className="cursor-pointer text-sm font-medium text-gray-700 mb-2">
                  Technical Details
                </summary>
                <pre className="text-xs bg-gray-50 p-4 rounded overflow-auto max-h-64">
                  {JSON.stringify(error.details, null, 2)}
                </pre>
              </details>
            )}
          </CardContent>
        </Card>
      )}

      {result && (
        <Card className="mt-6 border-green-500">
          <CardHeader>
            <CardTitle className="text-green-600">
              {result.type === "fetch" ? "Contact Fetched" : "Update Successful"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-sm bg-green-50 p-4 rounded overflow-auto max-h-96">
              {JSON.stringify(result.data, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

