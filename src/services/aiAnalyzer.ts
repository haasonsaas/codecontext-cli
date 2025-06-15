import Anthropic from '@anthropic-ai/sdk';
import { FileAnalysis, DirectoryAnalysis } from '../types';
import { ParsedFile } from './codeParser';

export class AIAnalyzer {
  private client: Anthropic | null = null;
  
  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (apiKey) {
      this.client = new Anthropic({
        apiKey: apiKey,
      });
    }
  }
  
  isAvailable(): boolean {
    return this.client !== null;
  }
  
  async analyzeDirectory(
    dirPath: string,
    files: FileAnalysis[],
    parsedFiles: Map<string, ParsedFile>,
    mode: 'smart' | 'deep'
  ): Promise<{
    purpose: string;
    architecture: string;
    improvements: string[];
  }> {
    if (!this.client) {
      throw new Error('Claude API key not configured');
    }
    
    // Prepare context for Claude
    const fileContext = files.slice(0, 10).map(file => {
      const parsed = parsedFiles.get(file.path);
      return `File: ${file.path}
Type: ${file.description}
${parsed ? `Exports: ${parsed.exports.map(e => e.name).join(', ')}
Imports: ${parsed.imports.map(i => i.source).join(', ')}` : ''}`;
    }).join('\n\n');
    
    const prompt = `Analyze this directory structure and provide insights:

Directory: ${dirPath}

Files:
${fileContext}

Please provide:
1. A concise purpose statement (1 sentence)
2. Architecture insights (2-3 sentences about patterns, structure, and design)
3. 3-5 specific improvement suggestions based on the code structure

Format your response as JSON with keys: purpose, architecture, improvements (array)`;

    try {
      const response = await this.client.messages.create({
        model: mode === 'deep' ? 'claude-3-opus-20240229' : 'claude-3-haiku-20240307',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });
      
      const content = response.content[0];
      if (content.type === 'text') {
        try {
          // Try to parse JSON response
          const parsed = JSON.parse(content.text);
          return {
            purpose: parsed.purpose || 'AI analysis unavailable',
            architecture: parsed.architecture || 'AI analysis unavailable',
            improvements: parsed.improvements || []
          };
        } catch {
          // Fallback if not valid JSON
          return {
            purpose: 'AI-powered analysis available with proper API key',
            architecture: content.text.substring(0, 200),
            improvements: []
          };
        }
      }
    } catch (error) {
      console.error('AI analysis error:', error);
    }
    
    return {
      purpose: 'AI-powered analysis available with proper API key',
      architecture: 'Standard module structure',
      improvements: []
    };
  }
  
  async analyzeCodeQuality(
    filePath: string,
    content: string,
    parsed: ParsedFile
  ): Promise<string> {
    if (!this.client || !parsed) {
      return parsed?.mainPurpose || 'File analysis';
    }
    
    const prompt = `Analyze this code file and provide a one-sentence description of its purpose:

File: ${filePath}
Functions: ${parsed.functions.map(f => f.name).join(', ')}
Classes: ${parsed.classes.map(c => c.name).join(', ')}
Imports: ${parsed.imports.slice(0, 5).map(i => i.source).join(', ')}

Code snippet (first 30 lines):
${content.split('\n').slice(0, 30).join('\n')}

Provide only a single sentence describing what this file does.`;

    try {
      const response = await this.client.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 100,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });
      
      const content = response.content[0];
      if (content.type === 'text') {
        return content.text.trim();
      }
    } catch (error) {
      // Fallback to parsed analysis
    }
    
    return parsed.mainPurpose;
  }
  
  async suggestImprovements(
    analysis: DirectoryAnalysis,
    mode: 'smart' | 'deep'
  ): Promise<string[]> {
    if (!this.client || mode === 'smart') {
      // Return basic improvements for smart mode
      return analysis.improvements;
    }
    
    // Deep mode - use AI for advanced suggestions
    const prompt = `Based on this codebase analysis, suggest 3-5 specific, actionable improvements:

Directory: ${analysis.path}
Architecture: ${analysis.architecture}
Key files: ${analysis.keyFiles.slice(0, 5).map(f => f.path).join(', ')}
Dependencies: ${analysis.dependencies.slice(0, 10).map(d => d.name).join(', ')}

Consider:
- Code organization and architecture
- Missing tests or documentation
- Potential refactoring opportunities
- Security or performance concerns

Provide specific, actionable suggestions as a JSON array of strings.`;

    try {
      const response = await this.client.messages.create({
        model: 'claude-3-opus-20240229',
        max_tokens: 500,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });
      
      const content = response.content[0];
      if (content.type === 'text') {
        try {
          const suggestions = JSON.parse(content.text);
          if (Array.isArray(suggestions)) {
            return suggestions.slice(0, 5);
          }
        } catch {
          // Parse as text lines if not JSON
          return content.text
            .split('\n')
            .filter(line => line.trim().match(/^[\d\-\*]\.?\s/))
            .map(line => line.replace(/^[\d\-\*]\.?\s+/, '').trim())
            .filter(Boolean)
            .slice(0, 5);
        }
      }
    } catch (error) {
      console.error('AI improvement suggestions error:', error);
    }
    
    return analysis.improvements;
  }
}