# pg-viewer

A PostgreSQL database viewer with a web interface you can run locally.

## Installation

```bash
npm install -g pg-viewer
```

## Usage

### Quick Start

```bash
# Run with interactive prompt
npx pg-viewer

# Run with database URL directly
npx pg-viewer -u postgres://user:password@localhost:5432/database
```

### Options

- `-u, --url <url>` - PostgreSQL database URL
- `-h, --help` - Show help message

## Features

- 🔒 **Secure HTTPS server** - Uses self-signed certificates for local development
- 🗄️ **Database exploration** - Browse schemas, tables, and data
- 📊 **Data visualization** - View and edit table data with a modern interface
- 🔍 **SQL console** - Execute custom SQL queries
- 💾 **Session management** - Save database URLs for future use
- 🎨 **Modern UI** - Built with Next.js and Tailwind CSS

## Requirements

- Node.js 18.0.0 or higher
- PostgreSQL database

## Security

The application runs a local HTTPS server on `https://local.db.aruu.me` with self-signed certificates. Your database credentials are never sent to external servers - everything runs locally on your machine.

## Development

This package contains a pre-built Next.js application. For development and customization, visit the [source repository](https://github.com/eloraa/db-viewer).

## License

MIT

## Author

Created by [Elora](https://github.com/eloraa)
