import { Skeleton } from '@/components/ui/skeleton';

export function DataTableSkeleton() {
  return (
    <div className="space-y-4">
      {/* Toolbar Skeleton */}
      <div className="flex gap-2 justify-between items-center max-md:flex-col">
        <div className="flex flex-wrap gap-2 items-center">
          <Skeleton className="h-8 w-[250px]" /> {/* Search bar */}
          <Skeleton className="h-8 w-[120px]" /> {/* Status filter */}
        </div>
        <Skeleton className="h-8 w-8" /> {/* View options */}
      </div>

      {/* Table Skeleton */}
      <div>
        <div className="border-b">
          <div className="flex gap-4 items-center px-4 h-10">
            <Skeleton className="w-4 h-4" /> {/* Checkbox */}
            <Skeleton className="w-8 h-4" /> {/* SL */}
            <Skeleton className="h-4 w-[200px]" /> {/* Info */}
            <Skeleton className="h-4 w-[150px]" /> {/* Address Info */}
            <Skeleton className="h-4 w-[150px]" /> {/* Submission Date */}
            <Skeleton className="h-4 w-[100px]" /> {/* Pay Now */}
            <Skeleton className="h-4 w-[100px]" /> {/* Reference */}
            <Skeleton className="h-4 w-[100px]" /> {/* Message */}
            <Skeleton className="h-4 w-[100px]" /> {/* User Name */}
            <Skeleton className="h-4 w-[100px]" /> {/* Status */}
            <Skeleton className="h-4 w-[80px] ml-auto" /> {/* Action */}
          </div>
        </div>
        <div>
          {/* Table Rows */}
          {Array.from({ length: 10 }).map((_, index) => (
            <div key={index} className="border-b">
              <div className="flex gap-4 items-center px-4 h-16">
                <Skeleton className="w-4 h-4" /> {/* Checkbox */}
                <Skeleton className="w-8 h-4" /> {/* SL */}
                <div className="space-y-2">
                  <Skeleton className="h-4 w-[200px]" /> {/* Name */}
                  <Skeleton className="h-4 w-[150px]" /> {/* Passport */}
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-[150px]" /> {/* Country */}
                  <Skeleton className="h-4 w-[100px]" /> {/* City */}
                </div>
                <Skeleton className="h-4 w-[150px]" /> {/* Date */}
                <Skeleton className="h-4 w-[100px]" /> {/* Pay Now */}
                <Skeleton className="h-4 w-[100px]" /> {/* Reference */}
                <Skeleton className="h-4 w-[100px]" /> {/* Message */}
                <Skeleton className="h-4 w-[100px]" /> {/* User Name */}
                <Skeleton className="h-4 w-[100px]" /> {/* Status */}
                <Skeleton className="ml-auto w-8 h-8" /> {/* Action */}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pagination Skeleton */}
      <div className="flex justify-center items-center px-2">
        <div className="flex items-center space-x-6 lg:space-x-8">
          <div className="flex items-center space-x-2">
            <Skeleton className="w-24 h-8" /> {/* Rows per page */}
            <Skeleton className="h-8 w-[70px]" /> {/* Page size select */}
          </div>
          <Skeleton className="h-8 w-[100px]" /> {/* Page info */}
          <div className="flex items-center space-x-2">
            <Skeleton className="w-8 h-8" /> {/* First page */}
            <Skeleton className="w-8 h-8" /> {/* Previous page */}
            <Skeleton className="w-8 h-8" /> {/* Next page */}
            <Skeleton className="w-8 h-8" /> {/* Last page */}
          </div>
        </div>
      </div>
    </div>
  );
}
