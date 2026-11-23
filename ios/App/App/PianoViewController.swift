import Capacitor
import Foundation

class PianoViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(PianoMidiPlugin())
        bridge?.registerPluginInstance(PianoAudioPlugin())
        bridge?.registerPluginInstance(PianoAuthConfigurationPlugin())
    }
}

// Google Sign-In raises an Objective-C exception when its callback scheme is
// missing. Reject the JS call before entering the SDK so the app stays open.
@objc(PianoAuthConfigurationPlugin)
public class PianoAuthConfigurationPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "PianoAuthConfigurationPlugin"
    public let jsName = "PianoAuthConfiguration"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "validate", returnType: CAPPluginReturnPromise)
    ]

    @objc func validate(_ call: CAPPluginCall) {
        guard let url = Bundle.main.url(forResource: "GoogleService-Info", withExtension: "plist"),
              let data = try? Data(contentsOf: url),
              let config = (try? PropertyListSerialization.propertyList(from: data, format: nil)) as? [String: Any],
              let clientID = config["CLIENT_ID"] as? String,
              clientID.hasSuffix(".apps.googleusercontent.com"),
              clientID != "1234567890-example.apps.googleusercontent.com",
              let reversedClientID = config["REVERSED_CLIENT_ID"] as? String,
              reversedClientID == clientID.components(separatedBy: ".").reversed().joined(separator: "."),
              let bundleID = config["BUNDLE_ID"] as? String,
              bundleID == Bundle.main.bundleIdentifier,
              let projectID = config["PROJECT_ID"] as? String,
              projectID == call.getString("projectId"),
              let urlTypes = Bundle.main.object(forInfoDictionaryKey: "CFBundleURLTypes") as? [[String: Any]],
              urlTypes.contains(where: {
                  ($0["CFBundleURLSchemes"] as? [String])?.contains(reversedClientID) == true
              }) else {
            call.reject("Google sign-in configuration is incomplete. Sync and rebuild the iOS app.", "ios/auth-configuration")
            return
        }
        call.resolve()
    }
}
