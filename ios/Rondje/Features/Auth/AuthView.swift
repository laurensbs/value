import SwiftUI

struct AuthView: View {
    enum Mode: String, Identifiable { case signIn, signUp; var id: String { rawValue } }

    @State var mode: Mode
    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss
    @Environment(\.openURL) private var openURL

    @State private var name = ""
    @State private var email = ""
    @State private var password = ""
    @State private var busy = false
    @State private var error: String?
    @FocusState private var focus: Field?

    private enum Field { case name, email, password }

    private var valid: Bool {
        email.contains("@") && password.count >= 8 && (mode == .signIn || !name.trimmingCharacters(in: .whitespaces).isEmpty)
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    Text(mode == .signIn ? "Welkom terug" : "Doe mee met \(Brand.name)")
                        .font(.display(30))
                    Text(mode == .signIn ? "Log in met je e-mailadres." : "Een account is gratis en blijft gratis.")
                        .foregroundStyle(Palette.muted)

                    VStack(spacing: 12) {
                        if mode == .signUp {
                            field("Voornaam", text: $name, field: .name)
                                .textContentType(.givenName)
                                .submitLabel(.next)
                        }
                        field("E-mailadres", text: $email, field: .email)
                            .textContentType(.emailAddress)
                            .keyboardType(.emailAddress)
                            .textInputAutocapitalization(.never)
                            .autocorrectionDisabled()
                            .submitLabel(.next)
                        SecureField("Wachtwoord (minstens 8 tekens)", text: $password)
                            .textContentType(mode == .signIn ? .password : .newPassword)
                            .focused($focus, equals: .password)
                            .submitLabel(.go)
                            .padding(16)
                            .background(Palette.surface, in: .rect(cornerRadius: 16, style: .continuous))
                    }
                    .onSubmit {
                        switch focus {
                        case .name: focus = .email
                        case .email: focus = .password
                        default: Task { await submit() }
                        }
                    }

                    ErrorText(message: error)

                    Button {
                        Task { await submit() }
                    } label: {
                        if busy { ProgressView().tint(Palette.onGrass) } else { Text(mode == .signIn ? "Inloggen" : "Account maken") }
                    }
                    .buttonStyle(.primary)
                    .disabled(!valid || busy)

                    if mode == .signIn {
                        Button("Wachtwoord vergeten?") { openURL(Brand.web("/forgot-password")) }
                            .font(.subheadline)
                            .frame(maxWidth: .infinity)
                    } else {
                        Text("Met een account ga je akkoord met de voorwaarden en de gedragscode. Die lees je zo meteen, bij het maken van je profiel.")
                            .font(.footnote)
                            .foregroundStyle(Palette.muted)
                    }

                    Divider().padding(.vertical, 4)
                    Button(mode == .signIn ? "Nog geen account? Maak er een" : "Al een account? Log in") {
                        withAnimation(.snappy) { mode = mode == .signIn ? .signUp : .signIn; error = nil }
                    }
                    .font(.subheadline.weight(.semibold))
                    .frame(maxWidth: .infinity)
                }
                .padding(24)
                .animation(.snappy, value: error)
            }
            .screenBackground()
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Sluit", systemImage: "xmark") { dismiss() }
                }
            }
            .onAppear { focus = mode == .signUp ? .name : .email }
        }
    }

    private func field(_ title: String, text: Binding<String>, field: Field) -> some View {
        TextField(title, text: text)
            .focused($focus, equals: field)
            .padding(16)
            .background(Palette.surface, in: .rect(cornerRadius: 16, style: .continuous))
    }

    private func submit() async {
        guard valid, !busy else { return }
        busy = true
        error = nil
        defer { busy = false }
        do {
            let mail = email.trimmingCharacters(in: .whitespaces).lowercased()
            if mode == .signIn {
                try await APIClient.shared.signIn(email: mail, password: password)
            } else {
                try await APIClient.shared.signUp(name: name.trimmingCharacters(in: .whitespaces), email: mail, password: password)
            }
            password = ""
            dismiss()
            await model.signedIn()
        } catch {
            Haptics.error()
            self.error = error.localizedDescription
        }
    }
}
