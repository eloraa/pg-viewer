'use client';

import { useQuery } from '@tanstack/react-query';
import { getSchemas, getTables, getTableColumns, getTableData } from '@/lib/server/actions';

export type DatabaseTable = {
  name: string;
  type: string;
};

export type DatabaseColumn = {
  name: string;
  type: string;
  nullable: boolean;
  foreignKey?: {
    referencedSchema: string;
    referencedTable: string;
    referencedColumn: string;
    constraintName: string;
  };
};

export const useSchemas = () => {
  return useQuery({
    queryKey: ['schemas'],
    queryFn: getSchemas,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useTables = (schemaName: string | null) => {
  return useQuery({
    queryKey: ['tables', schemaName],
    queryFn: () => getTables(schemaName!),
    enabled: !!schemaName,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useTableColumns = (schemaName: string | null, tableName: string | null) => {
  return useQuery({
    queryKey: ['tableColumns', schemaName, tableName],
    queryFn: () => getTableColumns(schemaName!, tableName!),
    enabled: !!schemaName && !!tableName,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useTableData = (
  schemaName: string | null, 
  tableName: string | null, 
  filters?: Array<{
    id: string;
    connector: 'where' | 'and' | 'or';
    column: string;
    operator: 'equals' | 'not_equals' | 'contains' | 'starts_with' | 'ends_with' | 'greater_than' | 'less_than' | 'is_null' | 'is_not_null';
    value: string;
  }>,
  limit: number = 100, 
  offset: number = 0
) => {
  return useQuery({
    queryKey: ['tableData', schemaName, tableName, filters, limit, offset],
    queryFn: () => getTableData(schemaName!, tableName!, limit, offset, filters),
    enabled: !!schemaName && !!tableName,
    staleTime: 2 * 60 * 1000, // 2 minutes (shorter for data)
  });
};