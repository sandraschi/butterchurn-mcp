# Per-repo fleet start config for butterchurn-mcp
# Edit ports/backend target here - start.ps1 is fleet-standard.
@{
    Name         = 'butterchurn-mcp'
    BackendPort  = 10878
    FrontendPort = 10879
    HealthPath   = '/api/health'
    WebRoot      = 'webapp'
    Backend = @{
        Kind          = 'uvicorn'
        UvicornTarget = 'butterchurn_mcp.app:app'
        SyncExtras    = @('dev')
        SyncOnStart  = $true
        Env           = @{ WEB_PORT = '10878' }
    }
    Frontend = @{
        Kind           = 'vite-npm'
        PackageManager = 'npm'
        PortEnvVar     = 'VITE_PORT'
        ApiTargetEnv   = 'VITE_API_TARGET'
    }
}
