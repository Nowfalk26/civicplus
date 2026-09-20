/**
 * Centralized Authentication Error Classifier and Handler
 * Strictly avoids showing "Backend server unreachable" for server-side business errors.
 */

export interface FormattedAuthError {
  category:
    | 'BACKEND_UNREACHABLE'
    | 'REQUEST_TIMEOUT'
    | 'AUTH_FAILED'
    | 'INVALID_CREDENTIALS'
    | 'ACCOUNT_NOT_FOUND'
    | 'ACCOUNT_DISABLED'
    | 'OFFICER_NOT_APPROVED'
    | 'MONGODB_UNAVAILABLE'
    | 'AUTH_PROVIDER_FAILURE'
    | 'INVALID_REQUEST'
    | 'ACCESS_DENIED'
    | 'SERVER_ERROR';
  message: string;
}

export function formatAuthError(err: any): FormattedAuthError {
  // 1. Timeout detection (ECONNABORTED or timeout in message)
  if (err?.code === 'ECONNABORTED' || err?.message?.toLowerCase().includes('timeout')) {
    console.warn('[AUTH] Request timed out on:', err.config?.url);
    return {
      category: 'REQUEST_TIMEOUT',
      message: 'Server is taking too long to respond. Please try again.',
    };
  }

  // 2. Genuine network failure / Backend unreachable (no response received at all)
  if (err?.code === 'ERR_NETWORK' || !err?.response) {
    console.warn('[AUTH] Genuine network failure / No response from backend:', err?.message);
    return {
      category: 'BACKEND_UNREACHABLE',
      message: 'Backend server unreachable. Please check your network connection or verify the backend service status.',
    };
  }

  const status: number = err.response.status;
  const data: any = err.response.data;
  const serverMsg: string = data?.message || '';
  const errorCat: string = data?.errorCategory || '';

  // 3. Database Unavailable (503)
  if (status === 503 || errorCat === 'MONGODB_UNAVAILABLE') {
    return {
      category: 'MONGODB_UNAVAILABLE',
      message: serverMsg || 'Database service is currently unavailable. Please try again in a few moments.',
    };
  }

  // 4. Officer Approval / Account Disabled / Forbidden (403)
  if (status === 403 || errorCat === 'OFFICER_NOT_APPROVED' || errorCat === 'ACCOUNT_DISABLED') {
    if (
      data?.isPending ||
      errorCat === 'OFFICER_NOT_APPROVED' ||
      serverMsg.toLowerCase().includes('pending') ||
      serverMsg.toLowerCase().includes('not been approved') ||
      serverMsg.toLowerCase().includes('approval')
    ) {
      return {
        category: 'OFFICER_NOT_APPROVED',
        message: serverMsg || 'Your Officer account has not been approved by the Controller yet.',
      };
    }

    if (
      errorCat === 'ACCOUNT_DISABLED' ||
      serverMsg.toLowerCase().includes('suspended') ||
      serverMsg.toLowerCase().includes('deactivated') ||
      serverMsg.toLowerCase().includes('disabled')
    ) {
      return {
        category: 'ACCOUNT_DISABLED',
        message: serverMsg || 'This account is suspended or disabled. Please contact your department officer or controller.',
      };
    }

    return {
      category: 'ACCESS_DENIED',
      message: serverMsg || 'Access denied for this portal.',
    };
  }

  // 5. Authentication Failed / Invalid Credentials (401)
  if (status === 401 || errorCat === 'INVALID_CREDENTIALS') {
    if (errorCat === 'AUTH_PROVIDER_FAILURE' || serverMsg.toLowerCase().includes('google')) {
      return {
        category: 'AUTH_PROVIDER_FAILURE',
        message: serverMsg || 'External authentication provider verification failed.',
      };
    }
    return {
      category: 'INVALID_CREDENTIALS',
      message: serverMsg || 'Authentication failed. Please verify your credentials and try again.',
    };
  }

  // 6. Account Not Found (404)
  if (status === 404 || errorCat === 'ACCOUNT_NOT_FOUND') {
    return {
      category: 'ACCOUNT_NOT_FOUND',
      message: serverMsg || 'Account not found. Please verify your official ID/Email or submit a registration.',
    };
  }

  // 7. Gateway / External provider error (502, 504)
  if (status === 502 || status === 504) {
    return {
      category: 'AUTH_PROVIDER_FAILURE',
      message: serverMsg || 'Authentication provider service is temporarily unreachable. Please try again.',
    };
  }

  // 8. Bad Request / Validation (400)
  if (status === 400) {
    return {
      category: 'INVALID_REQUEST',
      message: serverMsg || 'Invalid request. Please verify the entered information.',
    };
  }

  // 9. Internal Server Error (500)
  if (status >= 500) {
    return {
      category: 'SERVER_ERROR',
      message: serverMsg || 'Internal server error occurred. The backend is running but encountered an internal failure.',
    };
  }

  return {
    category: 'AUTH_FAILED',
    message: serverMsg || 'Login failed. Please try again.',
  };
}

/**
 * Execute an authentication API request with a single automatic retry on transient network drops
 */
export async function executeAuthWithRetry<T>(
  action: () => Promise<T>,
  maxRetries: number = 1
): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await action();
    } catch (err: any) {
      attempt++;
      // Only retry on true transient network drops (no response or network error), NOT on 4xx/5xx responses
      const isTransientNetworkError = err?.code === 'ERR_NETWORK' || (!err?.response && attempt <= maxRetries);
      if (isTransientNetworkError && attempt <= maxRetries) {
        console.warn(`[AUTH] Network glitch detected on attempt ${attempt}. Retrying in 1s...`);
        await new Promise((resolve) => setTimeout(resolve, 1000));
        continue;
      }
      throw err;
    }
  }
}
