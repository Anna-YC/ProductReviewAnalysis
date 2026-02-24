/**
 * 淘宝评论助手 - 构建脚本
 * 用于打包插件为ZIP文件
 */

const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

// 配置
const config = {
  extensionDir: __dirname,
  outputDir: path.join(__dirname, 'dist'),
  files: [
    'manifest.json',
    'popup.html',
    'popup.js',
    'content.js',
    'config.js',
    'styles.css',
    'README.md',
    'INSTALL.md',
    'UPDATE_LOG.md'
  ],
  exclude: [
    'node_modules',
    'dist',
    '.git',
    '*.backup'
  ]
};

// 确保输出目录存在
function ensureOutputDir() {
  if (!fs.existsSync(config.outputDir)) {
    fs.mkdirSync(config.outputDir, { recursive: true });
  }
}

// 清理输出目录
function clean() {
  if (fs.existsSync(config.outputDir)) {
    fs.readdirSync(config.outputDir).forEach(file => {
      const filePath = path.join(config.outputDir, file);
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        fs.rmSync(filePath, { recursive: true });
      } else {
        fs.unlinkSync(filePath);
      }
    });
  }
  console.log('✅ 清理完成');
}

// 打包插件
function build() {
  ensureOutputDir();

  // 读取manifest获取版本号
  const manifestPath = path.join(config.extensionDir, 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const version = manifest.version;
  const name = manifest.name.replace(/\s+/g, '-');

  // 创建输出文件
  const outputPath = path.join(config.outputDir, `${name}-v${version}.zip`);
  const output = fs.createWriteStream(outputPath);
  const archive = archiver('zip', { zlib: { level: 9 } });

  output.on('close', () => {
    const sizeInMB = (archive.pointer() / 1024 / 1024).toFixed(2);
    console.log(`✅ 打包完成: ${outputPath}`);
    console.log(`📦 文件大小: ${sizeInMB} MB`);
  });

  archive.on('error', (err) => {
    throw err;
  });

  archive.pipe(output);

  // 添加文件
  config.files.forEach(file => {
    const filePath = path.join(config.extensionDir, file);
    if (fs.existsSync(filePath)) {
      archive.file(filePath, { name: file });
    }
  });

  // 添加图片资源（如果有）
  const iconsDir = path.join(config.extensionDir, 'icons');
  if (fs.existsSync(iconsDir)) {
    archive.directory(iconsDir, 'icons');
  }

  archive.finalize();
}

// CLI入口
const args = process.argv.slice(2);
const command = args[0];

switch (command) {
  case '--zip':
    build();
    break;
  case '--clean':
    clean();
    break;
  default:
    build();
}

module.exports = { build, clean };
