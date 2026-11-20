const https = require('https');
const fs = require('fs');
const path = require('path');

const REPO_OWNER = 'szerszen42';
const REPO_NAME = 'vectormc-shop';
const BRANCH = 'main';

const tokenPath = path.join(__dirname, 'sync_token.txt');
if (!fs.existsSync(tokenPath)) {
  console.error('❌ Brak pliku sync_token.txt z tokenem GitHub!');
  process.exit(1);
}

const GITHUB_TOKEN = fs.readFileSync(tokenPath, 'utf8').trim();

function githubRequest(method, endpoint, body = null) {
  return new Promise((resolve, reject) => {
    const dataString = body ? JSON.stringify(body) : null;
    const req = https.request({
      hostname: 'api.github.com',
      path: `/repos/${REPO_OWNER}/${REPO_NAME}${endpoint}`,
      method: method,
      headers: {
        'User-Agent': 'Antigravity-AutoDeploy',
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        ...(dataString ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(dataString) } : {})
      }
    }, res => {
      let chunks = '';
      res.on('data', c => chunks += c);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(chunks ? JSON.parse(chunks) : {});
          } catch (e) {
            resolve(chunks);
          }
        } else {
          reject(new Error(`GitHub API [${res.statusCode}] on ${endpoint}: ${chunks}`));
        }
      });
    });

    req.on('error', reject);
    if (dataString) req.write(dataString);
    req.end();
  });
}

// Lista plików do synchronizacji
function getFilesToSync(dir, baseDir = '') {
  let results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = baseDir ? `${baseDir}/${entry.name}` : entry.name;

    if (entry.name.startsWith('.git') && entry.name !== '.gitignore') continue;
    if (entry.name === 'node_modules') continue;
    if (entry.name === 'sync_token.txt') continue;
    if (entry.name.endsWith('.bat')) continue; // skrypty Windows niepotrzebne na Renderze

    if (entry.isDirectory()) {
      if (entry.name === 'downloads') continue; // duże pliki binarne > 25MB
      results = results.concat(getFilesToSync(fullPath, relPath));
    } else if (entry.isFile()) {
      // Ignoruj pliki większe niż 20MB
      const stat = fs.statSync(fullPath);
      if (stat.size < 20 * 1024 * 1024) {
        results.push({ fullPath, relPath });
      }
    }
  }

  return results;
}

async function syncToGitHub(commitMsg = 'Automatyczna aktualizacja sklepu VectorMc') {
  try {
    console.log(`🚀 [GitHub Sync]: Rozpoczynam synchronizację z repozytorium ${REPO_OWNER}/${REPO_NAME}...`);

    // 1. Pobierz referencję do gałęzi main
    const refData = await githubRequest('GET', `/git/refs/heads/${BRANCH}`);
    const latestCommitSha = refData.object.sha;

    // 2. Pobierz commit, aby uzyskać treeSha
    const commitData = await githubRequest('GET', `/git/commits/${latestCommitSha}`);
    const baseTreeSha = commitData.tree.sha;

    // 3. Wgraj pliki jako Bloby
    const localFiles = getFilesToSync(__dirname);
    console.log(`📁 Przygotowano ${localFiles.length} plików do weryfikacji / wysyłki...`);

    const treeItems = [];
    for (const f of localFiles) {
      const content = fs.readFileSync(f.fullPath);
      const isUtf8 = !/\.(ico|png|jpg|jpeg|gif|zip|exe)$/i.test(f.relPath);

      const blobData = await githubRequest('POST', '/git/blobs', {
        content: isUtf8 ? content.toString('utf8') : content.toString('base64'),
        encoding: isUtf8 ? 'utf-8' : 'base64'
      });

      treeItems.push({
        path: f.relPath,
        mode: '100644',
        type: 'blob',
        sha: blobData.sha
      });
    }

    // 4. Utwórz nowe drzewo (Tree)
    const newTree = await githubRequest('POST', '/git/trees', {
      base_tree: baseTreeSha,
      tree: treeItems
    });

    if (newTree.sha === baseTreeSha) {
      console.log(`ℹ️ [GitHub Sync]: Brak zmian w plikach – repozytorium jest w 100% aktualne!`);
      return;
    }

    // 5. Utwórz nowy commit
    const newCommit = await githubRequest('POST', '/git/commits', {
      message: commitMsg,
      tree: newTree.sha,
      parents: [latestCommitSha]
    });

    // 6. Zaktualizuj ref heads/main
    await githubRequest('PATCH', `/git/refs/heads/${BRANCH}`, {
      sha: newCommit.sha,
      force: false
    });

    console.log(`\n======================================================`);
    console.log(`✅ [SUKCES] Kod został pomyślnie wysłany na GitHub!`);
    console.log(`🔗 Commit: ${newCommit.sha.slice(0, 7)} - "${commitMsg}"`);
    console.log(`🌐 Render automatycznie rozpoczyna wdrożenie nowej wersji.`);
    console.log(`======================================================\n`);
  } catch (err) {
    console.error('❌ Błąd synchronizacji z GitHub:', err.message);
  }
}

const msg = process.argv.slice(2).join(' ') || 'Aktualizacja sklepu VectorMc';
syncToGitHub(msg);
