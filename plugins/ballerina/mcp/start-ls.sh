#!/bin/bash
# Starts the Ballerina Language Server using the local build.
# Always uses LOCAL_BAL_LS_BUILD (set in .mcp.json or server.js fallback).
# Replaces the shipped flow-model-generator-ls-extension jar with the local
# build so CopilotLibraryService is available.

LOCAL_JAR="${LOCAL_BAL_LS_JAR:-}"
LOCAL_LS_BUILD="${LOCAL_BAL_LS_BUILD:-}"

# Resolve BAL_HOME from the installed bal distribution
BAL_BIN=$(dirname "$(which bal)")
BAL_ROOT="$BAL_BIN/.."
BAL_VERSION=$(cat "$BAL_ROOT/distributions/ballerina-version" 2>/dev/null)
BAL_HOME="$BAL_ROOT/distributions/$BAL_VERSION"

LS_LIB="$BAL_HOME/lib/tools/lang-server/lib"
BRE_LIB="$BAL_HOME/bre/lib"
JAVA_CMD="$BAL_HOME/../dependencies/jdk-21.0.5+11-jre/bin/java"
[ ! -x "$JAVA_CMD" ] && JAVA_CMD="java"

if [ -z "$LOCAL_JAR" ] || [ ! -f "$LOCAL_JAR" ]; then
  echo "[start-ls] ERROR: LOCAL_BAL_LS_JAR not set or file not found: $LOCAL_JAR" >&2
  exit 1
fi

# Launcher jar must be first
LAUNCHER_JAR=$(ls "$LS_LIB"/language-server-stdio-launcher-*.jar 2>/dev/null | head -1)
CP="$LAUNCHER_JAR:$LOCAL_JAR"

# Add other local build jars (core, central-client, index-generator, commons)
if [ -n "$LOCAL_LS_BUILD" ]; then
  for jar in \
    "$LOCAL_LS_BUILD/flow-model-generator/modules/flow-model-generator-core/build/libs/flow-model-generator-core-"*.jar \
    "$LOCAL_LS_BUILD/flow-model-generator/modules/flow-model-central-client/build/libs/flow-model-central-client-"*.jar \
    "$LOCAL_LS_BUILD/flow-model-generator/modules/flow-model-index-generator/build/libs/flow-model-index-generator-"*.jar \
    "$LOCAL_LS_BUILD/model-generator-commons/build/libs/model-generator-commons-"*.jar; do
    [ -f "$jar" ] && CP="$CP:$jar"
  done

  # Add nightly ballerina-lang jars from Gradle cache before bre/lib.
  # The local build targets a nightly snapshot whose API may differ from the installed release.
  LANG_VER=$(grep "^ballerinaLangVersion=" "$LOCAL_LS_BUILD/gradle.properties" 2>/dev/null | cut -d= -f2 | tr -d '[:space:]')
  if [ -n "$LANG_VER" ]; then
    GRADLE_CACHE="$HOME/.gradle/caches/modules-2/files-2.1"
    for jar in "$GRADLE_CACHE/org.ballerinalang"/*/"$LANG_VER"/*/*.jar; do
      [ -f "$jar" ] && CP="$CP:$jar"
    done
    for jar in "$GRADLE_CACHE/com.github.zafarkhaja/java-semver"/*/*.jar; do
      [ -f "$jar" ] && CP="$CP:$jar"
    done
  fi
fi

# Add shipped LS jars (skip flow-model-generator and launcher — already added)
for jar in "$LS_LIB"/*.jar; do
  case "$jar" in
    *flow-model-generator*) ;;
    *language-server-stdio-launcher*) ;;
    *) CP="$CP:$jar" ;;
  esac
done

# Add bre/lib (release ballerina-lang jars — nightly overrides already earlier in CP)
for jar in "$BRE_LIB"/*.jar; do
  CP="$CP:$jar"
done

# Fallback java-semver from debug-adapter lib
DEBUG_LIB="$BAL_HOME/lib/tools/debug-adapter/lib"
for jar in "$DEBUG_LIB"/java-semver-*.jar; do
  [ -f "$jar" ] && CP="$CP:$jar"
done

exec "$JAVA_CMD" \
  -Dballerina.home="$BAL_HOME" \
  -cp "$CP" \
  org.ballerinalang.langserver.launchers.stdio.Main
