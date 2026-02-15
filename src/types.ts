/**
 * Log severity levels
 */
export type LogLevel = 'error' | 'warn' | 'info' | 'debug'

/**
 * Represents a single error log entry stored in the database
 */
export interface ErrorLogEntry {
    /** Unique identifier for the log entry */
    id: string
    /** Severity level of the log */
    level: LogLevel
    /** Human-readable error message */
    message: string
    /** Full stack trace (for errors) */
    stack?: string | null
    /** ID of the user who encountered the error */
    userId?: string | null
    /** Email of the user who encountered the error */
    userEmail?: string | null
    /** Display name of the user */
    userName?: string | null
    /** URL path where the error occurred */
    path?: string | null
    /** HTTP method (GET, POST, etc.) */
    method?: string | null
    /** Browser/client user agent string */
    userAgent?: string | null
    /** Client IP address */
    ip?: string | null
    /** Additional custom metadata */
    metadata?: Record<string, unknown> | null
    /** Timestamp when the error occurred */
    createdAt: Date
}

/**
 * Configuration options for the error logger
 */
export interface ErrorLoggerConfig {
    /** Database adapter for storing logs */
    adapter: DatabaseAdapter
    /** Auth adapter for automatically capturing user context (optional) */
    authAdapter?: AuthAdapter
    /** Number of days to retain logs (default: 30) */
    retentionDays?: number
    /** Log levels to capture (default: all levels) */
    levels?: LogLevel[]
    /** Enable console output in development (default: true) */
    consoleInDev?: boolean
}

/**
 * Database adapter interface - implement this for custom database support
 */
export interface DatabaseAdapter {
    /**
     * Create a new log entry
     * @param entry - The log entry data (without id and createdAt)
     * @returns The created log entry with id and createdAt
     */
    create(
        entry: Omit<ErrorLogEntry, 'id' | 'createdAt'>,
    ): Promise<ErrorLogEntry>

    /**
     * Find multiple log entries with filtering and pagination
     * @param options - Query options
     * @returns Object containing logs array and total count
     */
    findMany(
        options: QueryOptions,
    ): Promise<{ logs: ErrorLogEntry[]; total: number }>

    /**
     * Find a single log entry by ID
     * @param id - The log entry ID
     * @returns The log entry or null if not found
     */
    findById(id: string): Promise<ErrorLogEntry | null>

    /**
     * Delete a single log entry
     * @param id - The log entry ID
     */
    delete(id: string): Promise<void>

    /**
     * Delete multiple log entries
     * @param options - Filter options for deletion
     * @returns Number of deleted entries
     */
    deleteMany(options: { before?: Date; level?: LogLevel }): Promise<number>
}

/**
 * Auth adapter interface - implement this for custom auth providers
 */
export interface AuthAdapter {
    /**
     * Get the current authenticated user
     * @returns User object or null if not authenticated
     */
    getUser(): Promise<{ id: string; email?: string; name?: string } | null>
}

/**
 * Query options for filtering and paginating log entries
 */
export interface QueryOptions {
    /** Page number (1-indexed, default: 1) */
    page?: number
    /** Number of items per page (default: 50) */
    limit?: number
    /** Filter by log level */
    level?: LogLevel
    /** Filter by user ID */
    userId?: string
    /** Search term for message, stack, or path */
    search?: string
    /** Filter logs after this date */
    startDate?: Date
    /** Filter logs before this date */
    endDate?: Date
    /** Field to sort by (default: createdAt) */
    orderBy?: 'createdAt' | 'level'
    /** Sort direction (default: desc) */
    order?: 'asc' | 'desc'
}

/**
 * Context information extracted from a request
 */
export interface RequestContext {
    /** URL path */
    path?: string
    /** HTTP method */
    method?: string
    /** User agent string */
    userAgent?: string
    /** Client IP address */
    ip?: string
    /** Additional custom metadata */
    metadata?: Record<string, unknown>
}

/**
 * Result of a logging operation
 */
export interface LogResult {
    /** Whether the log was successfully stored */
    success: boolean
    /** The created log entry (if successful) */
    entry?: ErrorLogEntry
    /** Error message (if failed) */
    error?: string
}

/**
 * Props for the LogViewer component
 */
export interface LogViewerProps {
    /** Base path for the logs API (default: /api/logs) */
    apiBasePath?: string
    /** Additional CSS classes for the container */
    className?: string
    /** CSS classes for specific parts of the component */
    classNames?: LogViewerClassNames
    /** Number of logs per page (default: 50) */
    pageSize?: number
    /** Custom theme colors */
    theme?: LogViewerTheme
    /** Callback when a log is selected */
    onLogSelect?: (log: ErrorLogEntry) => void
    /** Callback when a log is deleted */
    onDelete?: (id: string) => void
    /** Whether to show the delete button (default: true) */
    showDelete?: boolean
    /** Whether to auto-refresh (in seconds, 0 to disable) */
    autoRefresh?: number
    /** Custom date formatter (default: toLocaleString) */
    formatDate?: (date: Date) => string
    /** Custom message when no logs are found */
    emptyMessage?: string
    /** Show/hide specific columns */
    columns?: LogViewerColumns
    /** Title shown above the log viewer */
    title?: string
    /** Description shown below the title */
    description?: string
    /** Hide the header (title, description, filters) */
    hideHeader?: boolean
    /** Hide the filters */
    hideFilters?: boolean
}

/**
 * CSS class names for different parts of the LogViewer
 */
export interface LogViewerClassNames {
    /** Container wrapper */
    container?: string
    /** Header section (title, description) */
    header?: string
    /** Filters section */
    filters?: string
    /** Table element */
    table?: string
    /** Table header row */
    tableHeader?: string
    /** Table body */
    tableBody?: string
    /** Individual table row */
    tableRow?: string
    /** Pagination section */
    pagination?: string
    /** Log detail modal */
    modal?: string
}

/**
 * Column visibility configuration
 */
export interface LogViewerColumns {
    /** Show level column (default: true) */
    level?: boolean
    /** Show message column (default: true) */
    message?: boolean
    /** Show user column (default: true) */
    user?: boolean
    /** Show path column (default: true) */
    path?: boolean
    /** Show timestamp column (default: true) */
    timestamp?: boolean
    /** Show actions column (default: true) */
    actions?: boolean
}

/**
 * Theme configuration for the LogViewer component
 */
export interface LogViewerTheme {
    /** Background color for error level badge */
    errorBg?: string
    /** Text color for error level badge */
    errorText?: string
    /** Background color for warn level badge */
    warnBg?: string
    /** Text color for warn level badge */
    warnText?: string
    /** Background color for info level badge */
    infoBg?: string
    /** Text color for info level badge */
    infoText?: string
    /** Background color for debug level badge */
    debugBg?: string
    /** Text color for debug level badge */
    debugText?: string
}
