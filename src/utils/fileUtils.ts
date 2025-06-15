import fs from 'fs-extra';
import path from 'path';
import { FileAnalysis } from '../types';

export async function getFileInfo(filePath: string): Promise<FileAnalysis> {
  const stats = await fs.stat(filePath);
  const ext = path.extname(filePath);
  const fileName = path.basename(filePath);
  
  return {
    path: filePath,
    description: getFileDescription(fileName, ext),
    importance: calculateImportance(fileName, ext),
    primaryFunctions: getPrimaryFunctions(fileName, ext),
    lastModified: stats.mtime
  };
}

export async function getDirectoryPurpose(dirPath: string, _analyzedFiles?: FileAnalysis[]): Promise<string> {
  const dirName = path.basename(dirPath);
  const files = await fs.readdir(dirPath);
  
  const purposes: { [key: string]: string } = {
    'src': 'Source code directory containing the main application logic',
    'components': 'React/Vue/Angular components for the user interface',
    'utils': 'Utility functions and helper modules',
    'services': 'Service layer for business logic and external integrations',
    'models': 'Data models and database schemas',
    'controllers': 'Request handlers and route controllers',
    'views': 'View templates and UI layouts',
    'tests': 'Test files and test utilities',
    'config': 'Configuration files and environment settings',
    'scripts': 'Build scripts and automation tools',
    'docs': 'Documentation files and guides',
    'public': 'Static assets served directly to users',
    'assets': 'Images, fonts, and other media files',
    'styles': 'CSS, SCSS, or other styling files',
    'api': 'API endpoints and route definitions',
    'lib': 'Third-party libraries or custom library code',
    'types': 'TypeScript type definitions',
    'interfaces': 'Interface definitions',
    'constants': 'Application constants and configuration values',
    'middleware': 'Express/Koa middleware functions',
    'hooks': 'React hooks or other framework hooks',
    'store': 'State management (Redux, Vuex, etc.)',
    'actions': 'Redux/Flux actions',
    'reducers': 'Redux reducers',
    'mutations': 'Vuex mutations',
    'queries': 'Database queries or GraphQL queries',
    'migrations': 'Database migration files',
    'seeds': 'Database seed files'
  };
  
  if (purposes[dirName]) {
    return purposes[dirName];
  }
  
  const fileTypes = files.map(f => path.extname(f)).filter(Boolean);
  const uniqueTypes = [...new Set(fileTypes)];
  
  if (uniqueTypes.includes('.tsx') || uniqueTypes.includes('.jsx')) {
    return 'Contains React components and UI elements';
  }
  
  if (uniqueTypes.includes('.vue')) {
    return 'Contains Vue.js components';
  }
  
  if (uniqueTypes.includes('.py')) {
    return 'Python modules and scripts';
  }
  
  if (uniqueTypes.includes('.go')) {
    return 'Go language source files';
  }
  
  return `Contains ${files.length} files related to ${dirName}`;
}

function getFileDescription(fileName: string, ext: string): string {
  const commonFiles: { [key: string]: string } = {
    'package.json': 'Node.js project manifest with dependencies and scripts',
    'tsconfig.json': 'TypeScript compiler configuration',
    'webpack.config.js': 'Webpack bundler configuration',
    'babel.config.js': 'Babel transpiler configuration',
    '.eslintrc.json': 'ESLint linting rules',
    '.gitignore': 'Git ignore patterns',
    'README.md': 'Project documentation and setup instructions',
    'Dockerfile': 'Docker container configuration',
    'docker-compose.yml': 'Docker Compose service definitions',
    '.env': 'Environment variables (should be git-ignored)',
    'Makefile': 'Build automation commands',
    'requirements.txt': 'Python project dependencies',
    'go.mod': 'Go module definition',
    'Cargo.toml': 'Rust project manifest',
    'pom.xml': 'Maven project configuration',
    'build.gradle': 'Gradle build configuration'
  };
  
  if (commonFiles[fileName]) {
    return commonFiles[fileName];
  }
  
  const extensions: { [key: string]: string } = {
    '.ts': 'TypeScript source file',
    '.tsx': 'TypeScript React component',
    '.js': 'JavaScript source file',
    '.jsx': 'JavaScript React component',
    '.py': 'Python source file',
    '.go': 'Go source file',
    '.java': 'Java source file',
    '.cpp': 'C++ source file',
    '.c': 'C source file',
    '.rs': 'Rust source file',
    '.vue': 'Vue.js component',
    '.svelte': 'Svelte component',
    '.css': 'Stylesheet',
    '.scss': 'SASS stylesheet',
    '.html': 'HTML template',
    '.json': 'JSON data file',
    '.yml': 'YAML configuration file',
    '.yaml': 'YAML configuration file',
    '.xml': 'XML data file',
    '.sql': 'SQL database script',
    '.sh': 'Shell script',
    '.md': 'Markdown documentation',
    '.test.ts': 'TypeScript test file',
    '.test.js': 'JavaScript test file',
    '.spec.ts': 'TypeScript test specification',
    '.spec.js': 'JavaScript test specification'
  };
  
  for (const [key, value] of Object.entries(extensions)) {
    if (fileName.endsWith(key)) {
      return value;
    }
  }
  
  return `${ext.slice(1).toUpperCase()} file`;
}

function calculateImportance(fileName: string, ext: string): number {
  const importantFiles = [
    'index', 'main', 'app', 'server', 'client',
    'package.json', 'tsconfig.json', 'webpack.config',
    'Dockerfile', 'docker-compose', '.env',
    'README', 'config', 'setup', 'install'
  ];
  
  for (const important of importantFiles) {
    if (fileName.toLowerCase().includes(important)) {
      return 10;
    }
  }
  
  if (fileName.includes('.test.') || fileName.includes('.spec.')) {
    return 3;
  }
  
  if (ext === '.ts' || ext === '.tsx' || ext === '.js' || ext === '.jsx') {
    return 7;
  }
  
  return 5;
}

function getPrimaryFunctions(fileName: string, ext: string): string[] {
  const baseName = path.basename(fileName, ext).toLowerCase();
  
  const functionMap: { [key: string]: string[] } = {
    'index': ['Entry point', 'Module exports'],
    'app': ['Application initialization', 'Main app component'],
    'server': ['Server setup', 'API endpoints'],
    'client': ['Client-side entry', 'Browser initialization'],
    'config': ['Configuration management', 'Environment setup'],
    'router': ['Route definitions', 'Navigation setup'],
    'middleware': ['Request processing', 'Authentication/Authorization'],
    'controller': ['Request handling', 'Business logic coordination'],
    'service': ['Business logic', 'External integrations'],
    'model': ['Data structure', 'Database schema'],
    'utils': ['Helper functions', 'Common utilities'],
    'constants': ['Shared constants', 'Configuration values'],
    'types': ['Type definitions', 'Interfaces'],
    'hooks': ['Custom React hooks', 'State management'],
    'store': ['State management', 'Data persistence'],
    'api': ['API client', 'HTTP requests'],
    'auth': ['Authentication', 'User management'],
    'database': ['Database connection', 'Query execution'],
    'logger': ['Logging functionality', 'Error tracking'],
    'validator': ['Input validation', 'Data sanitization'],
    'parser': ['Data parsing', 'Format conversion'],
    'formatter': ['Data formatting', 'Output preparation']
  };
  
  for (const [key, functions] of Object.entries(functionMap)) {
    if (baseName.includes(key)) {
      return functions;
    }
  }
  
  if (fileName.includes('.test.') || fileName.includes('.spec.')) {
    return ['Unit tests', 'Test cases'];
  }
  
  return ['General functionality'];
}