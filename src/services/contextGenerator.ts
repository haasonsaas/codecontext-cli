import fs from 'fs-extra';
import path from 'path';
import { glob } from 'glob';
import { CodeContextConfig } from '../types';

export async function generateContext(
  targetPath: string,
  config: CodeContextConfig,
  type: 'directory' | 'project' | 'standard'
): Promise<string> {
  let context = '';
  
  switch (type) {
    case 'directory':
      context = await generateDirectoryContext(targetPath);
      break;
    case 'project':
      context = await generateProjectContext(targetPath);
      break;
    case 'standard':
    default:
      context = await generateStandardContext(targetPath);
  }
  
  return context;
}

async function generateDirectoryContext(dirPath: string): Promise<string> {
  const claudeMdPath = path.join(dirPath, 'claude.md');
  
  if (await fs.pathExists(claudeMdPath)) {
    const content = await fs.readFile(claudeMdPath, 'utf-8');
    return `# Context for ${path.basename(dirPath)}

${content}

## File Structure
${await getFileStructure(dirPath, 2)}
`;
  }
  
  return `# Context for ${path.basename(dirPath)}

No claude.md documentation found. Run 'codecontext refresh' to generate documentation.

## File Structure
${await getFileStructure(dirPath, 2)}
`;
}

async function generateProjectContext(projectPath: string): Promise<string> {
  const claudeFiles = await glob('**/claude.md', {
    cwd: projectPath,
    ignore: ['node_modules/**', 'dist/**', 'build/**']
  });
  
  let context = `# Project-Wide Context

## Project Structure
${await getFileStructure(projectPath, 1)}

## Directory Summaries
`;
  
  for (const file of claudeFiles.slice(0, 10)) {
    const content = await fs.readFile(path.join(projectPath, file), 'utf-8');
    const dirName = path.dirname(file);
    context += `
### ${dirName}
${content.split('\n').slice(0, 10).join('\n')}
...

`;
  }
  
  return context;
}

async function generateStandardContext(targetPath: string): Promise<string> {
  const parentDir = path.dirname(targetPath);
  const currentDir = path.basename(targetPath);
  
  let context = `# Working Context

## Current Directory: ${currentDir}
`;
  
  const currentClaudeMd = path.join(targetPath, 'claude.md');
  if (await fs.pathExists(currentClaudeMd)) {
    context += await fs.readFile(currentClaudeMd, 'utf-8');
  }
  
  context += `
## Parent Directory Context
`;
  
  const parentClaudeMd = path.join(parentDir, 'claude.md');
  if (await fs.pathExists(parentClaudeMd)) {
    const parentContent = await fs.readFile(parentClaudeMd, 'utf-8');
    context += parentContent.split('\n').slice(0, 20).join('\n') + '\n...';
  }
  
  return context;
}

async function getFileStructure(dirPath: string, maxDepth: number): Promise<string> {
  const tree: string[] = [];
  
  async function traverse(currentPath: string, depth: number, prefix: string = '') {
    if (depth > maxDepth) return;
    
    const items = await fs.readdir(currentPath);
    const filtered = items.filter(item => !item.startsWith('.') && item !== 'node_modules');
    
    for (let i = 0; i < filtered.length; i++) {
      const item = filtered[i];
      const itemPath = path.join(currentPath, item);
      const isLast = i === filtered.length - 1;
      const stats = await fs.stat(itemPath);
      
      const connector = isLast ? '└── ' : '├── ';
      tree.push(prefix + connector + item);
      
      if (stats.isDirectory() && depth < maxDepth) {
        const extension = isLast ? '    ' : '│   ';
        await traverse(itemPath, depth + 1, prefix + extension);
      }
    }
  }
  
  await traverse(dirPath, 1);
  return tree.join('\n');
}