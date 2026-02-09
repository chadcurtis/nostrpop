import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { BarChart3, Save, Copy, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/useToast';

export function AnalyticsSettings() {
  const [googleAnalyticsId, setGoogleAnalyticsId] = useState('');
  const [isEnabled, setIsEnabled] = useState(false);
  const { toast } = useToast();

  // Load from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('bitpopart:analytics');
    if (stored) {
      try {
        const data = JSON.parse(stored);
        setGoogleAnalyticsId(data.googleAnalyticsId || '');
        setIsEnabled(data.enabled || false);
      } catch {
        // Ignore parse errors
      }
    }
  }, []);

  const handleSave = () => {
    const data = {
      googleAnalyticsId,
      enabled: isEnabled && googleAnalyticsId.trim() !== '',
    };
    
    localStorage.setItem('bitpopart:analytics', JSON.stringify(data));
    
    toast({
      title: 'Analytics settings saved',
      description: 'Refresh the page to apply Google Analytics tracking.',
    });
  };

  const copyGtagCode = () => {
    if (!googleAnalyticsId) return;
    
    const code = `<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=${googleAnalyticsId}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', '${googleAnalyticsId}');
</script>`;
    
    navigator.clipboard.writeText(code);
    toast({
      title: 'Code copied!',
      description: 'Google Analytics code copied to clipboard.',
    });
  };

  const currentStatus = isEnabled && googleAnalyticsId ? 'Active' : 'Not Configured';
  const statusColor = currentStatus === 'Active' ? 'bg-green-500' : 'bg-gray-400';

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Analytics Settings
              </CardTitle>
              <CardDescription>
                Configure Google Analytics for tracking site visitors
              </CardDescription>
            </div>
            <Badge variant={currentStatus === 'Active' ? 'default' : 'outline'}>
              <div className={`w-2 h-2 rounded-full ${statusColor} mr-2`} />
              {currentStatus}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              To enable Google Analytics, you need to add the tracking code to your index.html file manually.
              Enter your GA4 Measurement ID below and copy the code.
            </AlertDescription>
          </Alert>

          {/* Google Analytics ID */}
          <div className="space-y-2">
            <Label htmlFor="ga-id">Google Analytics Measurement ID</Label>
            <div className="flex gap-2">
              <Input
                id="ga-id"
                value={googleAnalyticsId}
                onChange={(e) => setGoogleAnalyticsId(e.target.value)}
                placeholder="G-XXXXXXXXXX"
                className="font-mono"
              />
              <Button
                variant="outline"
                onClick={copyGtagCode}
                disabled={!googleAnalyticsId}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Example: G-0D0LWD4FK3 (starts with G- for GA4)
            </p>
          </div>

          {/* Instructions */}
          <Card className="bg-muted">
            <CardContent className="pt-6">
              <h4 className="font-semibold text-sm mb-3">Setup Instructions:</h4>
              <ol className="text-sm space-y-2 list-decimal ml-4">
                <li>Create a Google Analytics 4 property at <a href="https://analytics.google.com" target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline">analytics.google.com</a></li>
                <li>Copy your Measurement ID (format: G-XXXXXXXXXX)</li>
                <li>Paste it above and click "Copy Code"</li>
                <li>Add the code to your <code className="bg-background px-1 rounded">index.html</code> file in the <code className="bg-background px-1 rounded">&lt;head&gt;</code> section</li>
                <li>Deploy your site to activate tracking</li>
              </ol>
            </CardContent>
          </Card>

          {googleAnalyticsId && (
            <Card className="border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/20">
              <CardHeader>
                <CardTitle className="text-sm">Your Google Analytics Code</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-xs bg-background p-4 rounded-lg overflow-x-auto">
{`<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=${googleAnalyticsId}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', '${googleAnalyticsId}');
</script>`}
                </pre>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={copyGtagCode}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Code
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Save Button */}
          <div className="flex gap-2">
            <Button onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              Save Settings
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
