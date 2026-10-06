# TraceX — Winning Hackathon Pitch & Live Demo Script

> **Tagline:** *"From Digital Evidence to Investigation Story"*  
> **Target Audience:** Hackathon Judges, DFIR Investigators, Cybersecurity Leads, Legal Tech Evaluators  
> **Estimated Presentation Time:** 3 to 5 Minutes  
> **Demo Case:** `CASE-2024-001` (Insider Data Exfiltration via Removable Media)

---

## 1. Quick Reference: Demo Credentials & Commands

| Component | URL / Command | Credentials / Notes |
| :--- | :--- | :--- |
| **Frontend UI** | `http://localhost:5176` (or `http://localhost:5173`) | Fast React + Vite Client |
| **Backend API** | `http://127.0.0.1:8000/docs` | FastAPI Swagger Documentation |
| **Default Login** | Investigator Role | `investigator@tracex.local` / `Investigator123!` |
| **Admin Login** | Administrative Access | `admin@tracex.local` / `Admin123!` |
| **Standalone CLI** | `python verify.py` | Court-admissible offline verification tool |
| **Reset Vault** | Topbar **"↺ Reseed"** button or `python backend/seed.py` | Instantly resets demo to clean state |

---

## 2. The 3-Minute Hackathon Pitch (Verbatim Script)

### [0:00 - 0:45] The Hook: The Digital Forensics Crisis
> *"Good morning judges. In high-stakes cyber investigations and insider threat incidents, incident responders face a brutal dilemma:*  
> *They spend days or weeks sifting through thousands of fragmented event logs, raw file bytes, and disk images. But even worse: **a single missing hash, an unrecorded handoff, or an unexplainable AI prediction can cause critical evidence to be thrown out of court under Federal Rules of Evidence Rule 901/902**.*  
> 
> *Today, investigators either rely on low-level tools that produce overwhelming spreadsheets, or modern tools with black-box AI scores that cannot be defended on the witness stand.*  
> 
> *We built **TraceX** — an enterprise Digital Forensics platform that transforms raw digital evidence into a structured, explainable, and cryptographically indisputable **Investigation Story**."*

---

### [0:45 - 1:15] The Core Architecture & Forensic Rigor
> *"TraceX does three things that conventional SIEMs and forensic viewers cannot do:*  
> 
> 1. ***Absolute Evidence Safety:*** *Every uploaded artifact is handled in an immutable read-only storage vault with hardware write-blocker emulation and magic-byte mismatch detection.*  
> 2. ***Deterministic Correlation without Hallucinations:*** *Our correlation engine chronologically reconstructs multi-source telemetry into 5 operational attack phases, flags timestomping anomalies, and provides a 5-point Provenance Trace for every single finding.*  
> 3. ***Cryptographic Tamper-Evidence:*** *We implement deterministic binary Merkle Trees (RFC 6962) and a hash-linked Chain of Custody ledger. If so much as a single bit changes in any evidence file, the entire cryptographic tree shatters."*

---

### [1:15 - 2:30] The Live Demonstration (The 5 Key Moments)
*(Proceed through the Click-by-Click Demo Flow below)*

---

### [2:30 - 3:00] The Closing: Court Admissibility & Impact
> *"To prove that TraceX is not just a UI mock, we don't even need the web browser to verify evidence. We provide an independent, standalone Python CLI verifier that defense attorneys, prosecution experts, and third-party auditors can run on cold storage to verify all hashes, Merkle trees, and custody blocks in seconds.*  
> 
> *TraceX bridges the gap between deep forensic bits and executive decision-making: **From Digital Evidence to Investigation Story**.*  
> *Thank you, and we welcome your questions!"*

---

## 3. Step-by-Step Live Demo Click Path

Follow this exact path for a smooth, high-impact demonstration:

```
[Dashboard] ──> [Evidence Vault] ──> [Timeline Phases] ──> [Findings / Why?] ──> [Integrity Climax] ──> [Reports & CLI]
```

### Stop 1: The Investigation Command Center (`/`)
- **What to show:**
  - High-Level Case Header: `CASE-2024-001` (Insider Exfiltration).
  - Multi-Dimensional Risk Score (`87/100 - CRITICAL`).
  - Emphasize the metric cards: Total Evidence (11 items), Timeline Events (14 events), Verified Hashes (100%).
- **What to say:**
  > *"When an investigator opens a case, TraceX immediately aggregates the forensic posture into a 100-point multi-dimensional risk score calculated from observed temporal anomalies, privilege escalations, and unapproved device connections."*

---

### Stop 2: Read-Only Evidence Vault & Magic-Byte Mismatch (`/evidence`)
- **Action:** Click **"Evidence Vault"** on the sidebar.
- **Action:** Click on `suspicious.exe` or `confidential.pdf` to open the slide-out **Evidence Drawer**.
- **What to point out:**
  1. The **"Hardware Write-Blocker Emulated"** & **"Immutable Read-Only"** badge.
  2. The exact **SHA-256** and **MD5** hashes.
  3. The **File Extension vs Magic-Byte Inspection**: Show how TraceX inspects binary magic bytes (`MZ` for PE executables, `%PDF-` for PDFs) to detect executables disguised as documents or logs.
- **What to say:**
  > *"Rule number one of forensic science: Never alter the original evidence. TraceX enforces read-only storage and immediately performs binary magic-byte inspection to catch masked executables attempting to evade basic file filters."*

---

### Stop 3: Timeline & 5 Forensic Activity Phases (`/timeline`)
- **Action:** Click **"Timeline"** on the sidebar.
- **What to point out:**
  1. Scroll down to show the **"Forensic Activity Phases"** collapsible accordion:
     - *Phase 1: Initial Vector / Ingress* (USB Mass Storage inserted)
     - *Phase 2: Privilege Escalation & Discovery*
     - *Phase 3: Sensitive Asset Access & Staging* (`confidential.pdf` copied to unindexed folder)
     - *Phase 4: Exfiltration / Transfer*
     - *Phase 5: Anti-Forensics & Cleanup* (Audit logs wiped)
  2. Show the **Timestamp Anomaly Alert**: Points out potential timestomping where modified timestamp precedes creation time.
- **What to say:**
  > *"Instead of scrolling through 50,000 unorganized event logs, TraceX automatically correlates events into 5 standard DFIR operational phases. It also flags timestomping anomalies where an attacker manipulated filesystem timestamps."*

---

### Stop 4: Advanced Explainability & Provenance Trace (`/findings`)
- **Action:** Click **"Findings"** on the sidebar.
- **Action:** Find the top finding: *"Unauthorized USB Device Connected Followed by Document Access"*.
- **Action:** Click the cyan **`[Why?]`** button right next to the severity badge.
- **What to point out in the Modal:**
  - **1. Observed Artifact Phenomenon**: Exact USB serial number and NTFS file read handle.
  - **2. Applied DFIR Rule**: Deterministic temporal proximity (< 180s between attachment and file read).
  - **3. Cryptographic Linkage**: Specific artifact SHA-256 and MITRE Technique (`T1052.001 - Exfiltration Over Physical Medium`).
  - **4. DFIR Interpretation**: Objective forensic phrasing, not unsubstantiated accusation.
  - **5. Recommended Next Step**: What the examiner should inspect next.
- **What to say:**
  > *"Many AI tools give scores that are unexplainable in court. Notice our `[Why?]` button: TraceX provides a complete 5-point Provenance Trace showing the exact rule, exact timestamps, and MITRE mapping. Zero hallucination. 100% court-defensible."*

---

### Stop 5: THE SHOWSTOPPER — Merkle Root & Live Tamper Simulation (`/integrity`)
*(This is the most impressive 45 seconds of your demo!)*

- **Action:** Click **"Integrity & Hashes"** on the sidebar.
- **What to show first:**
  - Case Merkle Root card: Shows deterministic RFC 6962 root digest `609505c1a709...` (Green badge: **VERIFIED**).
  - Chain of Custody card: 8 Sequential blocks linked by cryptographic hashes.
  - Click **"Inspect Tree Proof"**: Reveal the tree height and leaf specifications.
  - Click **"View Custody Ledger"**: Show Block #1 $\to$ Block #2 $\to$ Block #8, each referencing $H_{n-1}$.
- **THE CLIMAX MOMENT:**
  - Click the amber **"Simulate Tamper"** button!
  - **Observe the UI change:**
    - `confidential.pdf` immediately flips to **COMPROMISED** (red badge).
    - Merkle Root updates to an invalid hash with an amber **TAMPERED** warning.
    - Chain of Custody flags Block #3 as **BROKEN CHAIN LINK**.
- **What to say:**
  > *"Watch what happens if someone tampers with evidence on the server. I'll simulate a 1-bit change in `confidential.pdf`. Instantly, the deterministic Merkle Tree invalidates, the root changes, and Block #3 in the Chain of Custody ledger breaks its backward hash pointer. Tampering is mathematically impossible to hide."*
- **Action:** Click **"Restore Demo State"** to restore everything to green **VERIFIED**.

---

### Stop 6: Self-Verifying Forensic Dossier (`/reports`)
- **Action:** Click **"Reports"** on the sidebar.
- **What to point out:**
  - Section 02 includes the **Case Merkle Root** and **Chain of Custody Verification Status**.
  - Section 08 displays the **Canonical SHA-256 Report Seal**.
  - Click **"Verify Report Cryptographic Seal"**: A green verification banner confirms bit-for-bit authenticity against the case ledger.
- **What to say:**
  > *"When exporting the final forensic report, TraceX embeds the Case Merkle Root and seals the entire dossier with a digital SHA-256 digest that can be independently re-verified at any time."*

---

### Stop 7: The Final Punch — Standalone CLI Verification (`verify.py`)
- **Action:** Switch to terminal / VS Code terminal.
- **Command:**
  ```powershell
  python verify.py
  ```
- **What to point out:**
  - Terminal prints the 4-stage integrity audit table with green/white `[PASS]` tags:
    1. *Digital Evidence Vault Hash Integrity* (11/11 artifacts verified)
    2. *Evidence Set Merkle Root Calculation* (Deterministic RFC 6962 root verified)
    3. *Tamper-Evident Chain of Custody* (All 8 blocks verified)
    4. *Forensic Report Cryptographic Seal* (Verified)
  - Final Verdict: `[VERIFIED] ALL CHECKS PASSED (COURT-ADMISSIBLE)`.
- **What to say:**
  > *"And finally, to eliminate any doubt that this relies on our web UI, any external defense or prosecution expert can run our standalone Python CLI verifier directly against cold storage. It validates the entire case cryptographically in under 2 seconds."*

---

## 4. Judge Q&A Cheat Sheet (Winning Answers)

### Q1: "Does TraceX execute uploaded malware or suspicious files?"
> **Answer:** *"Absolutely not. TraceX strictly follows ISO/IEC 27037 standards for digital evidence handling. Artifacts are mounted in an immutable, read-only storage container with hardware write-blocker emulation. Analysis is strictly non-destructive: we extract static metadata, PE headers, and magic bytes, but never execute binaries or scripts."*

### Q2: "Why did you use a Merkle Tree instead of just calculating a hash of the case folder?"
> **Answer:** *"Hashing a folder has two major flaws: first, directory structures and metadata vary across operating systems. Second, if a case has 10,000 files and you need to prove in court that File #412 was not altered, a folder hash requires re-hashing all 10,000 files. With our RFC 6962 deterministic binary Merkle Tree, we can provide a compact $O(\log N)$ cryptographic proof of inclusion for any individual artifact without exposing the rest of the evidence set."*

### Q3: "How do you explain your AI / risk scores if a defense lawyer challenges you?"
> **Answer:** *"We intentionally designed TraceX to avoid black-box probabilistic hallucinations. Our triage score is calculated deterministically across 6 auditable dimensions (Findings, Correlation, Anomalies, Evidence, Timeline, and Integrity). Furthermore, every finding has a clickable Provenance Trace that details the exact trigger rule, the supporting file hashes, and the temporal window. Any forensic examiner can manually replicate our exact results."*

### Q4: "What happens if an adversary gets root access to the PostgreSQL database?"
> **Answer:** *"Even if an attacker directly edits rows in the database, they cannot forge the cryptographic linkage without the private keys. In our Chain of Custody ledger, Block $N$ includes the SHA-256 hash of Block $N-1$. If they modify or delete a row, the downstream hashes immediately fail mathematical validation. Furthermore, our `verify.py` script checks the raw disk hashes against the ledger, instantly exposing any database-level tampering."*

### Q5: "How does this compare to enterprise tools like EnCase, FTK, or Splunk?"
> **Answer:** *"EnCase and FTK are heavy forensic acquisition tools—they are great at carving disks, but they produce overwhelming, siloed evidence dumps that take days to analyze. Splunk is a log aggregator, but lacks forensic custody chain integrity. TraceX is the intelligence and storytelling layer that sits on top: it takes disparate outputs, correlates them into an attack sequence, enforces court-admissible custody, and generates a ready-to-present investigation dossier."*

---

## 5. Pre-Demo Checklist (60 Seconds Before Pitching)

- [ ] Backend is running on port 8000: `http://127.0.0.1:8000/docs`
- [ ] Frontend is running: `http://localhost:5176` (or `5173`)
- [ ] Browser zoom set to 90% or 100% for crisp display
- [ ] Reset demo to canonical state: Click **"↺ Reseed"** in topbar
- [ ] Terminal open at root directory with `python verify.py` pre-typed and ready to hit Enter
- [ ] Audio/mic checked for clear delivery
