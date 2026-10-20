const fs = require('fs');
const path = require('path');

function walk(dir, callback) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      walk(full, callback);
    } else {
      callback(full);
    }
  }
}

console.log('Patching Expo SDK 57 iOS native modules compatibility...');

// 1. Fix Swift tools version in Package.swift
walk('node_modules', (file) => {
  if (path.basename(file) === 'Package.swift') {
    let content = fs.readFileSync(file, 'utf8');
    if (content.includes('swift-tools-version: 6.2')) {
      content = content.replace(/swift-tools-version:\s*6\.2/g, 'swift-tools-version: 6.0');
      fs.writeFileSync(file, content, 'utf8');
      console.log('Fixed Swift tools version in:', file);
    }
  }
});

// 2. Fix RuntimeScheduler.h SWIFT_RETURNS_RETAINED error
const headerPath = 'node_modules/expo-modules-jsi/apple/Sources/ExpoModulesJSI-Cxx/include/RuntimeScheduler.h';
if (fs.existsSync(headerPath)) {
  let content = fs.readFileSync(headerPath, 'utf8');
  if (content.includes('SWIFT_RETURNS_RETAINED')) {
    content = content.replace(/SWIFT_RETURNS_RETAINED\s+/g, '');
    fs.writeFileSync(headerPath, content, 'utf8');
    console.log('Fixed SWIFT_RETURNS_RETAINED in RuntimeScheduler.h');
  }
}

// 3. Fix weak let in Swift files
const expoJsiDir = 'node_modules/expo-modules-jsi';
if (fs.existsSync(expoJsiDir)) {
  walk(expoJsiDir, (file) => {
    if (file.endsWith('.swift')) {
      let content = fs.readFileSync(file, 'utf8');
      if (content.includes('weak let')) {
        content = content.replace(/weak\s+let\s+/g, 'weak var ');
        fs.writeFileSync(file, content, 'utf8');
        console.log('Fixed weak let in:', file);
      }
    }
  });
}

console.log('All Expo patches applied successfully.');
