import winston from 'winston'

const isProduction = process.env.NODE_ENV === 'production'

const logger = winston.createLogger({
  level: isProduction ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    isProduction
      ? winston.format.json()
      : winston.format.combine(
          winston.format.colorize(),
          winston.format.printf(({ timestamp, level, message }) => {
            return `${timestamp} [${level}]: ${message}`
          })
        )
  ),
  transports: [
    // Always log to console
    new winston.transports.Console(),

    // In production, also write to files
    ...(isProduction
      ? [
          new winston.transports.File({
            filename: './logs/error.log',
            level: 'error',
            maxsize: 5 * 1024 * 1024, // 5MB
            maxFiles: 5,
          }),
          new winston.transports.File({
            filename: './logs/combined.log',
            maxsize: 5 * 1024 * 1024, // 5MB
            maxFiles: 5,
          }),
        ]
      : []),
  ],
})

export default logger
