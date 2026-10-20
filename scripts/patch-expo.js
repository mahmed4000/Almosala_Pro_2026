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

// 4. Fix JavaScriptError.swift (weak let -> weak var, and Sendable -> @unchecked Sendable)
const jsErrorPath = 'node_modules/expo-modules-jsi/apple/Sources/ExpoModulesJSI/Runtime/Values/JavaScriptError.swift';
if (fs.existsSync(jsErrorPath)) {
  let content = fs.readFileSync(jsErrorPath, 'utf8');
  content = content.replace(/weak\s+let\s+runtime/g, 'weak var runtime');
  // replace Sendable with @unchecked Sendable on JavaScriptError
  content = content.replace(/public\s+final\s+class\s+JavaScriptError:\s*Error,\s*Sendable(\s*,\s*@unchecked\s*Sendable)?/g, 'public final class JavaScriptError: Error, @unchecked Sendable');
  fs.writeFileSync(jsErrorPath, content, 'utf8');
  console.log('Fixed JavaScriptError.swift (weak var & @unchecked Sendable)');
}

// 5. Clean up any unintended edits in other files
['CleanupContext.swift', 'HostFunctionContext.swift', 'HostObjectContext.swift'].forEach((fileName) => {
  walk('node_modules/expo-modules-jsi', (file) => {
    if (path.basename(file) === fileName) {
      let content = fs.readFileSync(file, 'utf8');
      if (content.includes(', @unchecked Sendable')) {
        content = content.replace(/,\s*@unchecked\s*Sendable/g, '');
        fs.writeFileSync(file, content, 'utf8');
        console.log('Cleaned up redundant Sendable in:', fileName);
      }
    }
  });
});

console.log('All Expo patches applied successfully.');
