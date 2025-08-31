#!/usr/bin/env node

import { Command } from 'commander';
import { useState, useEffect, createElement } from 'react';
import { render, Text, Box, useInput } from 'ink';
import TextInput from 'ink-text-input';
import SelectInput from 'ink-select-input';
import chalk from 'chalk';

const color = (input, fallback) => {
  if (typeof input === 'string') {
    if (supportsColor.has16m && input.trim() !== '') {
      return chalk.hex(input);
    }
    return fallback;
  } else if (typeof input === 'object' && input.r !== undefined && input.g !== undefined && input.b !== undefined) {
    if (supportsColor.has16m) {
      return chalk.rgb(input.r, input.g, input.b);
    }
    return fallback;
  } else {
    return fallback;
  }
};

import { createServer } from 'https';
import fs from 'fs';
import { parse } from 'url';
import next from 'next';
import { createServer as createHttpServer } from 'http';
import path from 'path';
import { supportsColor } from 'chalk';

const ascii =
  chalk.white.bold(`
███████      `) +
  chalk.red(`███████`) +
  chalk.white.bold(`
█████████    `) +
  chalk.red(`███████`) +
  chalk.white.bold(`
███████████  `) +
  chalk.red(`███████`) +
  chalk.white.bold(`
  ███████████       
    ███████████     
       ██████████   
`) +
  chalk.red(`███████`) +
  chalk.white.bold(`  ██████████ 
`) +
  chalk.red(`███████`) +
  chalk.white.bold(`    █████████
`) +
  chalk.red(`███████`) +
  chalk.white.bold(`      ███████

`) +
  `\x1b[8A\x1b[1D\x1b[25C` +
  color({ r: 100, g: 150, b: 255 }, chalk.blue).bold(`PostgreSQL DB Viewer`) +
  `
\x1b[25C` +
  chalk.gray(`By `) +
  chalk.red.bold(`Elora`) +
  `
\x1b[25C` +
  chalk.black(`----------------------`) +
  `
\x1b[25C` +
  chalk.gray(`Github:`) +
  chalk.red.bold(`  https://github.com/eloraa`) +
  `
\x1b[25C` +
  chalk.gray(`Website:`) +
  chalk.red.bold(` https://db.aruu.me`) +
  `

\x1b[25C` +
  chalk.gray(`Usage: `) +
  color({ r: 255, g: 200, b: 100 }, chalk.yellow).bold(`--url`) +
  chalk.gray(`  or `) +
  color({ r: 255, g: 200, b: 100 }, chalk.yellow).bold(`-u`) +
  chalk.gray(` <postgres-url>`) +
  `\x1b[?25h\x1b[?7h`;

// Custom help handler to show ASCII art
function showHelp() {
  console.log(ascii);
  console.log(chalk.gray('\nA PostgreSQL database viewer with a web interface you can run locally.'));
  console.log(chalk.gray('\nExamples:'));
  console.log(color({ r: 100, g: 200, b: 255 }, chalk.blueBright)('  db-viewer'));
  console.log(color({ r: 100, g: 200, b: 255 }, chalk.blueBright)('  db-viewer -u postgres://user:pass@localhost:5432/db'));
  console.log(chalk.gray('\nThe application will start a secure HTTPS server.'));
}

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
  }).listen(availablePort, 'local.db.aruu.me');

  return availablePort;
}

function UrlPrompt({ onSubmit }) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [ctrlCPressed, setCtrlCPressed] = useState(false);
  const [feedback, setFeedback] = useState('');

  const handleSubmit = () => {
    if (!url.trim()) {
      setError('Database URL is required');
      return;
    }

    // Handle URLs that might already include the protocol
    const fullUrl = url.trim();

    if (!validatePostgresUrl(fullUrl)) {
      setError('Invalid PostgreSQL URL format. Expected: postgres://user:pass@host:port/database[?params]');
      return;
    }

    setError('');
    onSubmit(fullUrl);
  };

  useInput((input, key) => {
    if (key.ctrl && input === 'c') {
      if (ctrlCPressed) {
        process.exit(0);
      } else if (url.trim()) {
        setUrl('');
        setError('');
        setFeedback('Input cleared. Press Ctrl+C again to exit.');
        setCtrlCPressed(true);

        setTimeout(() => {
          setFeedback('');
          setCtrlCPressed(false);
        }, 2000);
      } else {
        process.exit(0);
      }
    }
    
    // Add ESC key as backup exit
    if (key.escape) {
      process.exit(0);
    }
  });

  return createElement(
    Box,
    { flexDirection: 'column' },
    createElement(Text, { color: supportsColor.has16m ? '#679e45' : 'greenBright' }, 'Enter PostgreSQL database URL:'),
    createElement(
      Box,
      { marginTop: 1 },
      createElement(TextInput, {
        value: url,
        onChange: setUrl,
        onSubmit: handleSubmit,
        placeholder: 'postgres://user:password@host:port/database',
      })
    ),
    error && createElement(Box, { marginTop: 1 }, createElement(Text, { color: 'redBright' }, error)),
    feedback && createElement(Box, { marginTop: 1 }, createElement(Text, { color: 'yellow' }, feedback)),
    createElement(Box, { marginTop: 1 }, createElement(Text, { color: 'gray' }, 'Press Enter to continue • Ctrl+C to clear input or exit • ESC to exit'))
  );
}

function SaveConfirmation({ url, onConfirm }) {
  const items = [
    { label: 'Yes, save to .env.local (persistent)', value: true },
    { label: 'No, use session-only (temporary)', value: false },
  ];

  const handleSelect = item => {
    onConfirm(url, item.value);
  };

  return createElement(
    Box,
    { flexDirection: 'column' },
    createElement(Box, { marginBottom: 1 }, createElement(Text, { color: supportsColor.has16m ? '#679e45' : 'greenBright' }, 'Database URL validated successfully!')),
    createElement(Text, { color: 'yellow' }, 'Do you want to save this URL to .env.local for future use?'),
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
  const [spinnerIndex, setSpinnerIndex] = useState(0);
  const spinnerFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

  useEffect(() => {
    const interval = setInterval(() => {
      setSpinnerIndex(prev => (prev + 1) % spinnerFrames.length);
    }, 100);

    const startupSequence = async () => {
      if (shouldSave) {
        setStatus('Saving URL to .env.local...');
        try {
          await saveToEnvLocal(url);
        } catch (error) {
          setStatus(`Failed to save .env.local: ${error.message}`);
          clearInterval(interval);
          return;
        }
      }

      try {
        const serverPort = await startServer(url);
        clearInterval(interval);

        setTimeout(() => {
          console.clear();

          if (global.unmountApp) {
            global.unmountApp();
          }

          if (shouldSave) {
            console.log(chalk.green('Database URL saved to .env.local'));
          }
          console.log(`\n${chalk.yellowBright(`[${process.env.NODE_ENV !== 'production' ? 'DEV' : 'PROD'}]`)} Server listening at ${chalk.blueBright(`https://local.db.aruu.me:${serverPort}`)}`);
        }, 100);
      } catch (error) {
        setStatus(`Failed to start server: ${error.message}`);
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
      ? createElement(Box, { marginBottom: 1 }, createElement(Text, { color: 'green' }, 'URL will be saved to .env.local'))
      : createElement(Box, { marginBottom: 1 }, createElement(Text, { color: 'yellow' }, 'Using temporary session-only URL')),
    createElement(Box, { marginBottom: 1 }, createElement(Text, { color: 'blue' }, spinnerFrames[spinnerIndex] + ' ' + status))
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
  .name('db-viewer')
  .description('Database Viewer - Start Next.js server with PostgreSQL database')
  .version('1.0.0')
  .option('-u, --url <url>', 'PostgreSQL database URL')
  .addHelpText('before', '') // Remove default help text
  .addHelpText('after', '') // Remove default help text
  .helpOption('-h, --help', 'Show this help message')
  .action(async options => {
    if (options.url) {
      if (!validatePostgresUrl(options.url)) {
        console.error(chalk.redBright('Invalid PostgreSQL URL format. Expected: postgres://user:pass@host:port/database[?params]'));
        process.exit(1);
      }

      console.log(chalk.green('Database URL validated successfully!'));
      console.log(chalk.blue('Starting server (session-only URL)...'));

      try {
        const serverPort = await startServer(options.url);
        console.log(`\n${chalk.yellowBright(`[${process.env.NODE_ENV !== 'production' ? 'DEV' : 'PROD'}]`)} Server listening at ${chalk.blueBright(`https://local.db.aruu.me:${serverPort}`)}`);
      } catch (error) {
        console.error(chalk.red(`Failed to start server: ${error.message}`));
        process.exit(1);
      }
    } else {
      const existingUrl = readFromEnvLocal();
      if (existingUrl && validatePostgresUrl(existingUrl)) {
        console.log(chalk.green('Found existing DATABASE_URL in .env.local'));
        console.log(chalk.blue('Starting server with saved URL...'));

        try {
          const serverPort = await startServer(existingUrl);
          console.log(`\n${chalk.yellowBright(`[${process.env.NODE_ENV !== 'production' ? 'DEV' : 'PROD'}]`)} Server listening at ${chalk.blueBright(`https://local.db.aruu.me:${serverPort}`)}`);
        } catch (error) {
          console.error(chalk.red(`Failed to start server: ${error.message}`));
          process.exit(1);
        }
      } else {
        // Display ASCII art once before starting React component
        console.log(ascii);

        const { rerender, unmount } = render(createElement(App), { exitOnCtrlC: false });

        // Set up global unmount function for the ServerStarting component to use
        global.unmountApp = unmount;
      }
    }
  });

// Override the default help behavior
program.on('--help', () => {
  process.exit(0);
});

// Override the help option to show our custom help
program.helpInformation = () => {
  showHelp();
  return '';
};

program.parse();
