type LogLevel = 'error' | 'warn' | 'info' | 'debug';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: any;
  apiEndpoint?: string;
  cost?: number;
  responseTime?: number;
  endpoint?: string;
}


// Functional logging utilities
const isDevelopment = process.env.NODE_ENV === 'development';

const formatTimestamp = (): string => {
  return new Date().toISOString();
};

const createLogEntry = (
  level: LogLevel, 
  message: string, 
  context?: any,
  metadata?: Partial<LogEntry>
): LogEntry => {
  return {
    timestamp: formatTimestamp(),
    level,
    message,
    context,
    ...metadata
  };
};

const outputLog = (logEntry: LogEntry): void => {
  if (isDevelopment) {
    const colorCodes: Record<LogLevel, string> & { reset: string } = {
      error: '\x1b[31m',
      warn: '\x1b[33m', 
      info: '\x1b[34m',
      debug: '\x1b[36m',
      reset: '\x1b[0m'
    };

    const color = colorCodes[logEntry.level] || colorCodes.info;
    const resetColor = colorCodes.reset;
    
    console.log(
      `${color}[${logEntry.timestamp}] [DataForSEO-${logEntry.level.toUpperCase()}]${resetColor} ${logEntry.message}`
    );
    
    if (logEntry.context) {
      console.log(`${color}Context:${resetColor}`, JSON.stringify(logEntry.context, null, 2));
    }

    if (logEntry.apiEndpoint) {
      console.log(`${color}Endpoint:${resetColor} ${logEntry.apiEndpoint}`);
    }

    if (logEntry.cost !== undefined) {
      console.log(`${color}Cost:${resetColor} $${logEntry.cost}`);
    }

    if (logEntry.responseTime) {
      console.log(`${color}Response Time:${resetColor} ${logEntry.responseTime}ms`);
    }
  }
};

// Functional logging functions
export const logError = (message: string, error?: any, metadata?: Partial<LogEntry>): void => {
  const logEntry = createLogEntry('error', message, error, metadata);
  outputLog(logEntry);
};

export const logWarn = (message: string, context?: any, metadata?: Partial<LogEntry>): void => {
  const logEntry = createLogEntry('warn', message, context, metadata);
  outputLog(logEntry);
};

export const logInfo = (message: string, context?: any, metadata?: Partial<LogEntry>): void => {
  const logEntry = createLogEntry('info', message, context, metadata);
  outputLog(logEntry);
};

export const logDebug = (message: string, context?: any, metadata?: Partial<LogEntry>): void => {
  if (isDevelopment) {
    const logEntry = createLogEntry('debug', message, context, metadata);
    outputLog(logEntry);
  }
};

export const logApiCall = (endpoint: string, params: any, startTime: number): void => {
  const responseTime = Date.now() - startTime;
  logInfo(`API call completed`, params, {
    apiEndpoint: endpoint,
    responseTime
  });
};

export const logApiError = (endpoint: string, error: any, startTime: number): void => {
  const responseTime = Date.now() - startTime;
  logError(`API call failed`, error, {
    apiEndpoint: endpoint,
    responseTime
  });
};

export const logApiCost = (endpoint: string, cost: number): void => {
  logInfo(`API cost incurred`, undefined, {
    apiEndpoint: endpoint,
    cost
  });
};

// Export types
export { LogEntry, LogLevel };