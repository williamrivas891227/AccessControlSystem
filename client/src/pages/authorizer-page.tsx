import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Upload } from "lucide-react";
import { Logo } from "@/components/ui/logo"; 
//Assuming Logo component is in "@/components/ui/logo"

export default function AuthorizerPage() {
  const { user, logoutMutation } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleUpload = async () => {
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      setUploading(true);
      await fetch("/api/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      toast({
        title: "Success",
        description: "Access codes uploaded successfully",
      });
      setFile(null);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to upload access codes",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex flex-col items-center gap-4">
          <Logo />
          <div className="flex justify-between items-center w-full">
            <h1 className="text-2xl font-bold">Authorizer Dashboard</h1>
            <Button variant="outline" onClick={() => logoutMutation.mutate()}>
              Logout
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Upload Access Codes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <Input
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
              <Button
                onClick={handleUpload}
                disabled={!file || uploading}
                className="whitespace-nowrap"
              >
                {uploading ? (
                  "Uploading..."
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload
                  </>
                )}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Upload an Excel file with access codes in column A. Each code should be 8 characters long.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}