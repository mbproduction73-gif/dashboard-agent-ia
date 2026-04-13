const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs-extra');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// ─── DEFINITION DES OUTILS POUR CLAUDE ───────────────────────────────────────

const TOOL_DEFINITIONS = [
  {
        name: 'web_search',
        description: 'Recherche sur le web et retourne les résultats. Utilise DuckDuckGo.',
        input_schema: {
                type: 'object',
                properties: {
                          query: { type: 'string', description: 'La requête de recherche' },
                          max_results: { type: 'number', description: 'Nombre max de résultats (défaut: 5)' }
                },
                required: ['query']
        }
  },
  {
        name: 'read_url',
        description: 'Lit et extrait le contenu texte d\'une URL web.',
        input_schema: {
                type: 'object',
                properties: {
                          url: { type: 'string', description: 'L\'URL à lire' }
                },
                required: ['url']
        }
  },
  {
        name: 'write_file',
        description: 'Écrit du contenu dans un fichier local.',
        input_schema: {
                type: 'object',
                properties: {
                          filepath: { type: 'string', description: 'Chemin du fichier' },
                          content: { type: 'string', description: 'Contenu à écrire' }
                },
                required: ['filepath', 'content']
        }
  },
  {
        name: 'read_file',
        description: 'Lit le contenu d\'un fichier local.',
        input_schema: {
                type: 'object',
                properties: {
                          filepath: { type: 'string', description: 'Chemin du fichier à lire' }
                },
                required: ['filepath']
        }
  },
  {
        name: 'list_files',
        description: 'Liste les fichiers dans un répertoire.',
        input_schema: {
                type: 'object',
                properties: {
                          directory: { type: 'string', description: 'Chemin du répertoire (défaut: .)' }
                },
                required: []
        }
  },
  {
        name: 'run_command',
        description: 'Exécute une commande shell (bash/cmd). ATTENTION: commandes sûres seulement.',
        input_schema: {
                type: 'object',
                properties: {
                          command: { type: 'string', description: 'La commande à exécuter' }
                },
                required: ['command']
        }
  }
  ];

// ─── EXECUTION DES OUTILS ─────────────────────────────────────────────────────

async function executeTool(toolName, toolInput, logFn = console.log) {
    logFn(`[OUTIL] Exécution: ${toolName}`, toolInput);

  try {
        switch (toolName) {
          case 'web_search':
                    return await webSearch(toolInput.query, toolInput.max_results || 5);

          case 'read_url':
                    return await readUrl(toolInput.url);

          case 'write_file':
                    return await writeFile(toolInput.filepath, toolInput.content);

          case 'read_file':
                    return await readFile(toolInput.filepath);

          case 'list_files':
                    return await listFiles(toolInput.directory || '.');

          case 'run_command':
                    return await runCommand(toolInput.command);

          default:
                    return { error: `Outil inconnu: ${toolName}` };
        }
  } catch (err) {
        return { error: err.message };
  }
}

// ─── IMPLEMENTATIONS ──────────────────────────────────────────────────────────

async function webSearch(query, maxResults = 5) {
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const res = await axios.get(url, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AgentIA/1.0)' },
          timeout: 10000
    });
    const $ = cheerio.load(res.data);
    const results = [];
    $('.result').slice(0, maxResults).each((i, el) => {
          const title = $(el).find('.result__title').text().trim();
          const snippet = $(el).find('.result__snippet').text().trim();
          const link = $(el).find('.result__url').text().trim();
          if (title) results.push({ title, snippet, link });
    });
    return { query, results, count: results.length };
}

async function readUrl(url) {
    const res = await axios.get(url, {
          headers: { 'User-Agent': 'Mozilla/5.0' },
          timeout: 15000
    });
    const $ = cheerio.load(res.data);
    $('script, style, nav, footer, header').remove();
    const text = $('body').text().replace(/\s+/g, ' ').trim().slice(0, 5000);
    return { url, content: text, length: text.length };
}

async function writeFile(filepath, content) {
    const fullPath = path.resolve(filepath);
    await fs.ensureDir(path.dirname(fullPath));
    await fs.writeFile(fullPath, content, 'utf8');
    return { success: true, filepath: fullPath, bytes: content.length };
}

async function readFile(filepath) {
    const fullPath = path.resolve(filepath);
    const content = await fs.readFile(fullPath, 'utf8');
    return { filepath: fullPath, content, length: content.length };
}

async function listFiles(directory) {
    const fullPath = path.resolve(directory);
    const items = await fs.readdir(fullPath, { withFileTypes: true });
    const files = items.map(item => ({
          name: item.name,
          type: item.isDirectory() ? 'directory' : 'file'
    }));
    return { directory: fullPath, files, count: files.length };
}

async function runCommand(command) {
    // Sécurité basique: bloquer commandes dangereuses
  const blocked = ['rm -rf /', 'format', 'del /s', 'shutdown', 'reboot'];
    if (blocked.some(b => command.toLowerCase().includes(b))) {
          return { error: 'Commande bloquée pour des raisons de sécurité' };
    }
    const { stdout, stderr } = await execPromise(command, { timeout: 30000 });
    return { command, stdout: stdout.trim(), stderr: stderr.trim() };
}

module.exports = { TOOL_DEFINITIONS, executeTool };
