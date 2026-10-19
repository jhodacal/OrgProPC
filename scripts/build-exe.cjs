const { packager } = require('@electron/packager');
const path = require('path');
const fs = require('fs');

async function buildExe() {
  console.log('🚀 Empaquetando OrgPro PC para Windows (.exe)...');
  
  const options = {
    dir: path.resolve(__dirname, '..'),
    out: path.resolve(__dirname, '../release'),
    name: 'OrgPro PC',
    platform: 'win32',
    arch: 'x64',
    overwrite: true,
    prune: true,
    asar: true,
    ignore: [
      /^\/src/,
      /^\/\.git/,
      /^\/\.npm-cache/,
      /^\/\.temp/,
      /tsconfig.*\.json/,
      /tailwind\.config\.js/,
      /postcss\.config\.js/,
      /vite\.config\.ts/
    ]
  };

  try {
    const appPaths = await packager(options);
    console.log('✅ ¡OrgPro PC .exe generado exitosamente en:', appPaths);
  } catch (err) {
    console.error('❌ Error empaquetando:', err);
    process.exit(1);
  }
}

buildExe();
