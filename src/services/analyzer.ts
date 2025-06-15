import fs from 'fs-extra';
import path from 'path';
import { glob } from 'glob';
import ignore from 'ignore';
import { CodeContextConfig, DirectoryAnalysis } from '../types';
import { getFileInfo, getDirectoryPurpose } from '../utils/fileUtils';
import { generateDocumentation } from './documentationGenerator';

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
  
  const fileAnalyses = await Promise.all(
    filteredFiles.map(async file => {
      const filePath = path.join(dirPath, file);
      const stat = await fs.stat(filePath);
      
      if (stat.isFile()) {
        return getFileInfo(filePath);
      }
      return null;
    })
  );
  
  const analysis: DirectoryAnalysis = {
    path: dirPath,
    purpose: await getDirectoryPurpose(dirPath),
    architecture: 'To be analyzed',
    keyFiles: fileAnalyses.filter(Boolean) as any[],
    recentChanges: [],
    improvements: [],
    dependencies: []
  };
  
  const documentation = await generateDocumentation(analysis, config);
  const claudeMdPath = path.join(dirPath, 'claude.md');
  await fs.writeFile(claudeMdPath, documentation);
  
  return analysis;
}

async function getDirectories(projectPath: string, ig: any): Promise<string[]> {
  const pattern = '**/*';
  const files = await glob(pattern, {
    cwd: projectPath,
    ignore: ig.patterns,
    absolute: true
  });
  
  const directories = new Set<string>();
  directories.add(projectPath);
  
  for (const file of files) {
    const dir = path.dirname(file);
    directories.add(dir);
  }
  
  return Array.from(directories);
}