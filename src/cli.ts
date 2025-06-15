#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { initCommand } from './commands/init';
import { refreshCommand } from './commands/refresh';
import { contextCommand } from './commands/context';

const program = new Command();

program
  .name('codecontext')
  .description('Automatically generate and maintain AI-optimized documentation across your entire codebase')
  .version('0.1.0');

program
  .command('init')
  .description('Initialize CodeContext in your project')
  .option('-m, --mode <mode>', 'Analysis mode: quick, smart, or deep', 'smart')
  .option('-f, --force', 'Force re-initialization even if already initialized')
  .action(initCommand);

program
  .command('refresh')
  .description('Refresh documentation for changed files')
  .option('-p, --path <path>', 'Specific path to refresh')
  .option('-a, --all', 'Force refresh all documentation')
  .option('-m, --mode <mode>', 'Analysis mode: quick, smart, or deep', 'smart')
  .action(refreshCommand);

program
  .command('context')
  .description('Generate optimized context for AI coding sessions')
  .option('-d, --current-dir', 'Generate context for current directory only')
  .option('-s, --project-summary', 'Generate project-wide summary')
  .option('-o, --output <file>', 'Output to file instead of stdout')
  .action(contextCommand);

program.parse(process.argv);

if (!process.argv.slice(2).length) {
  program.outputHelp();
}