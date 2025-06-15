import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs-extra';
import path from 'path';
import { analyzeDirectory } from '../services/analyzer';
import { getChangedFiles } from '../services/git';
import { CodeContextConfig } from '../types';

export async function refreshCommand(options: any) {
  const spinner = ora('Refreshing documentation...').start();
  
  try {
    const projectRoot = process.cwd();
    const configPath = path.join(projectRoot, '.codecontext.json');
    
    if (!await fs.pathExists(configPath)) {
      spinner.fail(chalk.red('CodeContext not initialized. Run "codecontext init" first.'));
      return;
    }
    
    const config: CodeContextConfig = await fs.readJson(configPath);
    
    if (options.all) {
      spinner.text = 'Refreshing all documentation...';
      await analyzeDirectory(projectRoot, config);
    } else if (options.path) {
      const targetPath = path.resolve(projectRoot, options.path);
      spinner.text = `Refreshing documentation for ${options.path}...`;
      await analyzeDirectory(targetPath, config);
    } else {
      spinner.text = 'Detecting changed files...';
      const changedFiles = await getChangedFiles(projectRoot);
      
      if (changedFiles.length === 0) {
        spinner.succeed(chalk.green('No changes detected. Documentation is up to date.'));
        return;
      }
      
      spinner.text = `Updating documentation for ${changedFiles.length} changed files...`;
      const directories = new Set(changedFiles.map(file => path.dirname(file)));
      
      for (const dir of directories) {
        await analyzeDirectory(path.join(projectRoot, dir), config);
      }
    }
    
    spinner.succeed(chalk.green('Documentation refreshed successfully!'));
    
  } catch (error) {
    spinner.fail(chalk.red('Failed to refresh documentation'));
    console.error(error);
    process.exit(1);
  }
}