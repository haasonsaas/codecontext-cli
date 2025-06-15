import fs from 'fs-extra';
import path from 'path';
import ignore from 'ignore';
import { CodeContextConfig, DirectoryAnalysis, FileAnalysis, Dependency } from '../types';
import { getFileInfo, getDirectoryPurpose } from '../utils/fileUtils';
import { generateDocumentation } from './documentationGenerator';
import { parseSourceFile, ParsedFile } from './codeParser';
import { getRecentCommits } from './git';
import { AIAnalyzer } from './aiAnalyzer';

export async function analyzeProject(projectPath: string, config: CodeContextConfig): Promise<void> {
  const ig = ignore().add(config.ignorePatterns);
  const directories = await getDirectories(projectPath, ig);
  
  for (const dir of directories) {
    await analyzeDirectory(dir, config);
  }
}

export async function analyzeDirectory(dirPath: string, config: CodeContextConfig): Promise<DirectoryAnalysis> {
  const files = await fs.readdir(dirPath);
  const ig = ignore().add(config.ignorePatterns);
  
  const filteredFiles = files
    .filter(file => !ig.ignores(file))
    .filter(file => !file.startsWith('.'));
  
  const fileAnalyses: FileAnalysis[] = [];
  const allDependencies: Dependency[] = [];
  const parsedFiles = new Map<string, ParsedFile>();
  
  // Initialize AI analyzer if needed
  const aiAnalyzer = config.mode !== 'quick' ? new AIAnalyzer() : null;
  
  // Analyze each file
  for (const file of filteredFiles) {
    const filePath = path.join(dirPath, file);
    const stat = await fs.stat(filePath);
    
    if (stat.isFile()) {
      const fileInfo = await getFileInfo(filePath);
      
      // Parse source files for deeper analysis
      const parsed = await parseSourceFile(filePath);
      if (parsed) {
        parsedFiles.set(filePath, parsed);
        
        // Use AI for description in smart/deep mode
        if (aiAnalyzer && aiAnalyzer.isAvailable() && config.mode !== 'quick') {
          try {
            const content = await fs.readFile(filePath, 'utf-8');
            fileInfo.description = await aiAnalyzer.analyzeCodeQuality(filePath, content, parsed);
          } catch {
            fileInfo.description = parsed.mainPurpose || fileInfo.description;
          }
        } else {
          fileInfo.description = parsed.mainPurpose || fileInfo.description;
        }
        
        if (parsed.functions.length > 0) {
          fileInfo.primaryFunctions = parsed.functions
            .filter(f => f.isExported)
            .map(f => `${f.name}(${f.params.join(', ')})`)
            .slice(0, 3);
        }
        
        // Extract dependencies
        parsed.imports.forEach(imp => {
          allDependencies.push({
            name: imp.specifiers.join(', ') || imp.source,
            type: 'import',
            from: imp.source,
            to: filePath
          });
        });
        
        parsed.exports.forEach(exp => {
          allDependencies.push({
            name: exp.name,
            type: 'export',
            from: filePath,
            to: 'external'
          });
        });
      }
      
      fileAnalyses.push(fileInfo);
    }
  }
  
  // Get recent changes from git
  const recentChanges = [];
  try {
    // Find the git root (go up until we find .git directory)
    let gitRoot = dirPath;
    while (gitRoot !== path.dirname(gitRoot)) {
      if (await fs.pathExists(path.join(gitRoot, '.git'))) {
        break;
      }
      gitRoot = path.dirname(gitRoot);
    }
    
    if (await fs.pathExists(path.join(gitRoot, '.git'))) {
      const commits = await getRecentCommits(gitRoot, 5);
      for (const commit of commits) {
        recentChanges.push({
          commit: commit.hash.substring(0, 7),
          date: new Date(commit.date),
          description: commit.message,
          impact: 'Code changes',
          files: []
        });
      }
    }
  } catch (error) {
    // Git might not be available
  }
  
  let purpose = await getDirectoryPurpose(dirPath, fileAnalyses);
  let architecture = generateArchitectureInsights(fileAnalyses, allDependencies);
  let improvements = generateImprovements(fileAnalyses, allDependencies);
  
  // Use AI for deeper insights if available and not in quick mode
  if (aiAnalyzer && aiAnalyzer.isAvailable() && config.mode !== 'quick') {
    try {
      const aiInsights = await aiAnalyzer.analyzeDirectory(
        dirPath,
        fileAnalyses,
        parsedFiles,
        config.mode as 'smart' | 'deep'
      );
      
      purpose = aiInsights.purpose || purpose;
      architecture = aiInsights.architecture || architecture;
      improvements = aiInsights.improvements.length > 0 ? aiInsights.improvements : improvements;
    } catch (error) {
      console.error('AI analysis failed, using basic analysis:', error);
    }
  }
  
  const analysis: DirectoryAnalysis = {
    path: dirPath,
    purpose,
    architecture,
    keyFiles: fileAnalyses.sort((a, b) => b.importance - a.importance).slice(0, 10),
    recentChanges,
    improvements,
    dependencies: allDependencies
  };
  
  const documentation = await generateDocumentation(analysis, config);
  const claudeMdPath = path.join(dirPath, 'claude.md');
  await fs.writeFile(claudeMdPath, documentation);
  
  return analysis;
}

function generateArchitectureInsights(files: FileAnalysis[], dependencies: Dependency[]): string {
  const insights: string[] = [];
  
  // Analyze file types
  const fileTypes = files.reduce((acc, file) => {
    const ext = path.extname(file.path);
    acc[ext] = (acc[ext] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const mainType = Object.entries(fileTypes)
    .sort(([, a], [, b]) => b - a)[0];
  
  if (mainType) {
    insights.push(`Primarily ${mainType[0]} files (${mainType[1]} files)`);
  }
  
  // Analyze dependencies
  const externalDeps = dependencies
    .filter(d => d.type === 'import' && !d.from.startsWith('.'))
    .map(d => d.from)
    .filter((v, i, a) => a.indexOf(v) === i);
  
  if (externalDeps.length > 0) {
    insights.push(`Uses ${externalDeps.slice(0, 3).join(', ')}${externalDeps.length > 3 ? ' and others' : ''}`);
  }
  
  // Check for patterns
  const hasTests = files.some(f => f.path.includes('.test.') || f.path.includes('.spec.'));
  if (hasTests) {
    insights.push('Includes test files');
  }
  
  const hasTypes = files.some(f => f.path.includes('.d.ts') || path.basename(f.path).includes('types'));
  if (hasTypes) {
    insights.push('Has TypeScript type definitions');
  }
  
  return insights.join('. ') || 'Standard module structure';
}

function generateImprovements(files: FileAnalysis[], _dependencies: Dependency[]): string[] {
  const improvements: string[] = [];
  
  // Check for missing tests
  const hasTests = files.some(f => f.path.includes('.test.') || f.path.includes('.spec.'));
  const hasCode = files.some(f => ['.ts', '.tsx', '.js', '.jsx'].includes(path.extname(f.path)));
  
  if (hasCode && !hasTests) {
    improvements.push('Consider adding unit tests');
  }
  
  // Check for missing documentation
  const hasReadme = files.some(f => path.basename(f.path).toLowerCase() === 'readme.md');
  if (!hasReadme && files.length > 5) {
    improvements.push('Add README.md for better documentation');
  }
  
  // Check for missing type definitions
  const hasJS = files.some(f => ['.js', '.jsx'].includes(path.extname(f.path)));
  const hasTypes = files.some(f => f.path.includes('.d.ts'));
  
  if (hasJS && !hasTypes) {
    improvements.push('Consider adding TypeScript or type definitions');
  }
  
  return improvements;
}

async function getDirectories(projectPath: string, ig: any): Promise<string[]> {
  const directories = new Set<string>();
  
  async function traverse(dir: string, rootPath: string) {
    directories.add(dir);
    
    try {
      const items = await fs.readdir(dir);
      
      for (const item of items) {
        if (item.startsWith('.')) continue;
        
        const fullPath = path.join(dir, item);
        
        // Check if the path relative to project root is ignored
        const relativePath = path.relative(rootPath, fullPath);
        if (ig.ignores(relativePath)) continue;
        
        const stat = await fs.stat(fullPath);
        
        if (stat.isDirectory()) {
          await traverse(fullPath, rootPath);
        }
      }
    } catch (error) {
      // Skip directories we can't read
    }
  }
  
  await traverse(projectPath, projectPath);
  return Array.from(directories);
}