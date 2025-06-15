import fs from 'fs-extra';
import path from 'path';

export interface ParsedFile {
  imports: ImportInfo[];
  exports: ExportInfo[];
  functions: FunctionInfo[];
  classes: ClassInfo[];
  interfaces: InterfaceInfo[];
  mainPurpose: string;
}

export interface ImportInfo {
  source: string;
  specifiers: string[];
  type: 'named' | 'default' | 'namespace';
}

export interface ExportInfo {
  name: string;
  type: 'function' | 'class' | 'interface' | 'variable' | 'type';
  isDefault: boolean;
}

export interface FunctionInfo {
  name: string;
  params: string[];
  isAsync: boolean;
  isExported: boolean;
  description?: string;
}

export interface ClassInfo {
  name: string;
  methods: string[];
  isExported: boolean;
}

export interface InterfaceInfo {
  name: string;
  properties: string[];
  isExported: boolean;
}

export async function parseSourceFile(filePath: string): Promise<ParsedFile | null> {
  const ext = path.extname(filePath);
  
  // Only parse TypeScript and JavaScript files
  if (!['.ts', '.tsx', '.js', '.jsx'].includes(ext)) {
    return null;
  }
  
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    
    const result: ParsedFile = {
      imports: [],
      exports: [],
      functions: [],
      classes: [],
      interfaces: [],
      mainPurpose: ''
    };
    
    // Simple regex-based parsing (not perfect but good enough for basic analysis)
    parseImports(content, result);
    parseExports(content, result);
    parseFunctions(content, result);
    parseClasses(content, result);
    parseInterfaces(content, result);
    
    // Determine main purpose based on content
    result.mainPurpose = determinePurpose(result, path.basename(filePath));
    
    return result;
  } catch (error) {
    console.error(`Error parsing ${filePath}:`, error);
    return null;
  }
}

function parseImports(content: string, result: ParsedFile): void {
  // Match import statements
  const importRegex = /import\s+(?:type\s+)?(?:(\*\s+as\s+\w+)|(\w+)|({[^}]+}))\s+from\s+['"]([^'"]+)['"]/g;
  const defaultImportRegex = /import\s+(\w+)\s+from\s+['"]([^'"]+)['"]/g;
  
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    const [, namespace, defaultImport, namedImports, source] = match;
    
    if (namespace) {
      result.imports.push({
        source,
        specifiers: [namespace.replace('* as ', '')],
        type: 'namespace'
      });
    } else if (defaultImport) {
      result.imports.push({
        source,
        specifiers: [defaultImport],
        type: 'default'
      });
    } else if (namedImports) {
      const names = namedImports
        .replace(/[{}]/g, '')
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
      
      result.imports.push({
        source,
        specifiers: names,
        type: 'named'
      });
    }
  }
  
  // Also check for default imports
  content.replace(defaultImportRegex, (_, name, source) => {
    if (!result.imports.some(imp => imp.source === source && imp.type === 'default')) {
      result.imports.push({
        source,
        specifiers: [name],
        type: 'default'
      });
    }
    return '';
  });
}

function parseExports(content: string, result: ParsedFile): void {
  // Match export statements
  const exportRegex = /export\s+(?:default\s+)?(?:const|let|var|function|class|interface|type)\s+(\w+)/g;
  const exportDefaultRegex = /export\s+default\s+(\w+)/g;
  
  let match;
  while ((match = exportRegex.exec(content)) !== null) {
    const [fullMatch, name] = match;
    const isDefault = fullMatch.includes('default');
    
    let type: 'function' | 'class' | 'interface' | 'variable' | 'type' = 'variable';
    if (fullMatch.includes('function')) type = 'function';
    else if (fullMatch.includes('class')) type = 'class';
    else if (fullMatch.includes('interface')) type = 'interface';
    else if (fullMatch.includes('type')) type = 'type';
    
    result.exports.push({
      name,
      type,
      isDefault
    });
  }
  
  // Check for default exports
  while ((match = exportDefaultRegex.exec(content)) !== null) {
    const [, name] = match;
    if (!result.exports.some(exp => exp.name === name && exp.isDefault)) {
      result.exports.push({
        name,
        type: 'variable',
        isDefault: true
      });
    }
  }
}

function parseFunctions(content: string, result: ParsedFile): void {
  // Match function declarations
  const functionRegex = /(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)/g;
  const arrowFunctionRegex = /(?:export\s+)?const\s+(\w+)\s*=\s*(?:async\s+)?\([^)]*\)\s*=>/g;
  
  let match;
  while ((match = functionRegex.exec(content)) !== null) {
    const [fullMatch, name, params] = match;
    
    result.functions.push({
      name,
      params: params.split(',').map(p => p.trim().split(/\s+/)[0]).filter(Boolean),
      isAsync: fullMatch.includes('async'),
      isExported: fullMatch.includes('export')
    });
  }
  
  // Also check arrow functions
  while ((match = arrowFunctionRegex.exec(content)) !== null) {
    const [fullMatch, name] = match;
    
    result.functions.push({
      name,
      params: [], // Simplified - not parsing arrow function params
      isAsync: fullMatch.includes('async'),
      isExported: fullMatch.includes('export')
    });
  }
}

function parseClasses(content: string, result: ParsedFile): void {
  // Match class declarations
  const classRegex = /(?:export\s+)?class\s+(\w+)(?:\s+extends\s+\w+)?\s*{([^}]+)}/g;
  
  let match;
  while ((match = classRegex.exec(content)) !== null) {
    const [fullMatch, name, body] = match;
    
    // Extract method names from class body
    const methodRegex = /(?:async\s+)?(\w+)\s*\([^)]*\)\s*{/g;
    const methods: string[] = [];
    let methodMatch;
    
    while ((methodMatch = methodRegex.exec(body)) !== null) {
      const [, methodName] = methodMatch;
      if (methodName !== 'constructor') {
        methods.push(methodName);
      }
    }
    
    result.classes.push({
      name,
      methods,
      isExported: fullMatch.includes('export')
    });
  }
}

function parseInterfaces(content: string, result: ParsedFile): void {
  // Match interface declarations (TypeScript only)
  const interfaceRegex = /(?:export\s+)?interface\s+(\w+)\s*(?:extends\s+[^{]+)?\s*{([^}]+)}/g;
  
  let match;
  while ((match = interfaceRegex.exec(content)) !== null) {
    const [fullMatch, name, body] = match;
    
    // Extract property names from interface body
    const propRegex = /(\w+)\s*[?:]?\s*:/g;
    const properties: string[] = [];
    let propMatch;
    
    while ((propMatch = propRegex.exec(body)) !== null) {
      const [, propName] = propMatch;
      properties.push(propName);
    }
    
    result.interfaces.push({
      name,
      properties,
      isExported: fullMatch.includes('export')
    });
  }
}

function determinePurpose(parsed: ParsedFile, fileName: string): string {
  const baseName = path.basename(fileName, path.extname(fileName)).toLowerCase();
  
  // Check for specific patterns
  if (baseName.includes('test') || baseName.includes('spec')) {
    return 'Test suite for unit testing';
  }
  
  if (baseName === 'index') {
    return 'Module entry point that exports public API';
  }
  
  if (parsed.classes.length > 0) {
    const mainClass = parsed.classes[0];
    return `Defines ${mainClass.name} class with ${mainClass.methods.length} methods`;
  }
  
  if (parsed.interfaces.length > 0) {
    return `Type definitions including ${parsed.interfaces.map(i => i.name).join(', ')}`;
  }
  
  if (parsed.functions.length > 0) {
    const exportedFuncs = parsed.functions.filter(f => f.isExported);
    if (exportedFuncs.length > 0) {
      return `Provides ${exportedFuncs.map(f => f.name).join(', ')} functionality`;
    }
  }
  
  if (parsed.imports.some(i => i.source.includes('react'))) {
    return 'React component';
  }
  
  if (parsed.imports.some(i => i.source.includes('express'))) {
    return 'Express server/middleware';
  }
  
  return 'Module implementation';
}