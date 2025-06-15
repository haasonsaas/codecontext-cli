export interface CodeContextConfig {
  version: string;
  mode: 'quick' | 'smart' | 'deep';
  ignorePatterns: string[];
  analysisFocus: string[];
  outputFormat: string;
  integrations: {
    git: boolean;
    claude: boolean;
  };
}

export interface DirectoryAnalysis {
  path: string;
  purpose: string;
  architecture: string;
  keyFiles: FileAnalysis[];
  recentChanges: Change[];
  improvements: string[];
  dependencies: Dependency[];
}

export interface FileAnalysis {
  path: string;
  description: string;
  importance: number;
  primaryFunctions: string[];
  lastModified: Date;
}

export interface Change {
  commit: string;
  date: Date;
  description: string;
  impact: string;
  files: string[];
}

export interface Dependency {
  name: string;
  type: 'import' | 'export' | 'external';
  from: string;
  to: string;
}

export interface AnalysisOptions {
  mode: 'quick' | 'smart' | 'deep';
  path?: string;
  force?: boolean;
}

export interface ContextOptions {
  currentDir?: boolean;
  projectSummary?: boolean;
  output?: string;
}