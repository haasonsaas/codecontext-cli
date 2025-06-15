import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs-extra';
import path from 'path';
import { generateContext } from '../services/contextGenerator';
import { CodeContextConfig } from '../types';

export async function contextCommand(options: any) {
  const spinner = ora('Generating AI context...').start();
  
  try {
    const projectRoot = process.cwd();
    const configPath = path.join(projectRoot, '.codecontext.json');
    
    if (!await fs.pathExists(configPath)) {
      spinner.fail(chalk.red('CodeContext not initialized. Run "codecontext init" first.'));
      return;
    }
    
    const config: CodeContextConfig = await fs.readJson(configPath);
    let context: string;
    
    if (options.currentDir) {
      spinner.text = 'Generating context for current directory...';
      context = await generateContext(process.cwd(), config, 'directory');
    } else if (options.projectSummary) {
      spinner.text = 'Generating project-wide summary...';
      context = await generateContext(projectRoot, config, 'project');
    } else {
      spinner.text = 'Generating standard context...';
      context = await generateContext(process.cwd(), config, 'standard');
    }
    
    spinner.stop();
    
    if (options.output) {
      await fs.writeFile(options.output, context);
      console.log(chalk.green(`Context saved to ${options.output}`));
    } else {
      console.log(context);
    }
    
  } catch (error) {
    spinner.fail(chalk.red('Failed to generate context'));
    console.error(error);
    process.exit(1);
  }
}