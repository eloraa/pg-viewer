#!/bin/bash

# Script to append NODE_ENV=production to the copied cli.mjs file
# This ensures the CLI runs in production mode when distributed

PACKAGE_DIR="package"
CLI_FILE="$PACKAGE_DIR/cli.mjs"

# Check if the package directory and cli.mjs exist
if [ ! -d "$PACKAGE_DIR" ]; then
    echo "Error: Package directory '$PACKAGE_DIR' not found"
    exit 1
fi

if [ ! -f "$CLI_FILE" ]; then
    echo "Error: CLI file '$CLI_FILE' not found"
    exit 1
fi

# Append NODE_ENV=production after the imports
# Find the line after the last import and insert our line there
echo "Appending NODE_ENV=production to $CLI_FILE..."

# Create a temporary file
TEMP_FILE=$(mktemp)

# Copy the file and insert NODE_ENV=production after the last import
awk '
    /^import / { 
        print; 
        in_imports = 1; 
        next 
    }
    in_imports && !/^import / { 
        print "process.env.NODE_ENV = \"production\";";
        print "";
        in_imports = 0;
        print;
        next
    }
    { print }
' "$CLI_FILE" > "$TEMP_FILE"

# Replace the original file with the modified version
mv "$TEMP_FILE" "$CLI_FILE"

echo "Successfully appended NODE_ENV=production to $CLI_FILE"
