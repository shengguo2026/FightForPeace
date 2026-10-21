# Fight for Peace — Network Play, Anti-Piracy and Paid-User Authentication

**Date:** 2026-10-21
**Status:** Advice for discussion. Nothing here is implemented, and nothing is decided until you confirm.

## 1. Two ways to play together

You described the two approaches correctly. Both use the same idea: one player creates a **room** and gets a **room code**, and the other player joins with it. They differ in where the room lives.

| | **Local (LAN) mode** — build first | **Online mode** — later |
|---|---|---|
| Where the room lives | A small server program running **on the host player's computer** | A server you deploy on the internet |
| How the guest joins | Types the host's **local IP, port and room code** (for example `192.168.1.23 : 7350 : K7Q2`) | Types just the **room code** (logged in as a paid user) |
| Internet needed | No, only the same Wi-Fi/LAN | Yes |
| Hosting cost | None | A small monthly cost |

Because the room protocol is the same in both modes, the game's network code only needs a pluggable **transport** underneath. Moving from local to online later swaps the transport and the server address. The lockstep gameplay code stays the same.

### 1.1 A browser restriction that affects local mode

Browsers only enable some features on pages loaded from `localhost` or `https://`. These are called "secure contexts". A page opened from a plain `http://192.168.x.x` address loses some of them, notably the crypto functions we use for save checksums, the Web Locks API (one tab writing a profile), persistent storage, and, in some browsers, gamepad access.

So the question is **how the guest's browser loads the game**:

| Option | How it works | Pros | Cons |
|---|---|---|---|
| **A ★** | **Each player runs the game on their own computer** (`pnpm start` → `http://localhost:…`). The guest's join screen asks for the host's IP, port and room code, then connects to the host's room server. | All browser features work. It matches how a commercial copy works, where every player owns the game. | The guest needs the game installed too. |
| B | The guest opens the **host's address** in the browser (`http://192.168.1.23:5173`) and plays from the host's copy. | Nothing to install on the guest machine. | Loses secure-context features unless the host serves HTTPS with a local certificate, which means a browser warning or installing a certificate on both machines. |

I recommend **A**. B can remain a developer convenience for quick tests.

### 1.2 What the local server does

A small Node.js program started together with the game on the host (`pnpm start --host-room`, later a button in the lobby):

1. It listens on a port (default `7350`), shows the host's LAN IP and generates a 4–6-character room code.
2. It accepts the guest when the code matches, then runs the lobby checks we confirmed (game version, rules hash, content manifest, cheat registry).
3. It carries the frame-stamped inputs between the two players.

On the first start, **Windows Firewall** asks whether Node.js may accept connections. The player must allow **private networks**. The game will show this hint.

### 1.3 Which connection carries the gameplay

| Phase | Transport | Why |
|---|---|---|
| **Local mode, first version** | **WebSocket** through the host's room server | Simplest to build and debug. On a home LAN it adds only 1–3 ms. |
| Later (local and online) | **WebRTC data channel** directly between the players, with the room server only used to introduce them | Unordered, unreliable packets handle Wi-Fi packet loss better, and an online server never carries gameplay traffic, so it stays cheap. |

This changes decision D9 slightly: the confirmed pairing models (room code, QR/copy-paste fallback) become **"LAN room server with IP + port + room code" first**, then **online room codes**, with WebRTC added after the first local version. I will update the roadmap's M12 if you agree.

---

## 2. Anti-piracy for the local version

**An honest basic fact first.** Any game that runs on the player's computer, browser or desktop, can eventually be copied by a determined person. Whatever the game needs to run, including any decryption key, has to be on that computer at some point. Anti-piracy therefore aims to **make copying inconvenient and keep honest buyers honest**, not to make it impossible.

**About encrypting the game with a code.** If the files are encrypted once and every buyer gets a code that decrypts them, then **every buyer has the same key**. Sharing one code shares the game, so it is only as strong as approach 1 below. Encryption becomes useful only when combined with per-buyer licences (approach 2) or a server that controls access (approach 3).

### Approach 1 — Signed offline licence key (easiest)

- When someone buys, your shop generates a **licence file or key** containing, for example, the buyer's name or email and the purchase date. It is **digitally signed** with your private key (Ed25519).
- The game contains only the matching **public key**. It checks the signature at start-up and refuses to run without a valid licence. Nobody can create a valid key without your private key.
- The buyer's name is shown on the title screen ("Licensed to …"), so sharing a key means sharing one's identity.
- **Strength:** low to moderate. It stops casual copying and key generators, but a shared licence file works everywhere, and the check can be removed by someone who edits the JavaScript.
- **Effort:** small (days). No server needed, and it works fully offline.

### Approach 2 — Online activation with device binding (balanced)

- The buyer enters a licence key once. The game sends it to a small **licence server**, which checks that the key was sold and has activations left (for example, 3 devices).
- The server returns a **signed licence bound to that device** (an install ID stored on the device). The game verifies it offline from then on and re-checks occasionally, for example every 30 days, with a generous offline grace period.
- Optionally, the **paid content bundles** (stages after a free demo stage) are encrypted, and the per-device licence carries the key to unlock them.
- The JavaScript is **obfuscated and minified** to slow down tampering.
- **Strength:** moderate. Mass sharing of one key stops working because activations run out, and leaked keys can be revoked. A dedicated cracker can still patch the check.
- **Effort:** medium (2–4 weeks), plus a small server, which can be the same one used later for online mode.

### Approach 3 — Store platform or server-controlled content (safest)

Either of these, or both:

- **Sell through a store with built-in protection**, mainly **Steam**. The same web game is wrapped as a desktop app (with **Electron**, which Steamworks integrations support well, or the lighter Tauri) and uses Steam's ownership check and session tickets. Steam also provides payment, VAT handling, updates, achievements and cloud saves, and solves the browser storage and gamepad issues. **itch.io** is a simpler alternative with weaker protection.
- **Keep critical content on a server:** stages are downloaded only by authenticated paid users, with per-user short-lived keys, and nothing is stored unencrypted.
- **Strength:** the highest practical level, and still crackable in the end. Steam's built-in DRM is light, but the convenience of the store reduces piracy far more than technical protection does.
- **Effort:** medium to high, plus Steam's one-time fee per game (USD 100) and its revenue share.

### My recommendation

For a commercial release, plan on **Approach 3 via Steam** (a desktop build of the same game) as the main channel, and use **Approach 2** for a direct browser or desktop version sold from your own website. Build none of it now. The only thing the architecture needs today is a placeholder **licence adapter** in the platform layer, which always answers "licensed" during development, so either approach can be added later without touching the game's code.

---

## 3. Authenticating paid users in online mode

The recommended setup has four parts, each a standard service rather than something built from scratch:

| Part | Role | Example services |
|---|---|---|
| **Payment** | Takes the money and issues the purchase. A *merchant of record* also handles EU VAT, invoices and refunds for you, which matters when selling from Germany. | **Paddle** or **Lemon Squeezy** (merchant of record); Stripe (you handle VAT yourself) |
| **Accounts** | Login with email or Google/Apple, password reset, account deletion (GDPR). | Supabase Auth, Clerk, Auth0, Firebase Auth |
| **Entitlements** | A database row "user X owns *Fight for Peace*", written automatically by the payment provider's webhook after a purchase. | The same database as accounts (for example Supabase Postgres) |
| **Game server check** | Every request to create or join a room, or to download paid content, carries a short-lived login token (JWT). The server verifies it and the entitlement before allowing it. | Cloudflare Worker (as recommended for hosting earlier) |

The flow is: buy (Paddle) → webhook marks the account as owner → the player logs in → the game receives a token → the room server and content downloads accept only valid owner tokens.

If the game sells on Steam, Steam login replaces the accounts and payment parts: the game obtains a **Steam session ticket**, and the room server verifies it with Steam's Web API.

Privacy: accounts mean personal data, so you will need a privacy policy and GDPR-compliant handling (data export and deletion). Most of the listed services offer EU data hosting. This is general guidance, not legal advice. Have a tax advisor confirm the VAT and business setup before selling.

---

## 4. What I propose to change in the plan now

1. **Roadmap M12** becomes "LAN co-op: host room server (IP + port + room code), WebSocket lockstep", and WebRTC and online rooms move to after the slice.
2. **Platform layer** gets a `LicenseAdapter` interface (development build: always licensed) and a `Transport` interface (WebSocket first) from the start. That costs a few lines of code.
3. **Node.js:** the plan targets **Node 24**, matching your machine (CI tests on Node 24 as well).
4. No anti-piracy, payments or accounts work until after the vertical slice.
