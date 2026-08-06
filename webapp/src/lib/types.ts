export interface Capabilities {
  status: string;
  server: { name: string; version: string; fastmcp: string };
  tool_surface: {
    total: number;
    portmanteau_count: number;
    atomic_count: number;
    portmanteau_tools: string[];
    atomic_tools: string[];
  };
  features: {
    sampling: boolean;
    agentic_workflows: boolean;
    prompts: boolean;
    resources: boolean;
    skills: boolean;
  };
  inventory: {
    workflow_tools: string[];
    prompt_names: string[];
    resource_uris: string[];
    skill_uris: string[];
  };
  runtime: {
    transport: string;
    surface_mode: string;
  };
  timestamp: string;
}

export interface DashboardData {
  success: boolean;
  bpm: number;
  default_bpm: number;
  uptime_seconds: number;
  version: string;
  preset_library: string;
  companion: string;
}
