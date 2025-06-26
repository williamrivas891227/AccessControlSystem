import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useRef } from "react";
import { apiRequest } from "@/lib/queryClient";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Html5Qrcode } from "html5-qrcode";
import { Logo } from "@/components/ui/logo";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ScanResult = {
  authorized: boolean;
  type?: 'Entry' | 'Exit';
  isPending?: boolean;
  code?: string;
  personName?: string;
};

export default function SecurityPage() {
  const { user, logoutMutation } = useAuth();
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [cameraError, setCameraError] = useState(false);
  const [showMessage, setShowMessage] = useState(false);
  const messageTimerRef = useRef<NodeJS.Timeout>();
  const { toast } = useToast();
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>("");

  useEffect(() => {
    const loadCameras = async () => {
      try {
        const devices = await Html5Qrcode.getCameras();
        console.log("Available cameras:", devices);

        // Find rear camera
        const rearCamera = devices.find(device =>
          device.label.toLowerCase().includes('back') ||
          device.label.toLowerCase().includes('rear') ||
          device.label.toLowerCase().includes('environment')
        );

        setCameras(devices);

        if (rearCamera) {
          setSelectedCamera(rearCamera.id);
          setScanning(true);
        } else if (devices.length > 0) {
          setSelectedCamera(devices[0].id);
        }
      } catch (err) {
        console.error("Error loading cameras:", err);
        setCameraError(true);
      }
    };

    loadCameras();
  }, []);

  useEffect(() => {
    if (!selectedCamera || !scanning) {
      if (scannerRef.current) {
        console.log("Stopping scanner");
        scannerRef.current.stop()
          .then(() => {
            scannerRef.current = null;
          })
          .catch(err => console.error("Error stopping scanner:", err));
      }
      return;
    }

    console.log("Starting scanner with camera:", selectedCamera);

    const startScanner = async () => {
      try {
        if (scannerRef.current) {
          console.log("Stopping previous scanner instance");
          await scannerRef.current.stop();
          scannerRef.current = null;
        }

        console.log("Initializing new scanner instance");
        const scanner = new Html5Qrcode("qr-reader");
        scannerRef.current = scanner;

        await scanner.start(
          selectedCamera,
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1,
          },
          handleScan,
          (error) => {
            console.error("QR Scan error:", error);
            if (error.includes("NotFoundError")) {
              setCameraError(true);
            }
          }
        );
        console.log("Scanner started successfully");
      } catch (err) {
        console.error("Scanner error:", err);
        setCameraError(true);
      }
    };

    startScanner();

    return () => {
      if (scannerRef.current) {
        console.log("Cleaning up scanner");
        scannerRef.current.stop()
          .catch(err => console.error("Error stopping scanner:", err));
      }
    };
  }, [selectedCamera, scanning]);

  useEffect(() => {
    return () => {
      if (messageTimerRef.current) {
        clearTimeout(messageTimerRef.current);
      }
    };
  }, []);

  const handleScan = async (decodedText: string) => {
    if (!decodedText) return;

    try {
      setScanning(false);
      if (scannerRef.current) {
        await scannerRef.current.stop();
        scannerRef.current = null;
      }

      const res = await apiRequest("POST", "/api/verify", { code: decodedText });
      const data: ScanResult = await res.json();
      // Set result with isPending true if the code is valid
      setResult({ ...data, isPending: data.authorized });

      if (!data.authorized) {
        toast({
          title: 'Access Denied',
          description: 'Invalid QR code',
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Verification error:", error);
      toast({
        title: "Error",
        description: "Unable to verify QR code",
        variant: "destructive",
      });
      setScanning(true);
    }
  };

  const handleAuthorization = async (authorized: boolean) => {
    if (!result) return;

    try {
      const res = await apiRequest("POST", "/api/authorize", {
        code: result.code,
        authorized
      });
      const data = await res.json();

      setResult({
        ...data,
        isPending: false
      });

      // Show temporary message
      setShowMessage(true);
      if (messageTimerRef.current) {
        clearTimeout(messageTimerRef.current);
      }
      messageTimerRef.current = setTimeout(() => {
        setShowMessage(false);
      }, 5000);

    } catch (error) {
      console.error("Authorization error:", error);
      toast({
        title: "Error",
        description: "Failed to process authorization",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-md mx-auto space-y-4">
        <div className="flex flex-col items-center gap-4">
          <Logo />
          <div className="flex justify-between items-center w-full">
            <h1 className="text-2xl font-bold">Security Dashboard</h1>
            <Button variant="outline" onClick={() => logoutMutation.mutate()}>
              Logout
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>QR Code Scanner</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {cameras.length > 0 && (
              <div className="w-full">
                <Select
                  value={selectedCamera}
                  onValueChange={(value) => {
                    setSelectedCamera(value);
                    setScanning(true);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select camera" />
                  </SelectTrigger>
                  <SelectContent>
                    {cameras.map((camera) => (
                      <SelectItem key={camera.id} value={camera.id}>
                        {camera.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="relative aspect-square w-full max-w-sm mx-auto rounded-lg overflow-hidden bg-muted">
              {cameraError ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
                  <AlertCircle className="h-12 w-12 mb-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mb-4">
                    Unable to access camera. Please verify browser permissions.
                  </p>
                  <Button onClick={() => {
                    setCameraError(false);
                    setScanning(true);
                  }}>
                    Retry
                  </Button>
                </div>
              ) : (
                <>
                  <div
                    id="qr-reader"
                    className="w-full h-full"
                    style={{
                      width: '100%',
                      height: '100%',
                      position: 'relative'
                    }}
                  />
                  {result && !scanning && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/95 gap-4">
                      {!result.isPending ? (
                        // Show final result after security's decision
                        <>
                          {showMessage ? (
                            <div className="text-center">
                              <h2 className="text-2xl font-bold mb-2">
                                {result.authorized
                                  ? `${result.personName} has been authorized to ${result.type?.toLowerCase()}`
                                  : `${result.personName} has not been authorized to ${result.type?.toLowerCase()}`}
                              </h2>
                            </div>
                          ) : (
                            <>
                              {result.authorized ? (
                                <>
                                  <CheckCircle2 className="h-16 w-16 text-green-500" />
                                  <h2 className="text-2xl font-bold text-green-500">
                                    {result.type === 'Entry' ? 'Access Authorized' : 'Exit Authorized'}
                                  </h2>
                                </>
                              ) : (
                                <>
                                  <AlertCircle className="h-16 w-16 text-red-500" />
                                  <h2 className="text-2xl font-bold text-red-500">
                                    Access Denied
                                  </h2>
                                </>
                              )}
                            </>
                          )}
                          <Button
                            onClick={() => {
                              setScanning(true);
                              setResult(null);
                              setShowMessage(false);
                            }}
                          >
                            Scan Again
                          </Button>
                        </>
                      ) : (
                        // Show authorization buttons when waiting for security's decision
                        <>
                          <div className="text-center space-y-4">
                            <h2 className="text-2xl font-bold">Valid QR Code Detected</h2>
                            <p className="text-muted-foreground">
                              Please authorize or deny {result.type?.toLowerCase()} for {result.personName}
                            </p>
                          </div>
                          <div className="flex flex-col gap-4 w-full px-8">
                            <Button
                              variant="default"
                              onClick={() => handleAuthorization(true)}
                              className="w-full"
                            >
                              Authorize {result.personName} to {result.type === 'Entry' ? 'enter' : 'exit'} the Area
                            </Button>
                            <Button
                              variant="destructive"
                              onClick={() => handleAuthorization(false)}
                              className="w-full"
                            >
                              Do Not Authorize {result.personName} to {result.type?.toLowerCase()}
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}