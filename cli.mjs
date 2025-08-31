#!/usr/bin/env node

import { Command } from 'commander';
import { useState, useEffect, createElement } from 'react';
import { render, Text, Box } from 'ink';
import TextInput from 'ink-text-input';
import SelectInput from 'ink-select-input';
import chalk from 'chalk';
import { createServer } from 'https';
import fs from 'fs';
import { parse } from 'url';
import next from 'next';
import { createServer as createHttpServer } from 'http';
import path from 'path';

function validatePostgresUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'postgres:' || parsed.protocol === 'postgresql:';
  } catch {
    return false;
  }
}

async function saveToEnvLocal(databaseUrl) {
  const envPath = path.join(process.cwd(), '.env.local');
  let envContent = '';

  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
  }

  const lines = envContent.split('\n').filter(line => !line.startsWith('DATABASE_URL='));
  lines.push(`DATABASE_URL=${databaseUrl}`);

  const newContent = lines.filter(line => line.trim() !== '').join('\n') + '\n';
  fs.writeFileSync(envPath, newContent);
}

function readFromEnvLocal() {
  const envPath = path.join(process.cwd(), '.env.local');

  if (!fs.existsSync(envPath)) {
    return null;
  }

  const envContent = fs.readFileSync(envPath, 'utf8');
  const databaseUrlLine = envContent.split('\n').find(line => line.startsWith('DATABASE_URL='));

  if (!databaseUrlLine) {
    return null;
  }

  // Handle URLs with query parameters that contain '=' characters
  const equalsIndex = databaseUrlLine.indexOf('=');
  if (equalsIndex === -1) {
    return null;
  }

  return databaseUrlLine.substring(equalsIndex + 1);
}

async function findAvailablePort(startPort) {
  const isPortAvailable = port => {
    return new Promise(resolve => {
      const server = createHttpServer();
      server.listen(port, () => {
        server.once('close', () => {
          resolve(true);
        });
        server.close();
      });
      server.on('error', () => {
        resolve(false);
      });
    });
  };

  let currentPort = startPort;
  while (!(await isPortAvailable(currentPort))) {
    currentPort++;
  }
  return currentPort;
}

async function startServer(databaseUrl) {
  process.env.DATABASE_URL = databaseUrl;
  process.env.IS_CLI = 'true';

  const port = parseInt(process.env.PORT || '3000', 10);
  const dev = process.env.NODE_ENV !== 'production';
  const app = next({ dev });
  const handle = app.getRequestHandler();

  const sslOptions = {
    key: fs.readFileSync('./https/certs/privkey.pem'),
    cert: fs.readFileSync('./https/certs/fullchain.pem'),
  };

  await app.prepare();
  const availablePort = await findAvailablePort(port);

  createServer(sslOptions, (req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  }).listen(availablePort, 'db.aruu.me');

  return availablePort;
}

function UrlPrompt({ onSubmit }) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    if (!url.trim()) {
      setError('Database URL is required');
      return;
    }

    // Handle URLs that might already include the protocol
    let fullUrl = url.trim();
    if (!fullUrl.startsWith('postgres://') && !fullUrl.startsWith('postgresql://')) {
      fullUrl = 'postgres://' + fullUrl;
    }

    if (!validatePostgresUrl(fullUrl)) {
      setError('Invalid PostgreSQL URL format. Expected: user:pass@host:port/database[?params]');
      return;
    }

    setError('');
    onSubmit(fullUrl);
  };

  return createElement(
    Box,
    { flexDirection: 'column' },
    createElement(Box, { marginBottom: 1 }, createElement(Text, { color: 'magenta', bold: true }, '🗄️  Database Viewer')),
    createElement(Text, { color: 'cyan' }, 'Enter PostgreSQL database URL (with optional query parameters):'),
    createElement(
      Box,
      { marginTop: 1 },
      createElement(Text, { color: 'gray' }, 'postgres://'),
      createElement(TextInput, {
        value: url,
        onChange: setUrl,
        onSubmit: handleSubmit,
        placeholder: 'user:password@host:port/database?sslmode=require',
      })
    ),
    error && createElement(Box, { marginTop: 1 }, createElement(Text, { color: 'red' }, '❌ ' + error)),
    createElement(Box, { marginTop: 1 }, createElement(Text, { color: 'gray' }, 'Press Enter to continue, Ctrl+C to exit'))
  );
}

function SaveConfirmation({ url, onConfirm }) {
  const items = [
    { label: '💾 Yes, save to .env.local (persistent)', value: true },
    { label: '⚡ No, use session-only (temporary)', value: false },
  ];

  const handleSelect = item => {
    onConfirm(url, item.value);
  };

  return createElement(
    Box,
    { flexDirection: 'column' },
    createElement(Box, { marginBottom: 1 }, createElement(Text, { color: 'green' }, '✅ Database URL validated successfully!')),
    createElement(Text, { color: 'yellow' }, '💾 Do you want to save this URL to .env.local for future use?'),
    createElement(Box, { marginTop: 1 }, createElement(Text, { color: 'gray' }, 'This will create/update .env.local in your project root.')),
    createElement(
      Box,
      { marginTop: 1 },
      createElement(SelectInput, {
        items: items,
        onSelect: handleSelect,
      })
    ),
    createElement(Box, { marginTop: 1 }, createElement(Text, { color: 'gray' }, '↑↓ Navigate • Enter to select • Ctrl+C to exit'))
  );
}

function ServerStarting({ url, shouldSave }) {
  const [status, setStatus] = useState('Connecting to database...');
  const [dots, setDots] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => (prev.length >= 3 ? '' : prev + '.'));
    }, 500);

    const startupSequence = async () => {
      if (shouldSave) {
        setStatus('Saving URL to .env.local...');
        try {
          await saveToEnvLocal(url);
          await new Promise(resolve => setTimeout(resolve, 800));
        } catch (error) {
          setStatus(`❌ Failed to save .env.local: ${error.message}`);
          clearInterval(interval);
          return;
        }
      }

      setStatus('Setting up database connection...');
      await new Promise(resolve => setTimeout(resolve, 1000));

      setStatus('Preparing Next.js application...');
      await new Promise(resolve => setTimeout(resolve, 800));

      setStatus('Starting HTTPS server...');
      await new Promise(resolve => setTimeout(resolve, 600));

      try {
        const serverPort = await startServer(url);
        clearInterval(interval);
        setDots('');

        setTimeout(() => {
          if (shouldSave) {
            console.log(chalk.green('💾 Database URL saved to .env.local'));
          }
        }, 2000);
      } catch (error) {
        setStatus(`❌ Failed to start server: ${error.message}`);
        clearInterval(interval);
      }
    };

    startupSequence();
    return () => clearInterval(interval);
  }, [url]);

  return createElement(
    Box,
    { flexDirection: 'column' },
    shouldSave
      ? createElement(Box, { marginBottom: 1 }, createElement(Text, { color: 'green' }, '✅ URL will be saved to .env.local'))
      : createElement(Box, { marginBottom: 1 }, createElement(Text, { color: 'yellow' }, '⚡ Using temporary session-only URL')),
    createElement(Box, { marginBottom: 1 }, createElement(Text, { color: 'blue' }, '🚀 ' + status + dots))
  );
}

function App({ initialUrl }) {
  const [submittedUrl, setSubmittedUrl] = useState(initialUrl);
  const [showSaveConfirmation, setShowSaveConfirmation] = useState(false);
  const [serverConfig, setServerConfig] = useState(null);

  const handleUrlSubmit = url => {
    setSubmittedUrl(url);
    setShowSaveConfirmation(true);
  };

  const handleSaveConfirm = (url, shouldSave) => {
    setServerConfig({ url, shouldSave });
    setShowSaveConfirmation(false);
  };

  if (serverConfig) {
    return createElement(ServerStarting, { url: serverConfig.url, shouldSave: serverConfig.shouldSave });
  }

  if (showSaveConfirmation) {
    return createElement(SaveConfirmation, { url: submittedUrl, onConfirm: handleSaveConfirm });
  }

  return createElement(UrlPrompt, { onSubmit: handleUrlSubmit });
}

const program = new Command();

program
  .name('@cli')
  .description('Database Viewer - Start Next.js server with PostgreSQL database')
  .version('1.0.0')
  .option('-u, --url <url>', 'PostgreSQL database URL')
  .action(async options => {
    if (options.url) {
      if (!validatePostgresUrl(options.url)) {
        console.error(chalk.red('❌ Invalid PostgreSQL URL format. Expected: postgres://user:pass@host:port/database[?params]'));
        process.exit(1);
      }

      console.log(chalk.green('✅ Database URL validated successfully!'));
      console.log(chalk.blue('🚀 Starting server (session-only URL)...'));

      try {
        const serverPort = await startServer(options.url);
        console.log(`\n${chalk.yellowBright(`[${process.env.NODE_ENV !== 'production' ? 'DEV' : 'PROD'}]`)} Server listening at ${chalk.blueBright(`https://db.aruu.me:${serverPort}`)}`);
      } catch (error) {
        console.error(chalk.red(`❌ Failed to start server: ${error.message}`));
        process.exit(1);
      }
    } else {
      const existingUrl = readFromEnvLocal();
      if (existingUrl && validatePostgresUrl(existingUrl)) {
        console.log(chalk.green('✅ Found existing DATABASE_URL in .env.local'));
        console.log(chalk.blue('🚀 Starting server with saved URL...'));

        try {
          const serverPort = await startServer(existingUrl);
          console.log(`\n${chalk.yellowBright(`[${process.env.NODE_ENV !== 'production' ? 'DEV' : 'PROD'}]`)} Server listening at ${chalk.blueBright(`https://db.aruu.me:${serverPort}`)}`);
        } catch (error) {
          console.error(chalk.red(`❌ Failed to start server: ${error.message}`));
          process.exit(1);
        }
      } else {
        render(createElement(App));
      }
    }
  });

program.parse();
