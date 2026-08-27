# Per-repo fleet start config for butterchurn-mcp
# Edit ports/backend target here - start.ps1 is fleet-standard.
@{
    Name         = 'butterchurn-mcp'
    BackendPort  = 10878
    FrontendPort = 10879
    HealthPath   = '/api/health'
    WebRoot      = 'D:\Dev\repos\butterchurn-mcp\webapp'
    Backend = @{
        Kind       = 'cli-serve'
        Module     = 'butterchurn-mcp'
        SyncExtras = @('dev')
    }
    Frontend = @{
        Kind           = 'vite-npm'
        PackageManager = 'bun'
        PortEnvVar     = 'VITE_PORT'
        ApiTargetEnv   = 'VITE_API_TARGET'
    }
}
