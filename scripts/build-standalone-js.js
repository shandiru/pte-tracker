import fs from 'fs';
import path from 'path';
import esbuild from 'esbuild';

const srcDir = path.resolve('src');
const destDir = path.resolve('frontend/src');

function processDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(srcDir, fullPath);

    if (entry.isDirectory()) {
      if (entry.name === 'types') continue; // Skip TS types
      fs.mkdirSync(path.join(destDir, relPath), { recursive: true });
      processDir(fullPath);
    } else if (entry.isFile()) {
      if (entry.name.endsWith('.d.ts')) continue;

      let ext = path.extname(entry.name);
      let newName = entry.name;
      let loader = 'js';

      if (ext === '.tsx') {
        newName = entry.name.replace(/\.tsx$/, '.jsx');
        loader = 'tsx';
      } else if (ext === '.ts') {
        newName = entry.name.replace(/\.ts$/, '.js');
        loader = 'ts';
      } else {
        // Copy static file directly (e.g. index.css)
        const target = path.join(destDir, relPath);
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.copyFileSync(fullPath, target);
        continue;
      }

      const content = fs.readFileSync(fullPath, 'utf-8');
      const transformed = esbuild.transformSync(content, {
        loader,
        jsx: 'preserve',
      });

      // Update import paths from .tsx/.ts to .jsx/.js
      let code = transformed.code;
      code = code.replace(/from\s+['"]([^'"]+)\.tsx['"]/g, "from '$1.jsx'");
      code = code.replace(/from\s+['"]([^'"]+)\.ts['"]/g, "from '$1.js'");
      // If importing .js for a component/page that is actually .jsx, fix to .jsx
      code = code.replace(/from\s+['"](\.\.?\/(components|pages)\/[^'"]+)\.js['"]/g, "from '$1.jsx'");
      code = code.replace(/import\s+['"]\.\/types[^'"]*['"];?\n?/g, '');
      code = code.replace(/import\s+type\s+[^;]+;?\n?/g, '');

      const targetPath = path.join(destDir, path.dirname(relPath), newName);
      fs.mkdirSync(path.dirname(targetPath), { recursive: true });
      fs.writeFileSync(targetPath, code, 'utf-8');
    }
  }
}

console.log('Converting frontend to pure JS/JSX...');
fs.mkdirSync(destDir, { recursive: true });
processDir(srcDir);
console.log('Conversion completed successfully.');
