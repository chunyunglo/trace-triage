import Foundation
import FoundationModels

// Reads JSON lines {"id":..., "text":...} on stdin, writes {"id","immediate","p","ms"} lines.
@Generable
struct Assessment {
    @Guide(description: "傷員是否需要立即處置（START 紅色）")
    var immediate: Bool
    @Guide(description: "需要立即處置的機率，0 到 1", .range(0.0...1.0))
    var probability: Double
}

let instructions = CommandLine.arguments.count > 1 ? CommandLine.arguments[1] : ""
let model = SystemLanguageModel.default
guard case .available = model.availability else {
    FileHandle.standardError.write("unavailable: \(model.availability)\n".data(using: .utf8)!)
    exit(2)
}
while let line = readLine() {
    guard let data = line.data(using: .utf8),
          let obj = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
          let id = obj["id"] as? String, let text = obj["text"] as? String else { continue }
    let session = LanguageModelSession(instructions: instructions)
    let t0 = Date()
    var out: [String: Any] = ["id": id]
    do {
        let r = try await session.respond(to: text, generating: Assessment.self,
                                          options: GenerationOptions(sampling: .greedy))
        out["immediate"] = r.content.immediate
        out["p"] = r.content.probability
    } catch {
        out["error"] = "\(error)"
    }
    out["ms"] = Date().timeIntervalSince(t0) * 1000
    let s = try! JSONSerialization.data(withJSONObject: out)
    print(String(data: s, encoding: .utf8)!)
    fflush(stdout)
}
