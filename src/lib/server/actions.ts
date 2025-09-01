'use server';

import { getDb } from './db';
import { sql } from 'kysely';

export async function getSchemas() {
  try {
    const db = await getDb();
    if (!db) {
      throw new Error('No database connection available');
    }

    const result = await db
      .selectFrom('information_schema.schemata')
      .select('schema_name')
      .where('schema_name', 'not in', ['information_schema', 'pg_catalog', 'pg_toast'])
      .orderBy('schema_name', 'asc')
      .execute();

    return result.map(row => row.schema_name);
  } catch (error) {
    console.error('Error fetching schemas:', error);
    throw new Error('Failed to fetch database schemas');
  }
}

export async function getTables(schemaName: string) {
  try {
    const db = await getDb();
    if (!db) {
      throw new Error('No database connection available');
    }

    const result = await db
      .selectFrom('information_schema.tables')
      .select(['table_name', 'table_type'])
      .where('table_schema', '=', schemaName)
      .where('table_type', '=', 'BASE TABLE')
      .orderBy('table_name', 'asc')
      .execute();

    return result.map(row => ({
      name: row.table_name,
      type: row.table_type,
    }));
  } catch (error) {
    console.error('Error fetching tables:', error);
    throw new Error(`Failed to fetch tables for schema: ${schemaName}`);
  }
}

export async function getTableColumns(schemaName: string, tableName: string) {
  try {
    const db = await getDb();
    if (!db) {
      throw new Error('No database connection available');
    }

    // Get column information
    const columnsResult = await db
      .selectFrom('information_schema.columns')
      .select(['column_name', 'data_type', 'is_nullable'])
      .where('table_schema', '=', schemaName)
      .where('table_name', '=', tableName)
      .orderBy('ordinal_position', 'asc')
      .execute();

    // Get foreign key information using pg_catalog (works better with permissions)
    const foreignKeysQuery = sql`
      SELECT
        con.conname AS constraint_name,
        con.conrelid::regclass AS table_name,
        a.attname AS column_name,
        con.confrelid::regclass AS referenced_table,
        af.attname AS referenced_column,
        pg_get_constraintdef(con.oid, true) AS definition
      FROM
        pg_constraint con
      JOIN pg_attribute a
        ON a.attnum = ANY (con.conkey)
       AND a.attrelid = con.conrelid
      JOIN pg_attribute af
        ON af.attnum = ANY (con.confkey)
       AND af.attrelid = con.confrelid
      WHERE
        con.contype = 'f'
        AND con.conrelid = ${sql.lit('"' + schemaName + '"."' + tableName + '"')}::regclass
    `;

    const foreignKeysResult = await foreignKeysQuery.execute(db);

    // Debug: Log the foreign key results
    console.log('Foreign keys query result:', JSON.stringify(foreignKeysResult.rows, null, 2));

    // Create a map of foreign keys by column name
    const foreignKeysMap = new Map();
    foreignKeysResult.rows.forEach((row: Record<string, unknown>) => {
      console.log('Processing FK row:', row);
      
      // Parse referenced table (might include schema and quotes)
      let referencedTable = row.referenced_table;
      let referencedSchema = 'public'; // default
      
      // Remove quotes if present
      if (referencedTable.startsWith('"') && referencedTable.endsWith('"')) {
        referencedTable = referencedTable.slice(1, -1);
      }
      
      // Check if schema is included (e.g., "schema.table")
      if (referencedTable.includes('.')) {
        const parts = referencedTable.split('.');
        referencedSchema = parts[0];
        referencedTable = parts[1];
      }
      
      foreignKeysMap.set(row.column_name, {
        referencedSchema,
        referencedTable,
        referencedColumn: row.referenced_column,
        constraintName: row.constraint_name,
      });
    });

    // Combine column and foreign key information
    const finalResult = columnsResult.map(row => {
      const fk = foreignKeysMap.get(row.column_name);
      const result = {
        name: row.column_name,
        type: row.data_type,
        nullable: row.is_nullable === 'YES',
        foreignKey: fk || undefined,
      };
      console.log('Column result:', result);
      return result;
    });

    console.log('Final columns result:', JSON.stringify(finalResult, null, 2));
    return finalResult;
  } catch (error) {
    console.error('Error fetching table columns:', error);
    throw new Error(`Failed to fetch columns for table: ${tableName}`);
  }
}


export async function getTableData(schemaName: string, tableName: string, limit: number = 100, offset: number = 0) {
  try {
    const db = await getDb();
    if (!db) {
      throw new Error('No database connection available');
    }

    // Get the actual data from the table - sql.id() handles proper quoting
    const dataQuery = sql`SELECT * FROM ${sql.id(schemaName, tableName)} LIMIT ${sql.lit(limit)} OFFSET ${sql.lit(offset)}`;
    const data = await dataQuery.execute(db);

    // Get total count for pagination
    const countQuery = sql`SELECT COUNT(*) as total FROM ${sql.id(schemaName, tableName)}`;
    const countResult = await countQuery.execute(db);
    const total = Number((countResult.rows[0] as { total?: number })?.total || 0);

    return {
      data: data.rows,
      total,
      limit,
      offset,
    };
  } catch (error) {
    console.error('Error fetching table data:', error);
    throw new Error(`Failed to fetch data for table: ${tableName}`);
  }
}



export async function createSchema(schemaName: string) {
  try {
    const db = await getDb();
    if (!db) {
      throw new Error('No database connection available');
    }

    await db.schema.createSchema(schemaName).ifNotExists().execute();
    return { success: true, message: `Schema '${schemaName}' created successfully` };
  } catch (error) {
    console.error('Error creating schema:', error);
    throw new Error(`Failed to create schema: ${schemaName}`);
  }
}

export async function createTable(schemaName: string, tableName: string, columns: Array<{ name: string; type: string; nullable: boolean }>) {
  try {
    const db = await getDb();
    if (!db) {
      throw new Error('No database connection available');
    }

    const columnDefinitions = columns.map(col => `"${col.name}" ${col.type}${col.nullable ? '' : ' NOT NULL'}`).join(', ');

    const query = `CREATE TABLE "${schemaName}"."${tableName}" (${columnDefinitions})`;
    await sql.raw(query).execute(db);
    return { success: true, message: `Table '${tableName}' created successfully in schema '${schemaName}'` };
  } catch (error) {
    console.error('Error creating table:', error);
    throw new Error(`Failed to create table: ${tableName}`);
  }
}

export async function createView(schemaName: string, viewName: string, query: string) {
  try {
    const db = await getDb();
    if (!db) {
      throw new Error('No database connection available');
    }

    const createViewQuery = `CREATE VIEW "${schemaName}"."${viewName}" AS ${query}`;
    await sql.raw(createViewQuery).execute(db);
    return { success: true, message: `View '${viewName}' created successfully in schema '${schemaName}'` };
  } catch (error) {
    console.error('Error creating view:', error);
    throw new Error(`Failed to create view: ${viewName}`);
  }
}

export async function createEnum(schemaName: string, enumName: string, values: string[]) {
  try {
    const db = await getDb();
    if (!db) {
      throw new Error('No database connection available');
    }

    const enumValues = values.map(val => `'${val}'`).join(', ');
    const query = `CREATE TYPE "${schemaName}"."${enumName}" AS ENUM (${enumValues})`;
    await sql.raw(query).execute(db);
    return { success: true, message: `Enum '${enumName}' created successfully in schema '${schemaName}'` };
  } catch (error) {
    console.error('Error creating enum:', error);
    throw new Error(`Failed to create enum: ${enumName}`);
  }
}

export async function createRole(roleName: string, options: { login?: boolean; password?: string; superuser?: boolean }) {
  try {
    const db = await getDb();
    if (!db) {
      throw new Error('No database connection available');
    }

    let query = `CREATE ROLE "${roleName}"`;
    const roleOptions = [];

    if (options.login) roleOptions.push('LOGIN');
    if (options.password) roleOptions.push(`PASSWORD '${options.password}'`);
    if (options.superuser) roleOptions.push('SUPERUSER');

    if (roleOptions.length > 0) {
      query += ' ' + roleOptions.join(' ');
    }

    await sql.raw(query).execute(db);
    return { success: true, message: `Role '${roleName}' created successfully` };
  } catch (error) {
    console.error('Error creating role:', error);
    throw new Error(`Failed to create role: ${roleName}`);
  }
}

export async function executeRawSQL(sqlQuery: string) {
  try {
    const db = await getDb();
    if (!db) {
      throw new Error('No database connection available');
    }

    const startTime = Date.now();
    const result = await sql.raw(sqlQuery).execute(db);
    const executionTime = Date.now() - startTime;

    return {
      success: true,
      data: result.rows,
      rowCount: result.rows.length,
      executionTime,
      message: `Query executed successfully in ${executionTime}ms`,
    };
  } catch (error) {
    console.error('Error executing SQL query:', error);
    return {
      success: false,
      data: [],
      rowCount: 0,
      executionTime: 0,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

export async function deleteTableRows(schemaName: string, tableName: string, rowData: Array<{ [key: string]: unknown }>) {
  try {
    const db = await getDb();
    if (!db) {
      throw new Error('No database connection available');
    }

    if (rowData.length === 0) {
      throw new Error('No rows selected for deletion');
    }

    // Get table columns to identify primary key
    const columns = await getTableColumns(schemaName, tableName);
    
    // Query to find the actual primary key column
    const primaryKeyQuery = sql`
      SELECT kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      WHERE tc.constraint_type = 'PRIMARY KEY'
        AND tc.table_schema = ${sql.lit(schemaName)}
        AND tc.table_name = ${sql.lit(tableName)}
      ORDER BY kcu.ordinal_position
      LIMIT 1
    `;
    
    const primaryKeyResult = await primaryKeyQuery.execute(db);
    const primaryKeyColumn = (primaryKeyResult.rows[0] as { column_name?: string })?.column_name || columns[0]?.name || 'id';
    
    // Extract primary key values from row data
    const primaryKeyValues = rowData.map(row => row[primaryKeyColumn]).filter(val => val != null);
    
    if (primaryKeyValues.length === 0) {
      throw new Error(`No valid primary key values found in column '${primaryKeyColumn}'`);
    }

    // Build DELETE query using the identified primary key
    // Using IN instead of ANY for better compatibility
    const deleteQuery = sql`
      DELETE FROM ${sql.id(schemaName, tableName)}
      WHERE ${sql.id(primaryKeyColumn)} IN (${sql.join(primaryKeyValues.map(val => sql.lit(val)))})
    `;

    const result = await deleteQuery.execute(db);

    return {
      success: true,
      deletedCount: primaryKeyValues.length,
      message: `Successfully deleted ${primaryKeyValues.length} row${primaryKeyValues.length === 1 ? '' : 's'}`,
    };
  } catch (error) {
    console.error('Error deleting table rows:', error);
    return {
      success: false,
      deletedCount: 0,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

export async function insertTableRow(schemaName: string, tableName: string, rowData: Record<string, any>) {
  try {
    const db = await getDb();
    if (!db) {
      throw new Error('No database connection available');
    }

    // Get table columns to build the insert query
    const columns = await getTableColumns(schemaName, tableName);
    
    // Check if id column is auto-incrementing by looking for default values
    const idColumn = columns.find(col => col.name === 'id');
    const isIdAutoIncrement = idColumn && (
      // Check if there's a default value that looks like a sequence
      await db
        .selectFrom('information_schema.columns')
        .select('column_default')
        .where('table_schema', '=', schemaName)
        .where('table_name', '=', tableName)
        .where('column_name', '=', 'id')
        .execute()
        .then(result => {
          const defaultVal = result[0]?.column_default;
          return defaultVal && (
            defaultVal.includes('nextval') || 
            defaultVal.includes('sequence') ||
            defaultVal.includes('gen_random_uuid')
          );
        })
        .catch(() => false)
    );
    
    // Filter out columns that shouldn't be inserted
    const insertableColumns = columns.filter(col => {
      // Don't filter out id if it's not auto-incrementing or if a value is provided
      if (col.name === 'id') {
        return !isIdAutoIncrement || rowData.id !== undefined;
      }
      // Filter out common auto-generated fields
      return col.name !== 'created_at' && col.name !== 'updated_at';
    });

    // Only include columns that have non-empty values or are nullable with explicit null values
    const columnsWithValues = insertableColumns.filter(col => {
      const value = rowData[col.name];
      
      // Special handling for id column - include if value is provided
      if (col.name === 'id' && value !== undefined && value !== '') {
        return true;
      }
      
      // Include if value is not empty string
      if (value !== '' && value !== null && value !== undefined) {
        return true;
      }
      // Include if column is nullable and we want to set it to null
      if ((value === '' || value === null || value === undefined) && col.nullable) {
        return true;
      }
      return false;
    });

    // Build column names and values arrays
    const columnNames = columnsWithValues.map(col => col.name);
    const values = columnNames.map(colName => {
      const value = rowData[colName];
      const column = columnsWithValues.find(col => col.name === colName);
      
      // Handle null values for nullable columns
      if (value === null || value === undefined) {
        return null;
      }
      // Handle empty strings - convert to null if column is nullable
      if (value === '' && column?.nullable) {
        return null;
      }
      return value;
    });

    if (columnNames.length === 0) {
      throw new Error('At least one field must be filled to create a new row');
    }

    // Build the SQL query for error display with pretty formatting
    const valuesList = values.map((val: unknown) => 
      val === null ? 'NULL' : 
      typeof val === 'string' ? `'${val.replace(/'/g, "''")}'` : 
      String(val)
    );
    const columnList = columnNames.map((name: string) => `"${name}"`);
    
    const attemptedSql = `INSERT INTO "${schemaName}"."${tableName}" (
  ${columnList.join(',\n  ')}
) VALUES (
  ${valuesList.join(',\n  ')}
);`;

    // Build INSERT query with RETURNING clause to get the created row
    const insertQuery = sql`
      INSERT INTO ${sql.id(schemaName, tableName)} (${sql.join(columnNames.map(name => sql.id(name)))})
      VALUES (${sql.join(values.map(val => sql.lit(val)))})
      RETURNING *
    `;

    let result;
    try {
      result = await insertQuery.execute(db);
    } catch (dbError) {
      const error = dbError instanceof Error ? dbError : new Error('Database error');
      (error as any).sqlQuery = attemptedSql;
      throw error;
    }

    if (result.rows.length === 0) {
      const error = new Error('Failed to create new row');
      (error as any).sqlQuery = attemptedSql;
      throw error;
    }

    return {
      success: true,
      data: result.rows[0],
      message: 'Successfully created new row',
    };
  } catch (error) {
    console.error('Error inserting table row:', error);
    
    // If this is a database error, try to extract the SQL query
    let sqlQuery = 'Unable to reconstruct SQL query';
    if (error instanceof Error && (error as any).sqlQuery) {
      sqlQuery = (error as any).sqlQuery;
    }
    
    return {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      sqlQuery,
    };
  }
}

export async function updateTableData(
  schemaName: string, 
  tableName: string, 
  changes: Array<{
    row: Record<string, unknown>;
    column: string;
    oldValue: unknown;
    newValue: unknown;
    rowIndex: number;
  }>
) {
  try {
    const db = await getDb();
    if (!db) {
      throw new Error('No database connection available');
    }

    // We need to identify each row uniquely. For now, we'll assume there's an 'id' column
    // In a production app, you'd want to identify the primary key(s) dynamically
    const updatePromises = changes.map(async (change) => {
      const { row, column, newValue } = change;
      
      // Find a unique identifier for the row (assuming 'id' column exists)
      const rowId = row.id;
      if (!rowId) {
        throw new Error('Cannot update row: no primary key (id) found');
      }

      // Build UPDATE query - sql.id() handles proper quoting
      const updateQuery = sql`
        UPDATE ${sql.id(schemaName, tableName)}
        SET ${sql.id(column)} = ${newValue}
        WHERE id = ${rowId}
      `;

      return updateQuery.execute(db);
    });

    await Promise.all(updatePromises);

    return {
      success: true,
      message: `Successfully updated ${changes.length} ${changes.length === 1 ? 'cell' : 'cells'}`,
    };
  } catch (error) {
    console.error('Error updating table data:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}
