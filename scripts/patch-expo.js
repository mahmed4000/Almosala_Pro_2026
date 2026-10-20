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

// 2. Fix RuntimeScheduler.h (forward declare retain/release in global namespace before SWIFT_SHARED_REFERENCE)
const headerPath = 'node_modules/expo-modules-jsi/apple/Sources/ExpoModulesJSI-Cxx/include/RuntimeScheduler.h';
if (fs.existsSync(headerPath)) {
  let content = fs.readFileSync(headerPath, 'utf8');
  if (!content.includes('// forward declare retainRuntimeScheduler in global namespace')) {
    const forwardDecl = `
// forward declare retainRuntimeScheduler in global namespace
namespace expo { class RuntimeScheduler; }
void retainRuntimeScheduler(expo::RuntimeScheduler *scheduler);
void releaseRuntimeScheduler(expo::RuntimeScheduler *scheduler);
`;
    // Clean up any old forward declaration inside namespace expo
    content = content.replace(/\/\/ forward declare retainRuntimeScheduler[\s\S]*?void releaseRuntimeScheduler\(expo::RuntimeScheduler \*scheduler\);\s*/g, '');
    content = content.replace('namespace expo {', forwardDecl + '\nnamespace expo {');
    fs.writeFileSync(headerPath, content, 'utf8');
    console.log('Added global forward declarations to RuntimeScheduler.h');
  }
}

// 3. Add C++ factory function in HostFunctionClosure.h for Swift 6.0 compatibility
const hostClosurePath = 'node_modules/expo-modules-jsi/apple/Sources/ExpoModulesJSI-Cxx/include/HostFunctionClosure.h';
if (fs.existsSync(hostClosurePath)) {
  let content = fs.readFileSync(hostClosurePath, 'utf8');
  if (!content.includes('createHostFunctionClosure')) {
    const factory = `
inline HostFunctionClosure *createHostFunctionClosure(HostFunctionClosure::Context context, HostFunctionClosure::Closure closure, HostFunctionClosure::Deallocator deallocator) {
  return new HostFunctionClosure(context, closure, deallocator);
}
`;
    content = content.replace('} // namespace expo', factory + '\n} // namespace expo');
    fs.writeFileSync(hostClosurePath, content, 'utf8');
    console.log('Added factory function to HostFunctionClosure.h');
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
  // extraneous consuming: in push_back
  if (content.includes('vector.push_back(consuming: propNameId)')) {
    content = content.replace('vector.push_back(consuming: propNameId)', 'vector.push_back(propNameId)');
  }
  // HostFunctionClosure constructors -> factory calls
  content = content.replace(/return\s+expo\.HostFunctionClosure\(context,\s*call,\s*deallocate\)/g, 'return expo.createHostFunctionClosure(context, call, deallocate)');
  fs.writeFileSync(jsRuntimePath, content, 'utf8');
  console.log('Fixed JavaScriptRuntime.swift (push_back, trailing comma, HostFunctionClosure)');
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

// 8. Fix JavaScriptError.swift Sendable conformance for Swift 6
const jsErrorPath = 'node_modules/expo-modules-jsi/apple/Sources/ExpoModulesJSI/Runtime/Values/JavaScriptError.swift';
if (fs.existsSync(jsErrorPath)) {
  let content = fs.readFileSync(jsErrorPath, 'utf8');
  content = content.replace(/public\s+final\s+class\s+JavaScriptError:\s*Error,\s*Sendable/g, 'public final class JavaScriptError: Error, @unchecked Sendable');
  fs.writeFileSync(jsErrorPath, content, 'utf8');
  console.log('Fixed JavaScriptError.swift (@unchecked Sendable)');
}

// 9. Fix HostFunctionContext.swift (Unmanaged runtime needs @unchecked Sendable)
const hostFnPath = 'node_modules/expo-modules-jsi/apple/Sources/ExpoModulesJSI/Contexts/HostFunctionContext.swift';
if (fs.existsSync(hostFnPath)) {
  let content = fs.readFileSync(hostFnPath, 'utf8');
  content = content.replace(/class\s+HostFunctionContext:\s*HostCallbackContext,\s*Sendable/g, 'class HostFunctionContext: HostCallbackContext, @unchecked Sendable');
  content = content.replace(/class\s+UnownedThisHostFunctionContext:\s*HostCallbackContext,\s*Sendable/g, 'class UnownedThisHostFunctionContext: HostCallbackContext, @unchecked Sendable');
  fs.writeFileSync(hostFnPath, content, 'utf8');
  console.log('Fixed HostFunctionContext.swift (@unchecked Sendable)');
}

// 10. Fix HostObjectContext.swift (Unmanaged runtime needs @unchecked Sendable)
const hostObjPath = 'node_modules/expo-modules-jsi/apple/Sources/ExpoModulesJSI/Contexts/HostObjectContext.swift';
if (fs.existsSync(hostObjPath)) {
  let content = fs.readFileSync(hostObjPath, 'utf8');
  content = content.replace(/class\s+HostObjectContext:\s*HostCallbackContext,\s*Sendable/g, 'class HostObjectContext: HostCallbackContext, @unchecked Sendable');
  fs.writeFileSync(hostObjPath, content, 'utf8');
  console.log('Fixed HostObjectContext.swift (@unchecked Sendable)');
}

// 11. Fix JavaScriptExecutor in JavaScriptActor.swift
const jsActorPath = 'node_modules/expo-modules-jsi/apple/Sources/ExpoModulesJSI/Runtime/JavaScriptActor.swift';
if (fs.existsSync(jsActorPath)) {
  let content = fs.readFileSync(jsActorPath, 'utf8');
  content = content.replace(/internal\s+(?:final\s+)?class\s+JavaScriptExecutor:\s*SerialExecutor(?:\s*,\s*@unchecked\s*Sendable)?/g, 'internal class JavaScriptExecutor: SerialExecutor, @unchecked Sendable');
  fs.writeFileSync(jsActorPath, content, 'utf8');
  console.log('Fixed JavaScriptActor.swift (internal class JavaScriptExecutor: SerialExecutor, @unchecked Sendable)');
}

console.log('All Expo patches applied successfully.');
