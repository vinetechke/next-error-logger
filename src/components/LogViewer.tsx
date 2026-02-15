'use client'

import { useState, useEffect, useCallback } from 'react'
import type {
    ErrorLogEntry,
    LogLevel,
    LogViewerProps,
    LogViewerTheme,
} from '../types'

const defaultTheme: Required<LogViewerTheme> = {
    errorBg: 'rgb(254, 226, 226)',
    errorText: 'rgb(153, 27, 27)',
    warnBg: 'rgb(254, 249, 195)',
    warnText: 'rgb(133, 77, 14)',
    infoBg: 'rgb(219, 234, 254)',
    infoText: 'rgb(30, 64, 175)',
    debugBg: 'rgb(243, 244, 246)',
    debugText: 'rgb(55, 65, 81)',
}

/**
 * LogViewer component - A complete UI for viewing and managing error logs
 *
 * @example
 * ```tsx
 * // Basic usage
 * import { LogViewer } from '@vinetechke/next-error-logger/components'
 *
 * export default function LogsPage() {
 *   return (
 *     <div className="p-6">
 *       <h1>Error Logs</h1>
 *       <LogViewer apiBasePath="/api/admin/logs" />
 *     </div>
 *   )
 * }
 * ```
 *
 * @example
 * ```tsx
 * // With custom theme
 * <LogViewer
 *   apiBasePath="/api/admin/logs"
 *   theme={{
 *     errorBg: '#fee2e2',
 *     errorText: '#dc2626',
 *   }}
 *   pageSize={25}
 *   autoRefresh={30}
 *   showDelete
 * />
 * ```
 */
export function LogViewer({
    apiBasePath = '/api/logs',
    className = '',
    pageSize = 50,
    theme: customTheme,
    onLogSelect,
    showDelete = true,
    autoRefresh = 0,
}: LogViewerProps) {
    const theme = { ...defaultTheme, ...customTheme }

    const [logs, setLogs] = useState<ErrorLogEntry[]>([])
    const [total, setTotal] = useState(0)
    const [loading, setLoading] = useState(true)
    const [page, setPage] = useState(1)
    const [filters, setFilters] = useState({
        level: '' as LogLevel | '',
        search: '',
        userId: '',
    })
    const [selectedLog, setSelectedLog] = useState<ErrorLogEntry | null>(null)
    const [deleting, setDeleting] = useState(false)

    const fetchLogs = useCallback(async () => {
        setLoading(true)
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: pageSize.toString(),
                ...(filters.level && { level: filters.level }),
                ...(filters.search && { search: filters.search }),
                ...(filters.userId && { userId: filters.userId }),
            })

            const res = await fetch(`${apiBasePath}?${params}`)
            if (!res.ok) throw new Error('Failed to fetch logs')

            const data = await res.json()
            setLogs(data.logs)
            setTotal(data.total)
        } catch (error) {
            console.error('Failed to fetch logs:', error)
        } finally {
            setLoading(false)
        }
    }, [apiBasePath, page, pageSize, filters])

    useEffect(() => {
        fetchLogs()
    }, [fetchLogs])

    // Auto-refresh
    useEffect(() => {
        if (autoRefresh <= 0) return

        const interval = setInterval(fetchLogs, autoRefresh * 1000)
        return () => clearInterval(interval)
    }, [autoRefresh, fetchLogs])

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this log?')) return

        setDeleting(true)
        try {
            const res = await fetch(`${apiBasePath}/${id}`, {
                method: 'DELETE',
            })
            if (!res.ok) throw new Error('Failed to delete log')

            setLogs(prev => prev.filter(log => log.id !== id))
            setTotal(prev => prev - 1)
            if (selectedLog?.id === id) setSelectedLog(null)
        } catch (error) {
            console.error('Failed to delete log:', error)
            alert('Failed to delete log')
        } finally {
            setDeleting(false)
        }
    }

    const handleClearAll = async () => {
        const confirmed = confirm(
            'Are you sure you want to delete ALL logs? This cannot be undone.',
        )
        if (!confirmed) return

        setDeleting(true)
        try {
            const res = await fetch(apiBasePath, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({}),
            })
            if (!res.ok) throw new Error('Failed to clear logs')

            setLogs([])
            setTotal(0)
            setSelectedLog(null)
        } catch (error) {
            console.error('Failed to clear logs:', error)
            alert('Failed to clear logs')
        } finally {
            setDeleting(false)
        }
    }

    const getLevelStyle = (level: LogLevel) => {
        switch (level) {
            case 'error':
                return {
                    backgroundColor: theme.errorBg,
                    color: theme.errorText,
                }
            case 'warn':
                return { backgroundColor: theme.warnBg, color: theme.warnText }
            case 'info':
                return { backgroundColor: theme.infoBg, color: theme.infoText }
            case 'debug':
                return {
                    backgroundColor: theme.debugBg,
                    color: theme.debugText,
                }
        }
    }

    const totalPages = Math.ceil(total / pageSize)

    return (
        <div
            className={className}
            style={{ fontFamily: 'system-ui, sans-serif' }}
        >
            {/* Filters */}
            <div
                style={{
                    display: 'flex',
                    gap: '1rem',
                    marginBottom: '1rem',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                }}
            >
                <select
                    value={filters.level}
                    onChange={e => {
                        setFilters({
                            ...filters,
                            level: e.target.value as LogLevel | '',
                        })
                        setPage(1)
                    }}
                    style={{
                        padding: '0.5rem 1rem',
                        borderRadius: '0.375rem',
                        border: '1px solid #d1d5db',
                        fontSize: '0.875rem',
                    }}
                >
                    <option value="">All Levels</option>
                    <option value="error">Error</option>
                    <option value="warn">Warning</option>
                    <option value="info">Info</option>
                    <option value="debug">Debug</option>
                </select>

                <input
                    type="text"
                    placeholder="Search logs..."
                    value={filters.search}
                    onChange={e => {
                        setFilters({ ...filters, search: e.target.value })
                        setPage(1)
                    }}
                    style={{
                        padding: '0.5rem 1rem',
                        borderRadius: '0.375rem',
                        border: '1px solid #d1d5db',
                        flex: 1,
                        minWidth: '200px',
                        fontSize: '0.875rem',
                    }}
                />

                <input
                    type="text"
                    placeholder="User ID..."
                    value={filters.userId}
                    onChange={e => {
                        setFilters({ ...filters, userId: e.target.value })
                        setPage(1)
                    }}
                    style={{
                        padding: '0.5rem 1rem',
                        borderRadius: '0.375rem',
                        border: '1px solid #d1d5db',
                        width: '150px',
                        fontSize: '0.875rem',
                    }}
                />

                <button
                    onClick={fetchLogs}
                    disabled={loading}
                    style={{
                        padding: '0.5rem 1rem',
                        borderRadius: '0.375rem',
                        backgroundColor: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        opacity: loading ? 0.7 : 1,
                        fontSize: '0.875rem',
                    }}
                >
                    {loading ? 'Loading...' : 'Refresh'}
                </button>

                {showDelete && (
                    <button
                        onClick={handleClearAll}
                        disabled={deleting || total === 0}
                        style={{
                            padding: '0.5rem 1rem',
                            borderRadius: '0.375rem',
                            backgroundColor: '#ef4444',
                            color: 'white',
                            border: 'none',
                            cursor:
                                deleting || total === 0
                                    ? 'not-allowed'
                                    : 'pointer',
                            opacity: deleting || total === 0 ? 0.7 : 1,
                            fontSize: '0.875rem',
                        }}
                    >
                        Clear All
                    </button>
                )}
            </div>

            {/* Stats */}
            <div
                style={{
                    marginBottom: '1rem',
                    fontSize: '0.875rem',
                    color: '#6b7280',
                }}
            >
                Showing {logs.length} of {total} logs
                {autoRefresh > 0 && ` • Auto-refreshing every ${autoRefresh}s`}
            </div>

            {/* Log Table */}
            <div
                style={{
                    border: '1px solid #e5e7eb',
                    borderRadius: '0.5rem',
                    overflow: 'hidden',
                }}
            >
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ backgroundColor: '#f9fafb' }}>
                            <th
                                style={{
                                    padding: '0.75rem 1rem',
                                    textAlign: 'left',
                                    fontSize: '0.875rem',
                                    fontWeight: 500,
                                    borderBottom: '1px solid #e5e7eb',
                                }}
                            >
                                Level
                            </th>
                            <th
                                style={{
                                    padding: '0.75rem 1rem',
                                    textAlign: 'left',
                                    fontSize: '0.875rem',
                                    fontWeight: 500,
                                    borderBottom: '1px solid #e5e7eb',
                                }}
                            >
                                Message
                            </th>
                            <th
                                style={{
                                    padding: '0.75rem 1rem',
                                    textAlign: 'left',
                                    fontSize: '0.875rem',
                                    fontWeight: 500,
                                    borderBottom: '1px solid #e5e7eb',
                                }}
                            >
                                User
                            </th>
                            <th
                                style={{
                                    padding: '0.75rem 1rem',
                                    textAlign: 'left',
                                    fontSize: '0.875rem',
                                    fontWeight: 500,
                                    borderBottom: '1px solid #e5e7eb',
                                }}
                            >
                                Path
                            </th>
                            <th
                                style={{
                                    padding: '0.75rem 1rem',
                                    textAlign: 'left',
                                    fontSize: '0.875rem',
                                    fontWeight: 500,
                                    borderBottom: '1px solid #e5e7eb',
                                }}
                            >
                                Time
                            </th>
                            {showDelete && (
                                <th
                                    style={{
                                        padding: '0.75rem 1rem',
                                        textAlign: 'center',
                                        fontSize: '0.875rem',
                                        fontWeight: 500,
                                        borderBottom: '1px solid #e5e7eb',
                                        width: '80px',
                                    }}
                                >
                                    Actions
                                </th>
                            )}
                        </tr>
                    </thead>
                    <tbody>
                        {loading && logs.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={showDelete ? 6 : 5}
                                    style={{
                                        padding: '2rem',
                                        textAlign: 'center',
                                        color: '#6b7280',
                                    }}
                                >
                                    Loading...
                                </td>
                            </tr>
                        ) : logs.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={showDelete ? 6 : 5}
                                    style={{
                                        padding: '2rem',
                                        textAlign: 'center',
                                        color: '#6b7280',
                                    }}
                                >
                                    No logs found
                                </td>
                            </tr>
                        ) : (
                            logs.map(log => (
                                <tr
                                    key={log.id}
                                    onClick={() => {
                                        setSelectedLog(log)
                                        onLogSelect?.(log)
                                    }}
                                    style={{
                                        cursor: 'pointer',
                                        backgroundColor:
                                            selectedLog?.id === log.id
                                                ? '#f3f4f6'
                                                : 'white',
                                    }}
                                    onMouseEnter={e => {
                                        if (selectedLog?.id !== log.id) {
                                            e.currentTarget.style.backgroundColor =
                                                '#f9fafb'
                                        }
                                    }}
                                    onMouseLeave={e => {
                                        if (selectedLog?.id !== log.id) {
                                            e.currentTarget.style.backgroundColor =
                                                'white'
                                        }
                                    }}
                                >
                                    <td
                                        style={{
                                            padding: '0.75rem 1rem',
                                            borderBottom: '1px solid #e5e7eb',
                                        }}
                                    >
                                        <span
                                            style={{
                                                ...getLevelStyle(log.level),
                                                padding: '0.25rem 0.5rem',
                                                borderRadius: '0.25rem',
                                                fontSize: '0.75rem',
                                                fontWeight: 500,
                                                textTransform: 'uppercase',
                                            }}
                                        >
                                            {log.level}
                                        </span>
                                    </td>
                                    <td
                                        style={{
                                            padding: '0.75rem 1rem',
                                            borderBottom: '1px solid #e5e7eb',
                                            fontSize: '0.875rem',
                                            maxWidth: '300px',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                        }}
                                    >
                                        {log.message}
                                    </td>
                                    <td
                                        style={{
                                            padding: '0.75rem 1rem',
                                            borderBottom: '1px solid #e5e7eb',
                                            fontSize: '0.875rem',
                                            color: '#6b7280',
                                        }}
                                    >
                                        {log.userEmail ||
                                            log.userName ||
                                            log.userId ||
                                            '-'}
                                    </td>
                                    <td
                                        style={{
                                            padding: '0.75rem 1rem',
                                            borderBottom: '1px solid #e5e7eb',
                                            fontSize: '0.875rem',
                                            color: '#6b7280',
                                        }}
                                    >
                                        {log.path || '-'}
                                    </td>
                                    <td
                                        style={{
                                            padding: '0.75rem 1rem',
                                            borderBottom: '1px solid #e5e7eb',
                                            fontSize: '0.875rem',
                                            color: '#6b7280',
                                            whiteSpace: 'nowrap',
                                        }}
                                    >
                                        {new Date(
                                            log.createdAt,
                                        ).toLocaleString()}
                                    </td>
                                    {showDelete && (
                                        <td
                                            style={{
                                                padding: '0.75rem 1rem',
                                                borderBottom:
                                                    '1px solid #e5e7eb',
                                                textAlign: 'center',
                                            }}
                                        >
                                            <button
                                                onClick={e => {
                                                    e.stopPropagation()
                                                    handleDelete(log.id)
                                                }}
                                                disabled={deleting}
                                                style={{
                                                    padding: '0.25rem 0.5rem',
                                                    borderRadius: '0.25rem',
                                                    backgroundColor:
                                                        'transparent',
                                                    color: '#ef4444',
                                                    border: '1px solid #ef4444',
                                                    cursor: deleting
                                                        ? 'not-allowed'
                                                        : 'pointer',
                                                    fontSize: '0.75rem',
                                                }}
                                            >
                                                Delete
                                            </button>
                                        </td>
                                    )}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginTop: '1rem',
                    }}
                >
                    <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                        Page {page} of {totalPages}
                    </span>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                            onClick={() => setPage(1)}
                            disabled={page === 1}
                            style={{
                                padding: '0.5rem 0.75rem',
                                borderRadius: '0.375rem',
                                border: '1px solid #d1d5db',
                                backgroundColor: 'white',
                                cursor: page === 1 ? 'not-allowed' : 'pointer',
                                opacity: page === 1 ? 0.5 : 1,
                                fontSize: '0.875rem',
                            }}
                        >
                            First
                        </button>
                        <button
                            onClick={() => setPage(Math.max(1, page - 1))}
                            disabled={page === 1}
                            style={{
                                padding: '0.5rem 0.75rem',
                                borderRadius: '0.375rem',
                                border: '1px solid #d1d5db',
                                backgroundColor: 'white',
                                cursor: page === 1 ? 'not-allowed' : 'pointer',
                                opacity: page === 1 ? 0.5 : 1,
                                fontSize: '0.875rem',
                            }}
                        >
                            Previous
                        </button>
                        <button
                            onClick={() =>
                                setPage(Math.min(totalPages, page + 1))
                            }
                            disabled={page === totalPages}
                            style={{
                                padding: '0.5rem 0.75rem',
                                borderRadius: '0.375rem',
                                border: '1px solid #d1d5db',
                                backgroundColor: 'white',
                                cursor:
                                    page === totalPages
                                        ? 'not-allowed'
                                        : 'pointer',
                                opacity: page === totalPages ? 0.5 : 1,
                                fontSize: '0.875rem',
                            }}
                        >
                            Next
                        </button>
                        <button
                            onClick={() => setPage(totalPages)}
                            disabled={page === totalPages}
                            style={{
                                padding: '0.5rem 0.75rem',
                                borderRadius: '0.375rem',
                                border: '1px solid #d1d5db',
                                backgroundColor: 'white',
                                cursor:
                                    page === totalPages
                                        ? 'not-allowed'
                                        : 'pointer',
                                opacity: page === totalPages ? 0.5 : 1,
                                fontSize: '0.875rem',
                            }}
                        >
                            Last
                        </button>
                    </div>
                </div>
            )}

            {/* Detail Modal */}
            {selectedLog && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '1rem',
                        zIndex: 50,
                    }}
                    onClick={() => setSelectedLog(null)}
                >
                    <div
                        style={{
                            backgroundColor: 'white',
                            borderRadius: '0.5rem',
                            maxWidth: '48rem',
                            width: '100%',
                            maxHeight: '80vh',
                            overflow: 'auto',
                            padding: '1.5rem',
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'flex-start',
                                marginBottom: '1rem',
                            }}
                        >
                            <h2
                                style={{
                                    fontSize: '1.125rem',
                                    fontWeight: 600,
                                    margin: 0,
                                }}
                            >
                                Log Details
                            </h2>
                            <button
                                onClick={() => setSelectedLog(null)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    fontSize: '1.5rem',
                                    cursor: 'pointer',
                                    color: '#6b7280',
                                    lineHeight: 1,
                                }}
                            >
                                ×
                            </button>
                        </div>

                        <dl style={{ display: 'grid', gap: '1rem' }}>
                            <div>
                                <dt
                                    style={{
                                        fontSize: '0.875rem',
                                        fontWeight: 500,
                                        color: '#6b7280',
                                        marginBottom: '0.25rem',
                                    }}
                                >
                                    Level
                                </dt>
                                <dd style={{ margin: 0 }}>
                                    <span
                                        style={{
                                            ...getLevelStyle(selectedLog.level),
                                            padding: '0.25rem 0.5rem',
                                            borderRadius: '0.25rem',
                                            fontSize: '0.75rem',
                                            fontWeight: 500,
                                            textTransform: 'uppercase',
                                        }}
                                    >
                                        {selectedLog.level}
                                    </span>
                                </dd>
                            </div>

                            <div>
                                <dt
                                    style={{
                                        fontSize: '0.875rem',
                                        fontWeight: 500,
                                        color: '#6b7280',
                                        marginBottom: '0.25rem',
                                    }}
                                >
                                    Message
                                </dt>
                                <dd style={{ margin: 0, fontSize: '0.875rem' }}>
                                    {selectedLog.message}
                                </dd>
                            </div>

                            {selectedLog.stack && (
                                <div>
                                    <dt
                                        style={{
                                            fontSize: '0.875rem',
                                            fontWeight: 500,
                                            color: '#6b7280',
                                            marginBottom: '0.25rem',
                                        }}
                                    >
                                        Stack Trace
                                    </dt>
                                    <dd style={{ margin: 0 }}>
                                        <pre
                                            style={{
                                                fontSize: '0.75rem',
                                                fontFamily: 'monospace',
                                                backgroundColor: '#f3f4f6',
                                                padding: '0.75rem',
                                                borderRadius: '0.375rem',
                                                overflow: 'auto',
                                                maxHeight: '200px',
                                                margin: 0,
                                                whiteSpace: 'pre-wrap',
                                                wordBreak: 'break-all',
                                            }}
                                        >
                                            {selectedLog.stack}
                                        </pre>
                                    </dd>
                                </div>
                            )}

                            <div
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(2, 1fr)',
                                    gap: '1rem',
                                }}
                            >
                                <div>
                                    <dt
                                        style={{
                                            fontSize: '0.875rem',
                                            fontWeight: 500,
                                            color: '#6b7280',
                                            marginBottom: '0.25rem',
                                        }}
                                    >
                                        User
                                    </dt>
                                    <dd
                                        style={{
                                            margin: 0,
                                            fontSize: '0.875rem',
                                        }}
                                    >
                                        {selectedLog.userEmail ||
                                            selectedLog.userName ||
                                            selectedLog.userId ||
                                            '-'}
                                    </dd>
                                </div>

                                <div>
                                    <dt
                                        style={{
                                            fontSize: '0.875rem',
                                            fontWeight: 500,
                                            color: '#6b7280',
                                            marginBottom: '0.25rem',
                                        }}
                                    >
                                        User ID
                                    </dt>
                                    <dd
                                        style={{
                                            margin: 0,
                                            fontSize: '0.875rem',
                                        }}
                                    >
                                        {selectedLog.userId || '-'}
                                    </dd>
                                </div>

                                <div>
                                    <dt
                                        style={{
                                            fontSize: '0.875rem',
                                            fontWeight: 500,
                                            color: '#6b7280',
                                            marginBottom: '0.25rem',
                                        }}
                                    >
                                        Path
                                    </dt>
                                    <dd
                                        style={{
                                            margin: 0,
                                            fontSize: '0.875rem',
                                        }}
                                    >
                                        {selectedLog.path || '-'}
                                    </dd>
                                </div>

                                <div>
                                    <dt
                                        style={{
                                            fontSize: '0.875rem',
                                            fontWeight: 500,
                                            color: '#6b7280',
                                            marginBottom: '0.25rem',
                                        }}
                                    >
                                        Method
                                    </dt>
                                    <dd
                                        style={{
                                            margin: 0,
                                            fontSize: '0.875rem',
                                        }}
                                    >
                                        {selectedLog.method || '-'}
                                    </dd>
                                </div>

                                <div>
                                    <dt
                                        style={{
                                            fontSize: '0.875rem',
                                            fontWeight: 500,
                                            color: '#6b7280',
                                            marginBottom: '0.25rem',
                                        }}
                                    >
                                        IP Address
                                    </dt>
                                    <dd
                                        style={{
                                            margin: 0,
                                            fontSize: '0.875rem',
                                        }}
                                    >
                                        {selectedLog.ip || '-'}
                                    </dd>
                                </div>

                                <div>
                                    <dt
                                        style={{
                                            fontSize: '0.875rem',
                                            fontWeight: 500,
                                            color: '#6b7280',
                                            marginBottom: '0.25rem',
                                        }}
                                    >
                                        Time
                                    </dt>
                                    <dd
                                        style={{
                                            margin: 0,
                                            fontSize: '0.875rem',
                                        }}
                                    >
                                        {new Date(
                                            selectedLog.createdAt,
                                        ).toLocaleString()}
                                    </dd>
                                </div>
                            </div>

                            {selectedLog.userAgent && (
                                <div>
                                    <dt
                                        style={{
                                            fontSize: '0.875rem',
                                            fontWeight: 500,
                                            color: '#6b7280',
                                            marginBottom: '0.25rem',
                                        }}
                                    >
                                        User Agent
                                    </dt>
                                    <dd
                                        style={{
                                            margin: 0,
                                            fontSize: '0.75rem',
                                            color: '#6b7280',
                                            wordBreak: 'break-all',
                                        }}
                                    >
                                        {selectedLog.userAgent}
                                    </dd>
                                </div>
                            )}

                            {selectedLog.metadata &&
                                Object.keys(selectedLog.metadata).length >
                                    0 && (
                                    <div>
                                        <dt
                                            style={{
                                                fontSize: '0.875rem',
                                                fontWeight: 500,
                                                color: '#6b7280',
                                                marginBottom: '0.25rem',
                                            }}
                                        >
                                            Metadata
                                        </dt>
                                        <dd style={{ margin: 0 }}>
                                            <pre
                                                style={{
                                                    fontSize: '0.75rem',
                                                    fontFamily: 'monospace',
                                                    backgroundColor: '#f3f4f6',
                                                    padding: '0.75rem',
                                                    borderRadius: '0.375rem',
                                                    overflow: 'auto',
                                                    maxHeight: '150px',
                                                    margin: 0,
                                                }}
                                            >
                                                {JSON.stringify(
                                                    selectedLog.metadata,
                                                    null,
                                                    2,
                                                )}
                                            </pre>
                                        </dd>
                                    </div>
                                )}
                        </dl>

                        {showDelete && (
                            <div
                                style={{
                                    marginTop: '1.5rem',
                                    textAlign: 'right',
                                }}
                            >
                                <button
                                    onClick={() => {
                                        handleDelete(selectedLog.id)
                                    }}
                                    disabled={deleting}
                                    style={{
                                        padding: '0.5rem 1rem',
                                        borderRadius: '0.375rem',
                                        backgroundColor: '#ef4444',
                                        color: 'white',
                                        border: 'none',
                                        cursor: deleting
                                            ? 'not-allowed'
                                            : 'pointer',
                                        opacity: deleting ? 0.7 : 1,
                                        fontSize: '0.875rem',
                                    }}
                                >
                                    Delete This Log
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
