/**
 * Defines the standardized structure for all successful API responses.
 */
export interface StandardResponse<T> {
  statusCode: number;
  success: boolean;
  message: string;
  data: T | null;
  timestamp: string;
}
