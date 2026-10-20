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
// AND annotate weak var runtime with nonisolated(unsafe) to allow Sendable conformance
walk('node_modules/expo-modules-jsi', (file) => {
  if (file.endsWith('.swift')) {
    let content = fs.readFileSync(file, 'utf8');
    let changed = false;

    // weak let -> weak var
    if (content.includes('weak let')) {
      content = content.replace(/weak\s+let\s+/g, 'weak var ');
      changed = true;
    }

    // weak var runtime -> nonisolated(unsafe) weak var runtime
    if (content.includes('weak var runtime') && !content.includes('nonisolated(unsafe)')) {
      content = content.replace(/((?:private|internal)\s+weak\s+var\s+runtime)/g, 'nonisolated(unsafe) $1');
      changed = true;
    }

    // clean up any artificially appended @unchecked Sendable
    if (content.includes(', @unchecked Sendable')) {
      content = content.replace(/,\s*@unchecked\s*Sendable/g, '');
      changed = true;
    }

    if (changed) {
      fs.writeFileSync(file, content, 'utf8');
    }
  }
});

// 5. Fix JavaScriptType protocol (remove strict Sendable requirement)
const jsTypePath = 'node_modules/expo-modules-jsi/apple/Sources/ExpoModulesJSI/Protocols/JavaScriptType.swift';
if (fs.existsSync(jsTypePath)) {
  let content = fs.readFileSync(jsTypePath, 'utf8');
  if (content.includes('public protocol JavaScriptType: Sendable, ~Copyable')) {
    content = content.replace('public protocol JavaScriptType: Sendable, ~Copyable', 'public protocol JavaScriptType: ~Copyable');
    fs.writeFileSync(jsTypePath, content, 'utf8');
    console.log('Fixed JavaScriptType.swift (removed Sendable)');
  }
}

// 6. Fix JavaScriptError.swift Sendable conformance for Swift 6
const jsErrorPath = 'node_modules/expo-modules-jsi/apple/Sources/ExpoModulesJSI/Runtime/Values/JavaScriptError.swift';
if (fs.existsSync(jsErrorPath)) {
  let content = fs.readFileSync(jsErrorPath, 'utf8');
  content = content.replace(/public\s+final\s+class\s+JavaScriptError:\s*Error,\s*Sendable/g, 'public final class JavaScriptError: Error, @unchecked Sendable');
  fs.writeFileSync(jsErrorPath, content, 'utf8');
  console.log('Fixed JavaScriptError.swift (@unchecked Sendable)');
}

// 7. Fix HostFunctionContext.swift (Unmanaged runtime needs @unchecked Sendable)
const hostFnPath = 'node_modules/expo-modules-jsi/apple/Sources/ExpoModulesJSI/Contexts/HostFunctionContext.swift';
if (fs.existsSync(hostFnPath)) {
  let content = fs.readFileSync(hostFnPath, 'utf8');
  content = content.replace(/class\s+HostFunctionContext:\s*HostCallbackContext,\s*Sendable/g, 'class HostFunctionContext: HostCallbackContext, @unchecked Sendable');
  content = content.replace(/class\s+UnownedThisHostFunctionContext:\s*HostCallbackContext,\s*Sendable/g, 'class UnownedThisHostFunctionContext: HostCallbackContext, @unchecked Sendable');
  fs.writeFileSync(hostFnPath, content, 'utf8');
  console.log('Fixed HostFunctionContext.swift (@unchecked Sendable)');
}

// 8. Fix HostObjectContext.swift (Unmanaged runtime needs @unchecked Sendable)
const hostObjPath = 'node_modules/expo-modules-jsi/apple/Sources/ExpoModulesJSI/Contexts/HostObjectContext.swift';
if (fs.existsSync(hostObjPath)) {
  let content = fs.readFileSync(hostObjPath, 'utf8');
  content = content.replace(/class\s+HostObjectContext:\s*HostCallbackContext,\s*Sendable/g, 'class HostObjectContext: HostCallbackContext, @unchecked Sendable');
  fs.writeFileSync(hostObjPath, content, 'utf8');
  console.log('Fixed HostObjectContext.swift (@unchecked Sendable)');
}

// 9. Fix JavaScriptExecutor in JavaScriptActor.swift (MUST NOT be final because JavaScriptRuntimeExecutor subclasses it)
const jsActorPath = 'node_modules/expo-modules-jsi/apple/Sources/ExpoModulesJSI/Runtime/JavaScriptActor.swift';
if (fs.existsSync(jsActorPath)) {
  let content = fs.readFileSync(jsActorPath, 'utf8');
  content = content.replace(/internal\s+(?:final\s+)?class\s+JavaScriptExecutor:\s*SerialExecutor(?:\s*,\s*@unchecked\s*Sendable)?/g, 'internal class JavaScriptExecutor: SerialExecutor, @unchecked Sendable');
  fs.writeFileSync(jsActorPath, content, 'utf8');
  console.log('Fixed JavaScriptActor.swift (internal class JavaScriptExecutor: SerialExecutor, @unchecked Sendable)');
}

console.log('All Expo patches applied successfully.');
