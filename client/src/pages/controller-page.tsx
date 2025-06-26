import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { Logo } from "@/components/ui/logo";

export default function ControllerPage() {
  const { logoutMutation } = useAuth();

  const handleDownload = async () => {
    try {
      const response = await fetch("/api/scanlogs/download", {
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error("Download failed");
      }

      // Create a blob from the response
      const blob = await response.blob();
      
      // Create a link element and trigger download
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = "scan_logs.xlsx";
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Download error:", error);
    }
  };

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex flex-col items-center gap-4">
          <Logo />
          <div className="flex justify-between items-center w-full">
            <h1 className="text-2xl font-bold">Access Controller Dashboard</h1>
            <Button variant="outline" onClick={() => logoutMutation.mutate()}>
              Logout
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Download Scan Logs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-muted-foreground">
                Download the Excel file containing all QR code scan logs with timestamps.
              </p>
              <Button onClick={handleDownload} className="w-full">
                <Download className="w-4 h-4 mr-2" />
                Download Excel File
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
