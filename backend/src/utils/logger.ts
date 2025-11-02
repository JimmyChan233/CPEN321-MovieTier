// Simple logger utility without external dependencies
// Uses ANSI color codes for terminal output

// Sanitize strings to prevent CRLF injection in logs
function sanitizeForLog(value: string): string {
  return value.replace(/[\r\n]/g, ' ');
}

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',

  // Foreground colors
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',

  // Background colors
  bgBlack: '\x1b[40m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',
  bgWhite: '\x1b[47m',
};

function getTimestamp(): string {
  return new Date().toISOString();
}

function formatMessage(level: string, color: string, message: string, ...args: unknown[]): void {
  const timestamp = getTimestamp();
  const sanitizedMessage = sanitizeForLog(message);
  const formattedArgs = args.length > 0
    ? ' ' + args.map(arg =>
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : sanitizeForLog(String(arg))
      ).join(' ')
    : '';

  const parts = [
    colors.dim,
    '[',
    timestamp,
    ']',
    colors.reset,
    ' ',
    color,
    level,
    colors.reset,
    ' ',
    sanitizedMessage,
    formattedArgs,
    '\n'
  ];
  process.stdout.write(parts.join(''));
}

export const logger = {
  info: (message: string, ...args: unknown[]) => {
    formatMessage('INFO', colors.cyan, message, ...args);
  },

  success: (message: string, ...args: unknown[]) => {
    formatMessage('SUCCESS', colors.green, message, ...args);
  },

  warn: (message: string, ...args: unknown[]) => {
    formatMessage('WARN', colors.yellow, message, ...args);
  },

  error: (message: string, ...args: unknown[]) => {
    formatMessage('ERROR', colors.red, message, ...args);
  },

  debug: (message: string, ...args: unknown[]) => {
    if (process.env.NODE_ENV === 'development') {
      formatMessage('DEBUG', colors.magenta, message, ...args);
    }
  },

  http: (method: string, url: string, statusCode?: number, duration?: number) => {
    const methodColor = colors.bright + colors.blue;
    const statusColor = statusCode && statusCode >= 400 ? colors.red : colors.green;
    const durationStr = duration ? ' ' + colors.dim + '(' + String(duration) + 'ms)' + colors.reset : '';
    const sanitizedMethod = sanitizeForLog(method);
    const sanitizedUrl = sanitizeForLog(url);
    const statusStr = statusCode !== undefined ? String(statusCode) : '';

    const parts = [
      colors.dim,
      '[',
      getTimestamp(),
      ']',
      colors.reset,
      ' ',
      methodColor,
      sanitizedMethod,
      colors.reset,
      ' ',
      sanitizedUrl,
      ' ',
      statusColor,
      statusStr,
      colors.reset,
      durationStr,
      '\n'
    ];
    process.stdout.write(parts.join(''));
  },
};
