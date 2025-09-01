'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Database, DatabaseIcon, AlertCircle } from 'lucide-react';
import { setDatabaseUrl as setDatabaseUrlAction } from '@/app/(app)/database-url-action';

export function DatabaseUrlInput() {
  const [databaseUrl, setDatabaseUrl] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Validate PostgreSQL connection URL
  const validateDatabaseUrl = (url: string): string | null => {
    if (!url.trim()) {
      return 'Database URL is required';
    }

    try {
      // Basic URL structure validation
      const urlObj = new URL(url);

      // Check if it's a valid URL
      if (!urlObj.protocol || !urlObj.hostname) {
        return 'Invalid URL format';
      }

      // Check if it's a PostgreSQL protocol
      if (!urlObj.protocol.startsWith('postgres')) {
        return 'URL must use postgres:// or postgresql:// protocol';
      }

      // Check if hostname is provided
      if (!urlObj.hostname || urlObj.hostname === '') {
        return 'Hostname is required';
      }

      // Check if port is valid (optional, but if provided should be a number)
      if (urlObj.port && (isNaN(Number(urlObj.port)) || Number(urlObj.port) <= 0)) {
        return 'Port must be a valid positive number';
      }

      // Check if database name is provided
      if (!urlObj.pathname || urlObj.pathname === '/' || urlObj.pathname === '') {
        return 'Database name is required';
      }

      return null;
    } catch (error) {
      return 'Invalid URL format';
    }
  };

  const handleConnect = async () => {
    // Clear previous validation errors
    setValidationError(null);

    // Validate URL before connecting
    const error = validateDatabaseUrl(databaseUrl);
    if (error) {
      setValidationError(error);
      return;
    }

    setIsConnecting(true);

    try {
      // Use server action to set the database URL cookie
      await setDatabaseUrlAction(databaseUrl);
    } catch (error) {
      console.error('Failed to save database URL:', error);
      setValidationError('Failed to connect to database. Please check your connection details.');
      setIsConnecting(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleConnect();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDatabaseUrl(e.target.value);
    // Clear validation error when user starts typing
    if (validationError) {
      setValidationError(null);
    }
  };

  const isUrlValid = !validationError && databaseUrl.trim();

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
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              className={`font-mono text-sm ${validationError ? 'border-destructive-primary' : ''}`}
            />
            {validationError && (
              <div className="flex items-center gap-2 text-sm text-destructive-primary">
                <AlertCircle className="h-4 w-4" />
                <span>{validationError}</span>
              </div>
            )}
          </div>
          <Button onClick={handleConnect} disabled={!isUrlValid || isConnecting} className="w-full">
            {isConnecting ? 'Connecting...' : 'Connect'}
          </Button>
          <p className="text-xs text-muted-foreground text-center">This URL will be stored securely in a session cookie and will be cleared when you close your browser.</p>
        </div>
      </div>
    </div>
  );
}
