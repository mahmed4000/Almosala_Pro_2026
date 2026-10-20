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

// 3. Fix trailing comma in JavaScriptRuntime.swift
const jsRuntimePath = 'node_modules/expo-modules-jsi/apple/Sources/ExpoModulesJSI/Runtime/JavaScriptRuntime.swift';
if (fs.existsSync(jsRuntimePath)) {
  let content = fs.readFileSync(jsRuntimePath, 'utf8');
  if (content.includes('consuming JavaScriptValuesBuffer,')) {
    content = content.replace(/consuming\s+JavaScriptValuesBuffer,/g, 'consuming JavaScriptValuesBuffer');
    fs.writeFileSync(jsRuntimePath, content, 'utf8');
    console.log('Fixed trailing comma in JavaScriptRuntime.swift');
  }
}

// 4. Fix weak let across ALL Swift files in expo-modules-jsi (Swift 6 requires weak var)
walk('node_modules/expo-modules-jsi', (file) => {
  if (file.endsWith('.swift')) {
    let content = fs.readFileSync(file, 'utf8');
    if (content.includes('weak let')) {
      content = content.replace(/weak\s+let\s+/g, 'weak var ');
      fs.writeFileSync(file, content, 'utf8');
      console.log('Fixed weak let in:', file);
    }
  }
});

// 5. Fix JavaScriptError.swift Sendable conformance for Swift 6
const jsErrorPath = 'node_modules/expo-modules-jsi/apple/Sources/ExpoModulesJSI/Runtime/Values/JavaScriptError.swift';
if (fs.existsSync(jsErrorPath)) {
  let content = fs.readFileSync(jsErrorPath, 'utf8');
  content = content.replace(/public\s+final\s+class\s+JavaScriptError:\s*Error,\s*Sendable/g, 'public final class JavaScriptError: Error, @unchecked Sendable');
  fs.writeFileSync(jsErrorPath, content, 'utf8');
  console.log('Fixed JavaScriptError.swift (@unchecked Sendable)');
}

console.log('All Expo patches applied successfully.');
