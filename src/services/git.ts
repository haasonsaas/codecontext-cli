import simpleGit, { SimpleGit } from 'simple-git';
import fs from 'fs-extra';
import path from 'path';

export async function installGitHooks(projectPath: string): Promise<void> {
  const gitDir = path.join(projectPath, '.git');
  if (!await fs.pathExists(gitDir)) {
    throw new Error('Not a git repository');
  }
  
  const hooksDir = path.join(gitDir, 'hooks');
  await fs.ensureDir(hooksDir);
  
  const postCommitHook = `#!/bin/sh
# CodeContext post-commit hook
# Automatically update documentation after commits

codecontext refresh
`;
  
  const postCommitPath = path.join(hooksDir, 'post-commit');
  await fs.writeFile(postCommitPath, postCommitHook);
  await fs.chmod(postCommitPath, '755');
}

export async function getChangedFiles(projectPath: string): Promise<string[]> {
  const git: SimpleGit = simpleGit(projectPath);
  
  try {
    const status = await git.status();
    const changedFiles: string[] = [];
    
    changedFiles.push(...status.modified);
    changedFiles.push(...status.created);
    changedFiles.push(...status.renamed.map(r => r.to));
    
    return changedFiles;
  } catch (error) {
    console.error('Error getting git status:', error);
    return [];
  }
}

export async function getRecentCommits(projectPath: string, limit: number = 10): Promise<any[]> {
  const git: SimpleGit = simpleGit(projectPath);
  
  try {
    const log = await git.log({
      maxCount: limit,
      format: {
        hash: '%H',
        date: '%ai',
        message: '%s',
        author_name: '%an',
        author_email: '%ae'
      }
    });
    return [...log.all];
  } catch (error) {
    console.error('Error getting git log:', error);
    return [];
  }
}