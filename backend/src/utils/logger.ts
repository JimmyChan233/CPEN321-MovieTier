// Simple logger utility without external dependencies
// Uses ANSI color codes for terminal output

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

function formatMessage(level: string, color: string, message: string, ...args: any[]): void {
  const timestamp = getTimestamp();
  const formattedArgs = args.length > 0 ? ' ' + args.map(arg =>
    typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
  ).join(' ') : '';

  console.log(
    `${colors.dim}[${timestamp}]${colors.reset} ${color}${level}${colors.reset} ${message}${formattedArgs}`
  );
}

export const logger = {
  info: (message: string, ...args: any[]) => {
    formatMessage('INFO', colors.cyan, message, ...args);
  },

  success: (message: string, ...args: any[]) => {
    formatMessage('SUCCESS', colors.green, message, ...args);
  },

  warn: (message: string, ...args: any[]) => {
    formatMessage('WARN', colors.yellow, message, ...args);
  },

  error: (message: string, ...args: any[]) => {
    formatMessage('ERROR', colors.red, message, ...args);
  },

  debug: (message: string, ...args: any[]) => {
    if (process.env.NODE_ENV === 'development') {
      formatMessage('DEBUG', colors.magenta, message, ...args);
    }
  },

  http: (method: string, url: string, statusCode?: number, duration?: number) => {
    const methodColor = colors.bright + colors.blue;
    const statusColor = statusCode && statusCode >= 400 ? colors.red : colors.green;
    const durationStr = duration ? ` ${colors.dim}(${duration}ms)${colors.reset}` : '';

    console.log(
      `${colors.dim}[${getTimestamp()}]${colors.reset} ${methodColor}${method}${colors.reset} ${url} ${statusColor}${statusCode || ''}${colors.reset}${durationStr}`
    );
  },
};
