'use server';

import { db } from './db';
import { sql } from 'kysely';

export async function getSchemas() {
  try {
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
        AND con.conrelid = ${schemaName + '.' + tableName}::regclass
    `;

    const foreignKeysResult = await foreignKeysQuery.execute(db);

    // Debug: Log the foreign key results
    console.log('Foreign keys query result:', JSON.stringify(foreignKeysResult.rows, null, 2));

    // Create a map of foreign keys by column name
    const foreignKeysMap = new Map();
    foreignKeysResult.rows.forEach((row: any) => {
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
    // Get the actual data from the table
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
    await db.schema.createSchema(schemaName).ifNotExists().execute();
    return { success: true, message: `Schema '${schemaName}' created successfully` };
  } catch (error) {
    console.error('Error creating schema:', error);
    throw new Error(`Failed to create schema: ${schemaName}`);
  }
}

export async function createTable(schemaName: string, tableName: string, columns: Array<{ name: string; type: string; nullable: boolean }>) {
  try {
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

export async function updateTableData(
  schemaName: string, 
  tableName: string, 
  changes: Array<{
    row: any;
    column: string;
    oldValue: any;
    newValue: any;
    rowIndex: number;
  }>
) {
  try {
    // We need to identify each row uniquely. For now, we'll assume there's an 'id' column
    // In a production app, you'd want to identify the primary key(s) dynamically
    const updatePromises = changes.map(async (change) => {
      const { row, column, newValue } = change;
      
      // Find a unique identifier for the row (assuming 'id' column exists)
      const rowId = row.id;
      if (!rowId) {
        throw new Error('Cannot update row: no primary key (id) found');
      }

      // Build UPDATE query
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
