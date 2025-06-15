import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs-extra';
import path from 'path';
import { analyzeProject } from '../services/analyzer';
import { installGitHooks } from '../services/git';
import { CodeContextConfig } from '../types';

export async function initCommand(options: any) {
  const spinner = ora('Initializing CodeContext...').start();
  
  try {
    const projectRoot = process.cwd();
    const configPath = path.join(projectRoot, '.codecontext.json');
    
    if (await fs.pathExists(configPath) && !options.force) {
      spinner.fail(chalk.yellow('CodeContext already initialized. Use --force to reinitialize.'));
      return;
    }
    
    const config: CodeContextConfig = {
      version: '1.0.0',
      mode: options.mode || 'smart',
      ignorePatterns: [
        'node_modules/**',
        'dist/**',
        'build/**',
        '*.log',
        '.git/**',
        'coverage/**'
      ],
      analysisFocus: ['architecture', 'dependencies', 'recent-changes'],
      outputFormat: 'markdown',
      integrations: {
        git: true,
        claude: true
      }
    };
    
    await fs.writeJson(configPath, config, { spaces: 2 });
    spinner.text = 'Configuration created...';
    
    spinner.text = 'Installing git hooks...';
    await installGitHooks(projectRoot);
    
    spinner.text = 'Analyzing project structure...';
    await analyzeProject(projectRoot, config);
    
    spinner.succeed(chalk.green('CodeContext initialized successfully!'));
    console.log(chalk.cyan('\nNext steps:'));
    console.log('  - Run ' + chalk.bold('codecontext refresh') + ' to update documentation');
    console.log('  - Run ' + chalk.bold('codecontext context') + ' to generate AI context');
    
  } catch (error) {
    spinner.fail(chalk.red('Failed to initialize CodeContext'));
    console.error(error);
    process.exit(1);
  }
}