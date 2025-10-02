# PG Viewer

A modern, intuitive PostgreSQL database viewer and management tool built with Next.js. Browse your database schema, run queries, and manage your data with a beautiful interface.

## Features

- 🔍 **Database Explorer** - Browse tables, views, and schema with an intuitive UI
- ⚡ **SQL Editor** - Write and execute queries with Monaco Editor
- 📊 **Data Visualization** - View query results in a clean table format
- 🎨 **Modern UI** - Built with Radix UI and Tailwind CSS
- 🖥️ **CLI Support** - Launch via command line for quick access
- 🔐 **Secure Connections** - Support for PostgreSQL connection strings

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Database**: PostgreSQL via Kysely query builder
- **UI Components**: Radix UI primitives
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Forms**: React Hook Form with Zod validation
- **Code Editor**: Monaco Editor

## Installation

\`\`\`bash
# Clone the repository
git clone https://github.com/eloraa/pg-viewer.git
cd pg-viewer

# Install dependencies
pnpm install
# or
npm install
\`\`\`

## Usage

### Web Interface

Run the development server:

\`\`\`bash
pnpm dev
# or
npm run dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000) in your browser.

### CLI

Launch pg-viewer from the command line:

\`\`\`bash
pnpm cli
# or
npm run cli
\`\`\`

The CLI will guide you through:
- Entering your PostgreSQL connection string
- Selecting HTTP/HTTPS mode
- Configuring SSL certificates (if needed)
- Launching the web interface

## Database Connection

Connect to your PostgreSQL database using a standard connection string:

\`\`\`
postgresql://username:password@host:port/database
\`\`\`

The connection is secure and your credentials are handled safely.

## Development

\`\`\`bash
# Run development server
pnpm dev

# Build for production
pnpm build

# Run linter
pnpm lint

# Type checking
pnpm typecheck
\`\`\`

## Building for Distribution

\`\`\`bash
# Build and package
pnpm package:build

# Publish package
pnpm package:publish
\`\`\`

## Project Structure

\`\`\`
pg-viewer/
├── src/
│   ├── app/          # Next.js app directory
│   ├── components/   # React components
│   └── lib/          # Utilities and server functions
├── cli.mjs           # CLI entry point
└── package/          # Distribution files
\`\`\`

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is open source and available under the MIT License.

## Built With

- [Next.js](https://nextjs.org/) - React framework
- [Kysely](https://kysely.dev/) - Type-safe SQL query builder
- [Radix UI](https://www.radix-ui.com/) - Unstyled UI primitives
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
- [Monaco Editor](https://microsoft.github.io/monaco-editor/) - Code editor
