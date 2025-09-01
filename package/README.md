# pg-viewer-cli

A PostgreSQL database viewer with a web interface you can run locally.



## Usage

### Quick Start

```bash
# Run with interactive prompt
pnpx pg-viewer-cli

# Run with database URL directly
npx pg-viewer-cli -u postgres://user:password@localhost:5432/database
```

## Installation

```bash
pnpm install -g pg-viewer-cli
```

### Options

- `-u, --url <url>` - PostgreSQL database URL
- `-h, --help` - Show help message

## Features

- **Secure HTTPS server** - Uses self-signed certificates for local development
- **Database exploration** - Browse schemas, tables, and data
- **Data visualization** - View and edit table data with a modern interface
- **SQL console** - Execute custom SQL queries

## Requirements

- Node.js 18.0.0 or higher
- PostgreSQL database

## Security

The application runs a local HTTPS server on `https://local.pg.aruu.me` with self-signed certificates. Your database credentials are never sent to external servers - everything runs locally on your machine.

## Development

This package contains a pre-built Next.js application. For development and customization, visit the [source repository](https://github.com/eloraa/pg-viewer).

## License

MIT

## Author

Created by [Elora](https://github.com/eloraa)
