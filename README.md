# CodeContext CLI

Automatically generate and maintain AI-optimized documentation across your entire codebase, eliminating manual context preparation for AI coding sessions.

## Overview

CodeContext transforms 15-30 minutes of manual file copying and context preparation into 5 seconds of automated, intelligent documentation that stays current. It creates and maintains `claude.md` files throughout your codebase, providing AI assistants with comprehensive context for better code suggestions and assistance.

## Features

- **Automated Documentation Generation**: Recursively scans your project and creates contextual documentation
- **Intelligent Analysis**: Uses AI to generate meaningful descriptions rather than template-based docs
- **Living Documentation**: Auto-updates when code changes, ensuring documentation never goes stale
- **Git Integration**: Automatic updates triggered by commits
- **Multiple Analysis Modes**: Quick (static), Smart (AI-enhanced), or Deep (comprehensive) analysis
- **AI-Optimized Output**: Documentation specifically formatted for Claude and other AI coding assistants

## Installation

```bash
npm install -g codecontext
```

## Quick Start

1. Initialize CodeContext in your project:
```bash
codecontext init
```

2. Generate context for your current directory:
```bash
codecontext context --current-dir
```

3. Refresh documentation after changes:
```bash
codecontext refresh
```

## Commands

### `codecontext init`
Initialize CodeContext in your project. This command:
- Creates a `.codecontext.json` configuration file
- Installs git hooks for automatic updates
- Generates initial documentation for all directories

Options:
- `-m, --mode <mode>`: Analysis mode: quick, smart, or deep (default: smart)
- `-f, --force`: Force re-initialization

### `codecontext refresh`
Update documentation for changed files or specific paths.

Options:
- `-p, --path <path>`: Refresh a specific path
- `-a, --all`: Force refresh all documentation
- `-m, --mode <mode>`: Analysis mode for this refresh

### `codecontext context`
Generate optimized context for AI coding sessions.

Options:
- `-d, --current-dir`: Generate context for current directory only
- `-s, --project-summary`: Generate project-wide summary
- `-o, --output <file>`: Save context to a file

## Configuration

CodeContext creates a `.codecontext.json` file in your project root:

```json
{
  "version": "1.0.0",
  "mode": "smart",
  "ignorePatterns": [
    "node_modules/**",
    "dist/**",
    "build/**",
    "*.log"
  ],
  "analysisFocus": ["architecture", "dependencies", "recent-changes"],
  "outputFormat": "markdown",
  "integrations": {
    "git": true,
    "claude": true
  }
}
```

## Generated Documentation

Each directory gets a `claude.md` file containing:
- **Directory Purpose**: What this part of the codebase does
- **Architecture Insights**: Patterns, data flow, and relationships
- **Key Files**: Importance-ranked file descriptions
- **Recent Changes**: Git-integrated change summaries
- **Improvement Suggestions**: AI-identified opportunities
- **Dependency Mapping**: Import/export relationships

## Analysis Modes

- **Quick Mode**: Static analysis only, no AI calls (fastest)
- **Smart Mode**: AI analysis for important files and changes (recommended)
- **Deep Mode**: Comprehensive AI analysis with architectural insights (most thorough)

## Integration

CodeContext integrates seamlessly with your development workflow:
- Git hooks automatically update documentation on commits
- Compatible with all major AI coding assistants
- Works with any programming language
- Supports monorepos and multi-project setups

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT