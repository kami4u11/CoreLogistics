import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { base44 } from "@/api/base44Client";

// ============= EXISTING CODE (PRESERVED) =============

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function createPageUrl(page: string, params: Record<string, string> = {}) {
  let url = `/${page.toLowerCase()}`;
  const queryParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value) queryParams.append(key, value);
  });
  
  const queryString = queryParams.toString();
  if (queryString) url += `?${queryString}`;
  
  return url;
}

// Add any other existing utility functions here
// For example, if you have:
// export function formatDate(date: string) { ... }
// export function calculateProfit(income: number, expenses: number) { ... }
// etc.

// ============= NEW ERROR HANDLING UTILITIES =============

/**
 * Wraps an async function with error handling
 * @param fn - Async function to wrap
 * @param fallback - Value to return on error (default: null)
 * @returns Wrapped function that never throws
 */
export function withErrorHandling<T, Args extends any[]>(
  fn: (...args: Args) => Promise<T>, 
  fallback: T | null = null
): (...args: Args) => Promise<T | null> {
  return async (...args: Args): Promise<T | null> => {
    try {
      return await fn(...args);
    } catch (error) {
      console.error("Error in async function:", error);
      return fallback;
    }
  };
}

/**
 * Safely execute any async operation with automatic error logging
 * @param operation - Async function to execute
 * @param options - Options
 * @returns Result or fallback
 */
export async function safeAsync<T>(
  operation: () => Promise<T>, 
  options: {
    fallback?: T | null;
    silent?: boolean;
    onError?: (error: Error) => void;
  } = {}
): Promise<T | null> {
  const { fallback = null, silent = false, onError = null } = options;
  
  try {
    return await operation();
  } catch (error) {
    if (!silent) {
      console.error("Safe async error:", error);
    }
    if (onError) {
      onError(error as Error);
    }
    return fallback;
  }
}

/**
 * Create a query function for react-query with error handling
 * @param queryFn - Original query function
 * @param fallback - Fallback value
 * @returns Safe query function
 */
export function createSafeQuery<T>(
  queryFn: () => Promise<T>, 
  fallback: T | null = null
): () => Promise<T | null> {
  return async (): Promise<T | null> => {
    try {
      return await queryFn();
    } catch (error) {
      console.error("Query error:", error);
      return fallback;
    }
  };
}

/**
 * Format error message for display
 * @param error - Error object
 * @param defaultMessage - Default message
 * @returns User-friendly error message
 */
export function formatErrorMessage(
  error: unknown, 
  defaultMessage: string = "An error occurred"
): string {
  if (!error) return defaultMessage;
  
  // Handle different error types
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    
    // Check for common error patterns
    if (message.includes("network") || message.includes("failed to fetch")) {
      return "Network error. Please check your connection.";
    }
    if (message.includes("timeout")) {
      return "Request timed out. Please try again.";
    }
    if (message.includes("403") || message.includes("unauthorized")) {
      return "You don't have permission to perform this action.";
    }
    if (message.includes("404") || message.includes("not found")) {
      return "The requested resource was not found.";
    }
    if (message.includes("500")) {
      return "Server error. Please try again later.";
    }
    
    return error.message;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  return defaultMessage;
}

/**
 * Retry a failed operation with exponential backoff
 * @param fn - Async function to retry
 * @param options - Retry options
 * @returns Result
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>, 
  options: {
    maxRetries?: number;
    initialDelay?: number;
    onRetry?: (attempt: number, maxRetries: number, delay: number) => void;
  } = {}
): Promise<T> {
  const { maxRetries = 3, initialDelay = 1000, onRetry = null } = options;
  
  let lastError: Error;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxRetries - 1) break;
      
      const delay = initialDelay * Math.pow(2, attempt);
      console.log(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`);
      
      if (onRetry) {
        onRetry(attempt + 1, maxRetries, delay);
      }
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}

/**
 * Batch multiple API calls and handle errors individually
 * @param operations - Array of async operations
 * @returns Results with errors as null values
 */
export async function batchWithErrors<T>(
  operations: Array<() => Promise<T>>
): Promise<Array<T | null>> {
  const results = await Promise.allSettled(
    operations.map(op => op())
  );
  
  return results.map(result => 
    result.status === 'fulfilled' ? result.value : null
  );
}

/**
 * Create a debounced function with error handling
 * @param fn - Function to debounce
 * @param delay - Delay in ms
 * @returns Debounced function
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T, 
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: Parameters<T>): void => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(async () => {
      try {
        await fn(...args);
      } catch (error) {
        console.error("Debounced function error:", error);
      }
    }, delay);
  };
}