'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Database, DatabaseIcon } from 'lucide-react';
import { setDatabaseUrl as setDatabaseUrlAction } from '@/app/(app)/database-url-action';

export function DatabaseUrlInput() {
  const [databaseUrl, setDatabaseUrl] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = async () => {
    if (!databaseUrl.trim()) return;

    setIsConnecting(true);

    try {
      // Use server action to set the database URL cookie
      await setDatabaseUrlAction(databaseUrl);
    } catch (error) {
      console.error('Failed to save database URL:', error);
      setIsConnecting(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleConnect();
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="w-full max-w-md p-6 space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-tertiary/10">
            <Database className="h-6 w-6 text-primary" />
          </div>
          <h2 className="font-semibold">Database Connection</h2>
          <p className="text-muted-foreground text-sm">Enter your PostgreSQL database URL to connect</p>
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="database-url" className="flex items-center gap-2 sr-only">
              <DatabaseIcon className="h-4 w-4" />
              Database URL
            </Label>
            <Input
              id="database-url"
              type="password"
              placeholder="postgresql://username:password@localhost:5432/database"
              value={databaseUrl}
              onChange={e => setDatabaseUrl(e.target.value)}
              onKeyPress={handleKeyPress}
              className="font-mono text-sm"
            />
          </div>
          <Button onClick={handleConnect} disabled={!databaseUrl.trim() || isConnecting} className="w-full">
            {isConnecting ? 'Connecting...' : 'Connect'}
          </Button>
          <p className="text-xs text-muted-foreground text-center">This URL will be stored securely in a session cookie and will be cleared when you close your browser.</p>
        </div>
      </div>
    </div>
  );
}
