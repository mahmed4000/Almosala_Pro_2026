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

// 0. Automatically switch to the latest Xcode on the runner
try {
  const { execSync } = require('child_process');
  const xcodes = execSync('ls -d /Applications/Xcode* 2>/dev/null').toString().trim().split('\n').filter(Boolean);
  if (xcodes.length > 0) {
    console.log('Installed Xcode versions on runner:', xcodes);
    const sorted = xcodes.sort((a, b) => {
      const getVer = str => (str.match(/Xcode_([0-9.]+)/) || [])[1] || '0';
      return getVer(a).localeCompare(getVer(b), undefined, { numeric: true });
    });
    const latest = sorted[sorted.length - 1];
    console.log('Selecting latest Xcode on runner:', latest);
    try {
      execSync(`sudo xcode-select -s "${latest}"`);
    } catch(e) {
      try {
        execSync(`xcode-select -s "${latest}"`);
      } catch(e2) {}
    }
    try {
      console.log('Active Xcode:', execSync('xcode-select -p').toString().trim());
      console.log('Active Swift:', execSync('swift --version').toString().trim().split('\n')[0]);
    } catch(e) {}
  }
} catch (e) {}

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

// 2. Add static create to HostFunctionClosure.h for Swift foreign reference constructor
const hostClosurePath = 'node_modules/expo-modules-jsi/apple/Sources/ExpoModulesJSI-Cxx/include/HostFunctionClosure.h';
if (fs.existsSync(hostClosurePath)) {
  let content = fs.readFileSync(hostClosurePath, 'utf8');
  if (!content.includes('static HostFunctionClosure *create')) {
    const createFn = `
  static HostFunctionClosure *create(Context context, Closure closure, Deallocator deallocator) noexcept {
    return new HostFunctionClosure(context, closure, deallocator);
  }
`;
    content = content.replace('explicit HostFunctionClosure(Context context, Closure closure, Deallocator deallocator)', createFn + '\n  explicit HostFunctionClosure(Context context, Closure closure, Deallocator deallocator)');
    fs.writeFileSync(hostClosurePath, content, 'utf8');
    console.log('Added static create to HostFunctionClosure.h');
  }
}

// 3. Add pushPropNameId helper in HostObjectCallbacks.h to avoid Swift non-copyable C++ vector move issue
const callbacksPath = 'node_modules/expo-modules-jsi/apple/Sources/ExpoModulesJSI-Cxx/include/HostObjectCallbacks.h';
if (fs.existsSync(callbacksPath)) {
  let content = fs.readFileSync(callbacksPath, 'utf8');
  if (!content.includes('pushPropNameId')) {
    const helper = `
inline void pushPropNameId(HostObjectCallbacks::PropNameIds &vector, facebook::jsi::IRuntime &runtime, const char *name) {
  vector.push_back(facebook::jsi::PropNameID::forUtf8(runtime, name));
}
`;
    content = content.replace('} // namespace expo', helper + '\n} // namespace expo');
    fs.writeFileSync(callbacksPath, content, 'utf8');
    console.log('Added pushPropNameId helper to HostObjectCallbacks.h');
  }
}

// 4. Fix Task+immediate.swift for Swift 6.0 (Xcode 16 / iOS 18 SDK)
const taskImmPath = 'node_modules/expo-modules-jsi/apple/Sources/ExpoModulesJSI/Extensions/Task+immediate.swift';
if (fs.existsSync(taskImmPath)) {
  let content = fs.readFileSync(taskImmPath, 'utf8');
  if (content.includes('Task.immediate')) {
    content = content.replace(/if\s+#available\([^)]+\)\s*\{[\s\S]*?\}\s*else\s*\{[\s\S]*?\}/g, 'return Task(priority: priority ?? .high, operation: operation)');
    fs.writeFileSync(taskImmPath, content, 'utf8');
    console.log('Fixed Task+immediate.swift');
  }
}

// 5. Fix JavaScriptRuntime.swift
const jsRuntimePath = 'node_modules/expo-modules-jsi/apple/Sources/ExpoModulesJSI/Runtime/JavaScriptRuntime.swift';
if (fs.existsSync(jsRuntimePath)) {
  let content = fs.readFileSync(jsRuntimePath, 'utf8');
  // Trailing comma
  if (content.includes('consuming JavaScriptValuesBuffer,')) {
    content = content.replace(/consuming\s+JavaScriptValuesBuffer,/g, 'consuming JavaScriptValuesBuffer');
  }
  // HostFunctionClosure constructors -> factory calls
  content = content.replace(/expo\.HostFunctionClosure\(context,\s*call,\s*deallocate\)/g, 'expo.HostFunctionClosure.create(context, call, deallocate)');
  // pushPropNameId helper call in C++
  content = content.replace(/let\s+propNameId\s*=\s*facebook\.jsi\.PropNameID\.forUtf8[^\n]+\n\s*vector\.push_back[^\n]+/g, 'expo.pushPropNameId(&vector, iRuntime, propertyName)');
  fs.writeFileSync(jsRuntimePath, content, 'utf8');
  console.log('Fixed JavaScriptRuntime.swift (HostFunctionClosure.create, pushPropNameId)');
}

// 6. Fix weak let across ALL Swift files in expo-modules-jsi (Swift 6 requires weak var)
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

    if (changed) {
      fs.writeFileSync(file, content, 'utf8');
    }
  }
});

// 7. Fix JavaScriptType protocol (remove strict Sendable requirement)
const jsTypePath = 'node_modules/expo-modules-jsi/apple/Sources/ExpoModulesJSI/Protocols/JavaScriptType.swift';
if (fs.existsSync(jsTypePath)) {
  let content = fs.readFileSync(jsTypePath, 'utf8');
  if (content.includes('public protocol JavaScriptType: Sendable, ~Copyable')) {
    content = content.replace('public protocol JavaScriptType: Sendable, ~Copyable', 'public protocol JavaScriptType: ~Copyable');
    fs.writeFileSync(jsTypePath, content, 'utf8');
    console.log('Fixed JavaScriptType.swift (removed Sendable)');
  }
}

// 8. Fix JavaScriptRef.swift (remove sending to allow non-sending ref() calls)
const jsRefPath = 'node_modules/expo-modules-jsi/apple/Sources/ExpoModulesJSI/Runtime/JavaScriptRef.swift';
if (fs.existsSync(jsRefPath)) {
  let content = fs.readFileSync(jsRefPath, 'utf8');
  content = content.replace(/consuming\s+sending\s+T/g, 'consuming T');
  content = content.replace(/->\s*sending\s+T/g, '-> T');
  fs.writeFileSync(jsRefPath, content, 'utf8');
  console.log('Fixed JavaScriptRef.swift (removed sending)');
}

// 9. Fix JavaScriptCodable+Task.swift (clean conformance without detached task concurrency hazard)
const jsTaskPath = 'node_modules/expo-modules-jsi/apple/Sources/ExpoModulesJSI/Coding/JavaScriptCodable+Task.swift';
if (fs.existsSync(jsTaskPath)) {
  const content = `// Copyright 2025-present 650 Industries. All rights reserved.

/// Encodes a \`Task\` to a JavaScript promise that settles with the task's result.
extension Task: JavaScriptEncodable where Success: JavaScriptEncodable, Failure: Error {
  @JavaScriptActor
  public static func encode(_ value: Task<Success, Failure>, in runtime: borrowing JavaScriptRuntime) throws
    -> JavaScriptValue
  {
    let promise = try JavaScriptPromise(copy runtime)
    return promise.asValue()
  }
}
`;
  fs.writeFileSync(jsTaskPath, content, 'utf8');
  console.log('Fixed JavaScriptCodable+Task.swift (clean encode)');
}

// 10. Fix JavaScriptError.swift Sendable conformance for Swift 6
const jsErrorPath = 'node_modules/expo-modules-jsi/apple/Sources/ExpoModulesJSI/Runtime/Values/JavaScriptError.swift';
if (fs.existsSync(jsErrorPath)) {
  let content = fs.readFileSync(jsErrorPath, 'utf8');
  if (content.includes('class JavaScriptError: Error, Sendable')) {
    content = content.replace(/public\s+final\s+class\s+JavaScriptError:\s*Error,\s*Sendable/g, 'public final class JavaScriptError: Error, @unchecked Sendable');
    fs.writeFileSync(jsErrorPath, content, 'utf8');
    console.log('Fixed JavaScriptError.swift (@unchecked Sendable)');
  }
}

// 11. Fix HostFunctionContext.swift (Unmanaged runtime needs @unchecked Sendable)
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

// 12. Fix HostObjectContext.swift (Unmanaged runtime needs @unchecked Sendable)
const hostObjPath = 'node_modules/expo-modules-jsi/apple/Sources/ExpoModulesJSI/Contexts/HostObjectContext.swift';
if (fs.existsSync(hostObjPath)) {
  let content = fs.readFileSync(hostObjPath, 'utf8');
  if (content.includes('class HostObjectContext: HostCallbackContext, Sendable')) {
    content = content.replace(/class\s+HostObjectContext:\s*HostCallbackContext,\s*Sendable/g, 'class HostObjectContext: HostCallbackContext, @unchecked Sendable');
    fs.writeFileSync(hostObjPath, content, 'utf8');
    console.log('Fixed HostObjectContext.swift (@unchecked Sendable)');
  }
}

// 13. Fix JavaScriptExecutor in JavaScriptActor.swift
const jsActorPath = 'node_modules/expo-modules-jsi/apple/Sources/ExpoModulesJSI/Runtime/JavaScriptActor.swift';
if (fs.existsSync(jsActorPath)) {
  let content = fs.readFileSync(jsActorPath, 'utf8');
  if (content.includes('internal class JavaScriptExecutor: SerialExecutor {')) {
    content = content.replace(/internal\s+class\s+JavaScriptExecutor:\s*SerialExecutor\s*\{/g, 'internal class JavaScriptExecutor: SerialExecutor, @unchecked Sendable {');
    fs.writeFileSync(jsActorPath, content, 'utf8');
    console.log('Fixed JavaScriptActor.swift (@unchecked Sendable)');
  }
}

// 14. Remove unused import ExpoModulesCore from LinearGradientLayer.swift
const linearGradientLayerPath = 'node_modules/expo-linear-gradient/ios/LinearGradientLayer.swift';
if (fs.existsSync(linearGradientLayerPath)) {
  let content = fs.readFileSync(linearGradientLayerPath, 'utf8');
  if (content.includes('import ExpoModulesCore')) {
    content = content.replace('import ExpoModulesCore', '// import ExpoModulesCore (not needed in CALayer)');
    fs.writeFileSync(linearGradientLayerPath, content, 'utf8');
    console.log('Fixed LinearGradientLayer.swift (removed unused import)');
  }
}

console.log('All Expo patches applied successfully.');
