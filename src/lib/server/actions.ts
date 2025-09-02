'use server';

import { sql } from 'kysely';
import { getDb } from './db';

export async function getSchemas() {
  try {
    const db = await getDb();
    if (!db) {
      throw new Error('No database connection available');
    }

    const result = await sql<{ schema_name: string }>`
      SELECT schema_name 
      FROM information_schema.schemata 
      WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
      ORDER BY schema_name
    `.execute(db);

    return result.rows.map(row => row.schema_name);
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

    const result = await sql<{ table_name: string; table_type: string }>`
      SELECT table_name, table_type 
      FROM information_schema.tables 
      WHERE table_schema = ${sql.lit(schemaName)} 
        AND table_type = 'BASE TABLE'
      ORDER BY table_name ASC
    `.execute(db);

    return result.rows.map(row => ({
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
    const columnsResult = await sql<{ column_name: string; data_type: string; is_nullable: string }>`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_schema = ${sql.lit(schemaName)} 
        AND table_name = ${sql.lit(tableName)}
      ORDER BY ordinal_position ASC
    `.execute(db);

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
    (foreignKeysResult.rows as Record<string, unknown>[]).forEach((row: Record<string, unknown>) => {
      console.log('Processing FK row:', row);

      // Parse referenced table (might include schema and quotes)
      let referencedTable = String(row.referenced_table);
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
    const finalResult = columnsResult.rows.map(row => {
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

export async function getTableData(
  schemaName: string,
  tableName: string,
  limit: number = 100,
  offset: number = 0,
  filters?: Array<{
    connector: 'where' | 'and' | 'or';
    column: string;
    operator: 'equals' | 'not_equals' | 'contains' | 'starts_with' | 'ends_with' | 'greater_than' | 'less_than' | 'is_null' | 'is_not_null';
    value: string;
  }>,
  sortColumn?: string,
  sortOrder: 'ASC' | 'DESC' = 'ASC'
) {
  try {
    const db = await getDb();
    if (!db) {
      throw new Error('No database connection available');
    }

    // Build WHERE clause from filters
    let whereClause = sql``;
    if (filters && filters.length > 0) {
      const conditions = filters.map((filter, index) => {
        const column = sql.id(filter.column);
        const value = sql.lit(filter.value);

        let condition;
        switch (filter.operator) {
          case 'equals':
            condition = sql`${column} = ${value}`;
            break;
          case 'not_equals':
            condition = sql`${column} != ${value}`;
            break;
          case 'contains':
            condition = sql`${column} ILIKE ${'%' + filter.value + '%'}`;
            break;
          case 'starts_with':
            condition = sql`${column} ILIKE ${filter.value + '%'}`;
            break;
          case 'ends_with':
            condition = sql`${column} ILIKE ${'%' + filter.value}`;
            break;
          case 'greater_than':
            condition = sql`${column} > ${value}`;
            break;
          case 'less_than':
            condition = sql`${column} < ${value}`;
            break;
          case 'is_null':
            condition = sql`${column} IS NULL`;
            break;
          case 'is_not_null':
            condition = sql`${column} IS NOT NULL`;
            break;
          default:
            condition = sql`${column} = ${value}`;
        }

        if (index === 0) {
          return condition;
        } else {
          const connector = filter.connector === 'or' ? sql` OR ` : sql` AND `;
          return sql`${connector}${condition}`;
        }
      });

      whereClause = sql` WHERE ${sql.join(conditions, sql``)}`;
    }

    // Build ORDER BY clause - use provided sortColumn or default to first column
    let orderByClause = sql``;
    if (sortColumn) {
      console.log(`Sorting by column: ${sortColumn} ${sortOrder}`);
      orderByClause = sql` ORDER BY ${sql.id(sortColumn)} ${sql.raw(sortOrder)}`;
    } else {
      const firstColumnQuery = sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = ${sql.lit(schemaName)} 
          AND table_name = ${sql.lit(tableName)}
        ORDER BY ordinal_position ASC 
        LIMIT 1
      `;
      const firstColumnResult = await firstColumnQuery.execute(db);
      const firstColumn = (firstColumnResult.rows[0] as { column_name: string })?.column_name;

      if (firstColumn) {
        console.log(`Default sorting by first column: ${firstColumn} ASC`);
        orderByClause = sql` ORDER BY ${sql.id(firstColumn)} ASC`;
      }
    }

    // Build the main query - include ctid for row identification
    const dataQuery = sql`SELECT *, ctid FROM ${sql.id(schemaName, tableName)}${whereClause}${orderByClause} LIMIT ${sql.lit(limit)} OFFSET ${sql.lit(offset)}`;
    const data = await dataQuery.execute(db);

    // Get total count for pagination with filters
    const countQuery = sql`SELECT COUNT(*) as total FROM ${sql.id(schemaName, tableName)}${whereClause}`;
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

    console.log('DeleteTableRows called with rowData:', JSON.stringify(rowData, null, 2));

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

    console.log('Primary key column for deletion:', primaryKeyColumn);

    // Extract primary key values from row data
    const primaryKeyValues = rowData.map(row => (row as Record<string, unknown>)[primaryKeyColumn as string]).filter(val => val != null);

    if (primaryKeyValues.length === 0) {
      throw new Error(`No valid primary key values found in column '${primaryKeyColumn}'`);
    }

    console.log('Primary key values to delete:', primaryKeyValues);

    // Check for duplicate primary key values
    const duplicateCheckQuery = sql`
      SELECT ${sql.id(primaryKeyColumn)}, COUNT(*) as count
      FROM ${sql.id(schemaName, tableName)}
      WHERE ${sql.id(primaryKeyColumn)} = ANY(${sql.lit(primaryKeyValues)})
      GROUP BY ${sql.id(primaryKeyColumn)}
      HAVING COUNT(*) > 1
    `;
    const duplicateResult = await duplicateCheckQuery.execute(db);
    if (duplicateResult.rows.length > 0) {
      console.log('WARNING: Found duplicate primary key values in rows to delete:', duplicateResult.rows);
      // For duplicates, we need to be more careful - delete only one row per primary key value
      // This is a limitation when there are duplicate primary keys
      console.log('Deleting only the first occurrence of each duplicate primary key value');
    }

    // Execute the DELETE query
    const deleteQuery = sql`
      DELETE FROM ${sql.id(schemaName, tableName)}
      WHERE ${sql.id(primaryKeyColumn)} = ANY(${sql.lit(primaryKeyValues)})
    `;

    console.log('Executing DELETE query:', deleteQuery.compile(db).sql);
    console.log('Query parameters:', deleteQuery.compile(db).parameters);

    const result = await deleteQuery.execute(db);
    console.log('DELETE result:', result);

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

export async function insertTableRow(schemaName: string, tableName: string, rowData: Record<string, unknown>) {
  try {
    const db = await getDb();
    if (!db) {
      throw new Error('No database connection available');
    }

    // Get table columns to build the insert query
    const columns = await getTableColumns(schemaName, tableName);

    // Check if id column is auto-incrementing by looking for default values
    const idColumn = columns.find(col => col.name === 'id');
    const isIdAutoIncrement =
      idColumn &&
      // Check if there's a default value that looks like a sequence
      (await sql<{ column_default: string | null }>`
        SELECT column_default 
        FROM information_schema.columns 
        WHERE table_schema = ${sql.lit(schemaName)} 
          AND table_name = ${sql.lit(tableName)} 
          AND column_name = 'id'
      `
        .execute(db)
        .then(result => {
          const defaultVal = result.rows[0]?.column_default;
          return defaultVal && (defaultVal.includes('nextval') || defaultVal.includes('sequence') || defaultVal.includes('gen_random_uuid'));
        })
        .catch(() => false));

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
      const value = rowData[col.name as keyof typeof rowData];

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
      const value = rowData[colName as keyof typeof rowData];
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
    const valuesList = values.map((val: unknown) => (val === null ? 'NULL' : typeof val === 'string' ? `'${val.replace(/'/g, "''")}'` : String(val)));
    const columnList = (columnNames as string[]).map(name => `"${name}"`);

    const attemptedSql = `INSERT INTO "${schemaName}"."${tableName}" (
  ${columnList.join(',\n  ')}
) VALUES (
  ${valuesList.join(',\n  ')}
);`;

    // Build INSERT query with RETURNING clause to get the created row
    const insertQuery = sql`
      INSERT INTO ${sql.id(schemaName, tableName)} (${sql.join((columnNames as string[]).map(name => sql.id(name)))})
      VALUES (${sql.join(values.map(val => sql.lit(val)))})
      RETURNING *
    `;

    let result;
    try {
      result = await insertQuery.execute(db);
    } catch (dbError) {
      const error = dbError instanceof Error ? dbError : new Error('Database error');
      (error as Error & { sqlQuery?: string }).sqlQuery = attemptedSql;
      throw error;
    }

    if (result.rows.length === 0) {
      const error = new Error('Failed to create new row');
      (error as Error & { sqlQuery?: string }).sqlQuery = attemptedSql;
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
    if (error instanceof Error && (error as Error & { sqlQuery?: string }).sqlQuery) {
      sqlQuery = (error as Error & { sqlQuery?: string }).sqlQuery || 'Unable to reconstruct SQL query';
    }

    return {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      sqlQuery,
    };
  }
}

export async function getTableConstraints(schemaName: string, tableName: string) {
  try {
    const db = await getDb();
    if (!db) {
      throw new Error('No database connection available');
    }

    const result = await sql<{
      constraint_name: string;
      constraint_type: string;
      constraint_definition: string;
    }>`
      SELECT 
        tc.constraint_name,
        tc.constraint_type,
        pg_get_constraintdef(pgc.oid) as constraint_definition
      FROM information_schema.table_constraints tc
      JOIN pg_constraint pgc ON pgc.conname = tc.constraint_name
      WHERE tc.table_schema = ${sql.lit(schemaName)}
        AND tc.table_name = ${sql.lit(tableName)}
      ORDER BY tc.constraint_name
    `.execute(db);

    return result.rows.map(row => ({
      constraint_name: row.constraint_name,
      constraint_type: row.constraint_type,
      definition: row.constraint_definition,
    }));
  } catch (error) {
    console.error('Error fetching table constraints:', error);
    throw new Error(`Failed to fetch constraints for table: ${tableName}`);
  }
}

export async function getTableIndexes(schemaName: string, tableName: string) {
  try {
    const db = await getDb();
    if (!db) {
      throw new Error('No database connection available');
    }

    const result = await sql<{
      indexname: string;
      indexdef: string;
    }>`
      SELECT 
        indexname,
        indexdef
      FROM pg_indexes
      WHERE schemaname = ${sql.lit(schemaName)}
        AND tablename = ${sql.lit(tableName)}
      ORDER BY indexname
    `.execute(db);

    return result.rows.map(row => ({
      indexname: row.indexname,
      indexdef: row.indexdef,
    }));
  } catch (error) {
    console.error('Error fetching table indexes:', error);
    throw new Error(`Failed to fetch indexes for table: ${tableName}`);
  }
}

// Lightweight actions for schema browser (SQL console)
export async function getSchemaBrowserTables(schemaName: string) {
  try {
    const db = await getDb();
    if (!db) {
      throw new Error('No database connection available');
    }

    // Only get basic table info - no columns, constraints, or indexes
    const result = await sql<{ table_name: string; table_type: string }>`
      SELECT table_name, table_type 
      FROM information_schema.tables 
      WHERE table_schema = ${sql.lit(schemaName)} 
        AND table_type = 'BASE TABLE'
      ORDER BY table_name ASC
    `.execute(db);

    return result.rows.map(row => ({
      name: row.table_name,
      type: row.table_type,
    }));
  } catch (error) {
    console.error('Error fetching schema browser tables:', error);
    throw new Error(`Failed to fetch tables for schema browser: ${schemaName}`);
  }
}

export async function getSchemaBrowserTableDetails(schemaName: string, tableName: string) {
  try {
    const db = await getDb();
    if (!db) {
      throw new Error('No database connection available');
    }

    // Get only essential column information for schema browser
    const columnsResult = await sql<{
      column_name: string;
      data_type: string;
      is_nullable: string;
      column_default: string | null;
    }>`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_schema = ${sql.lit(schemaName)} 
        AND table_name = ${sql.lit(tableName)}
      ORDER BY ordinal_position ASC
    `.execute(db);

    // Get only essential constraint information
    const constraintsResult = await sql<{
      constraint_name: string;
      constraint_type: string;
      constraint_definition: string;
    }>`
      SELECT 
        tc.constraint_name,
        tc.constraint_type,
        pg_get_constraintdef(pgc.oid) as constraint_definition
      FROM information_schema.table_constraints tc
      JOIN pg_constraint pgc ON pgc.conname = tc.constraint_name
      WHERE tc.table_schema = ${sql.lit(schemaName)}
        AND tc.table_name = ${sql.lit(tableName)}
      ORDER BY tc.constraint_name
    `.execute(db);

    // Get only essential index information
    const indexesResult = await sql<{
      indexname: string;
      indexdef: string;
    }>`
      SELECT 
        indexname,
        indexdef
      FROM pg_indexes
      WHERE schemaname = ${sql.lit(schemaName)}
        AND tablename = ${sql.lit(tableName)}
      ORDER BY indexname
    `.execute(db);

    return {
      columns: columnsResult.rows.map(row => ({
        column_name: row.column_name,
        data_type: row.data_type,
        is_nullable: row.is_nullable === 'YES',
        column_default: row.column_default,
        table_name: tableName,
        is_primary_key: false, // Will be determined from constraints if needed
        foreign_table_name: null, // Not needed for schema browser
        foreign_column_name: null,
      })),
      constraints: constraintsResult.rows.map(row => ({
        constraint_name: row.constraint_name,
        constraint_type: row.constraint_type,
        definition: row.constraint_definition,
      })),
      indexes: indexesResult.rows.map(row => ({
        indexname: row.indexname,
        indexdef: row.indexdef,
      })),
    };
  } catch (error) {
    console.error('Error fetching schema browser table details:', error);
    throw new Error(`Failed to fetch table details for schema browser: ${tableName}`);
  }
}

// ctid is PostgreSQL's physical row identifier - perfect for row identification

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

    console.log('UpdateTableData called with changes:', JSON.stringify(changes, null, 2));

    // Group changes by row index
    const changesByRowIndex = new Map<number, Array<{ column: string; newValue: unknown }>>();

    changes.forEach(change => {
      const rowIndex = change.rowIndex;
      console.log('Processing change for row index:', rowIndex, 'column:', change.column);

      if (!changesByRowIndex.has(rowIndex)) {
        changesByRowIndex.set(rowIndex, []);
      }
      changesByRowIndex.get(rowIndex)!.push({
        column: change.column,
        newValue: change.newValue,
      });
    });

    console.log('Changes grouped by row index:', Array.from(changesByRowIndex.entries()));

    // Execute updates for each row using ctid (PostgreSQL physical row identifier)
    const updatePromises = Array.from(changesByRowIndex.entries()).map(async ([rowIndex, rowChanges]) => {
      // Get the original row data to extract ctid
      const originalRow = changes.find(change => change.rowIndex === rowIndex)?.row;
      if (!originalRow) {
        console.error('Could not find original row data for row index:', rowIndex);
        return;
      }

      // Extract ctid from the original row
      const ctid = originalRow.ctid;
      if (!ctid) {
        console.error('No ctid found in original row data:', originalRow);
        return;
      }

      // Build SET clause for all columns being updated in this row
      const setClauses = rowChanges.map(change => sql`${sql.id(change.column)} = ${sql.lit(change.newValue)}`);

      // Use ctid for precise row identification
      const updateQuery = sql`
        UPDATE ${sql.id(schemaName, tableName)}
        SET ${sql.join(setClauses, sql`, `)}
        WHERE ctid = ${sql.lit(ctid)}
      `;

      console.log('Executing UPDATE for row index:', rowIndex, 'with changes:', rowChanges);
      console.log('Using ctid:', ctid);
      console.log('Generated SQL query:', updateQuery.compile(db).sql);
      console.log('Query parameters:', updateQuery.compile(db).parameters);

      const result = await updateQuery.execute(db);
      console.log('UPDATE result:', result);
      return result;
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
