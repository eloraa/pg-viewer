import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Converts PostgreSQL data types to shorter, more readable names
 */
export function getShortDataType(postgresType: string): string {
  const typeMap: Record<string, string> = {
    // Numeric types
    'integer': 'int',
    'bigint': 'bigint',
    'smallint': 'smallint',
    'decimal': 'decimal',
    'numeric': 'numeric',
    'real': 'real',
    'double precision': 'double',
    'serial': 'serial',
    'bigserial': 'bigserial',
    'smallserial': 'smallserial',
    
    // Character types
    'character varying': 'varchar',
    'varchar': 'varchar',
    'character': 'char',
    'char': 'char',
    'text': 'text',
    
    // Date/Time types
    'timestamp without time zone': 'timestamp',
    'timestamp with time zone': 'timestamptz',
    'timestamp': 'timestamp',
    'timestamptz': 'timestamptz',
    'date': 'date',
    'time without time zone': 'time',
    'time with time zone': 'timetz',
    'time': 'time',
    'timetz': 'timetz',
    'interval': 'interval',
    
    // Boolean
    'boolean': 'bool',
    'bool': 'bool',
    
    // Binary types
    'bytea': 'bytea',
    
    // JSON types
    'json': 'json',
    'jsonb': 'jsonb',
    
    // UUID
    'uuid': 'uuid',
    
    // Arrays (handle common cases)
    'integer[]': 'int[]',
    'text[]': 'text[]',
    'varchar[]': 'varchar[]',
    'boolean[]': 'bool[]',
    'timestamp[]': 'timestamp[]',
    'date[]': 'date[]',
    'uuid[]': 'uuid[]',
    'json[]': 'json[]',
    'jsonb[]': 'jsonb[]',
  };

  // Check for exact match first
  if (typeMap[postgresType.toLowerCase()]) {
    return typeMap[postgresType.toLowerCase()];
  }

  // Handle types with length specifications (e.g., varchar(255))
  const lengthMatch = postgresType.match(/^(\w+)\s*\((\d+)\)$/i);
  if (lengthMatch) {
    const baseType = lengthMatch[1].toLowerCase();
    const length = lengthMatch[2];
    const shortBaseType = typeMap[baseType] || baseType;
    return `${shortBaseType}(${length})`;
  }

  // Handle array types with length specifications
  const arrayLengthMatch = postgresType.match(/^(\w+)\s*\((\d+)\)\s*\[\]$/i);
  if (arrayLengthMatch) {
    const baseType = arrayLengthMatch[1].toLowerCase();
    const length = arrayLengthMatch[2];
    const shortBaseType = typeMap[baseType] || baseType;
    return `${shortBaseType}(${length})[]`;
  }

  // Handle generic array types
  const arrayMatch = postgresType.match(/^(\w+)\s*\[\]$/i);
  if (arrayMatch) {
    const baseType = arrayMatch[1].toLowerCase();
    const shortBaseType = typeMap[baseType] || baseType;
    return `${shortBaseType}[]`;
  }

  // If no match found, return the original type but try to clean it up
  return postgresType.toLowerCase().replace(/\s+/g, ' ');
}

export function generateUUID() {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0,
      v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}


