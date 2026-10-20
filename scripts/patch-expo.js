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

// 1. Fix Swift tools version in Package.swift (6.2 -> 6.0 for Xcode 16)
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

// 2. Fix Task+immediate.swift for Swift 6.0 (Xcode 16 / iOS 18 SDK)
const taskImmPath = 'node_modules/expo-modules-jsi/apple/Sources/ExpoModulesJSI/Extensions/Task+immediate.swift';
if (fs.existsSync(taskImmPath)) {
  let content = fs.readFileSync(taskImmPath, 'utf8');
  if (content.includes('Task.immediate')) {
    content = content.replace(/if\s+#available\([^)]+\)\s*\{[\s\S]*?\}\s*else\s*\{[\s\S]*?\}/g, 'return Task(priority: priority ?? .high, operation: operation)');
    fs.writeFileSync(taskImmPath, content, 'utf8');
    console.log('Fixed Task+immediate.swift');
  }
}

// 3. Fix trailing comma and consuming in JavaScriptRuntime.swift
const jsRuntimePath = 'node_modules/expo-modules-jsi/apple/Sources/ExpoModulesJSI/Runtime/JavaScriptRuntime.swift';
if (fs.existsSync(jsRuntimePath)) {
  let content = fs.readFileSync(jsRuntimePath, 'utf8');
  let changed = false;
  if (content.includes('consuming JavaScriptValuesBuffer,')) {
    content = content.replace(/consuming\s+JavaScriptValuesBuffer,/g, 'consuming JavaScriptValuesBuffer');
    changed = true;
  }
  if (content.includes('vector.push_back(consuming: propNameId)')) {
    content = content.replace('vector.push_back(consuming: propNameId)', 'vector.push_back(propNameId)');
    changed = true;
  }
  if (changed) {
    fs.writeFileSync(jsRuntimePath, content, 'utf8');
    console.log('Fixed JavaScriptRuntime.swift syntax');
  }
}

// 4. Fix weak let across ALL Swift files in expo-modules-jsi (Swift 6 requires weak var)
walk('node_modules/expo-modules-jsi', (file) => {
  if (file.endsWith('.swift')) {
    let content = fs.readFileSync(file, 'utf8');
    let changed = false;

    // weak let -> weak var
    if (content.includes('weak let')) {
      content = content.replace(/weak\s+let\s+/g, 'weak var ');
      changed = true;
    }

    if (changed) {
      fs.writeFileSync(file, content, 'utf8');
      console.log('Fixed weak let in:', file);
    }
  }
});

// 5. Fix JavaScriptError.swift Sendable conformance for Swift 6
const jsErrorPath = 'node_modules/expo-modules-jsi/apple/Sources/ExpoModulesJSI/Runtime/Values/JavaScriptError.swift';
if (fs.existsSync(jsErrorPath)) {
  let content = fs.readFileSync(jsErrorPath, 'utf8');
  if (content.includes('class JavaScriptError: Error, Sendable')) {
    content = content.replace(/public\s+final\s+class\s+JavaScriptError:\s*Error,\s*Sendable/g, 'public final class JavaScriptError: Error, @unchecked Sendable');
    fs.writeFileSync(jsErrorPath, content, 'utf8');
    console.log('Fixed JavaScriptError.swift (@unchecked Sendable)');
  }
}

// 6. Fix HostFunctionContext.swift (Unmanaged runtime needs @unchecked Sendable)
const hostFnPath = 'node_modules/expo-modules-jsi/apple/Sources/ExpoModulesJSI/Contexts/HostFunctionContext.swift';
if (fs.existsSync(hostFnPath)) {
  let content = fs.readFileSync(hostFnPath, 'utf8');
  let changed = false;
  if (content.includes('class HostFunctionContext: HostCallbackContext, Sendable')) {
    content = content.replace(/class\s+HostFunctionContext:\s*HostCallbackContext,\s*Sendable/g, 'class HostFunctionContext: HostCallbackContext, @unchecked Sendable');
    changed = true;
  }
  if (content.includes('class UnownedThisHostFunctionContext: HostCallbackContext, Sendable')) {
    content = content.replace(/class\s+UnownedThisHostFunctionContext:\s*HostCallbackContext,\s*Sendable/g, 'class UnownedThisHostFunctionContext: HostCallbackContext, @unchecked Sendable');
    changed = true;
  }
  if (changed) {
    fs.writeFileSync(hostFnPath, content, 'utf8');
    console.log('Fixed HostFunctionContext.swift (@unchecked Sendable)');
  }
}

// 7. Fix HostObjectContext.swift (Unmanaged runtime needs @unchecked Sendable)
const hostObjPath = 'node_modules/expo-modules-jsi/apple/Sources/ExpoModulesJSI/Contexts/HostObjectContext.swift';
if (fs.existsSync(hostObjPath)) {
  let content = fs.readFileSync(hostObjPath, 'utf8');
  if (content.includes('class HostObjectContext: HostCallbackContext, Sendable')) {
    content = content.replace(/class\s+HostObjectContext:\s*HostCallbackContext,\s*Sendable/g, 'class HostObjectContext: HostCallbackContext, @unchecked Sendable');
    fs.writeFileSync(hostObjPath, content, 'utf8');
    console.log('Fixed HostObjectContext.swift (@unchecked Sendable)');
  }
}

// 8. Fix JavaScriptExecutor in JavaScriptActor.swift
const jsActorPath = 'node_modules/expo-modules-jsi/apple/Sources/ExpoModulesJSI/Runtime/JavaScriptActor.swift';
if (fs.existsSync(jsActorPath)) {
  let content = fs.readFileSync(jsActorPath, 'utf8');
  if (content.includes('internal class JavaScriptExecutor: SerialExecutor {')) {
    content = content.replace(/internal\s+class\s+JavaScriptExecutor:\s*SerialExecutor\s*\{/g, 'internal class JavaScriptExecutor: SerialExecutor, @unchecked Sendable {');
    fs.writeFileSync(jsActorPath, content, 'utf8');
    console.log('Fixed JavaScriptActor.swift (@unchecked Sendable)');
  }
}

console.log('All Expo patches applied successfully.');
