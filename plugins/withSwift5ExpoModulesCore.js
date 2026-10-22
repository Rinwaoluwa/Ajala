/**
 * Builds the ExpoModulesCore pod in Swift 5 language mode.
 *
 * Its podspec asks for Swift 6, and Xcode 26's compiler reports two data-race
 * checks in `Core/Events/EventEmitter.swift` ("sending 'emitter' risks causing
 * data races") as hard errors in that mode, which stops the iOS build. In Swift 5
 * mode the same checks are warnings. expo-modules-core 57.0.23 is the newest
 * 57.x, so there is no upgrade that fixes it yet.
 *
 * `ios/` is generated, so the change rides on the Podfile's post_install hook
 * rather than being made by hand. Remove this plugin once an expo-modules-core
 * release builds cleanly under the current Xcode.
 */
const { withPodfile } = require('expo/config-plugins');

const MARKER = '# [withSwift5ExpoModulesCore]';

const SNIPPET = `
    ${MARKER} Swift 6 data-race errors under Xcode 26; see plugins/withSwift5ExpoModulesCore.js
    installer.pods_project.targets.each do |target|
      next unless target.name == 'ExpoModulesCore'
      target.build_configurations.each do |build_config|
        build_config.build_settings['SWIFT_VERSION'] = '5.0'
      end
    end`;

module.exports = function withSwift5ExpoModulesCore(config) {
  return withPodfile(config, (cfg) => {
    const podfile = cfg.modResults.contents;
    if (!podfile.includes(MARKER)) {
      cfg.modResults.contents = podfile.replace(
        /post_install do \|installer\|/,
        (hook) => `${hook}${SNIPPET}`,
      );
    }
    return cfg;
  });
};
