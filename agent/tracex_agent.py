import os
import sys
import time
import json
import hashlib
import platform
import getpass
import argparse
import difflib
import threading
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
import urllib.request
import urllib.error

# Watchdog for Windows Filesystem Monitoring
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

# PDF Text Extraction
try:
    import pypdf
except ImportError:
    pypdf = None


class TraceXAgent:
    def __init__(self, config_path: str = "config.json"):
        # Resolve config path
        if not os.path.isabs(config_path):
            base_dir = os.path.dirname(os.path.abspath(__file__))
            config_path = os.path.join(base_dir, config_path)
            
        self.config_path = config_path
        self.config = self.load_config()
        
        self.backend_url = self.config.get("backend_url", "http://127.0.0.1:8000/api")
        self.case_id = self.config.get("case_id", "CASE-2026-001")
        self.monitored_paths = self.config.get("monitored_paths", ["./monitored_evidence"])
        self.heartbeat_interval = self.config.get("heartbeat_interval_sec", 5)
        self.agent_version = self.config.get("agent_version", "v2.5.0-win64")
        
        # Local baseline cache
        baseline_dir = self.config.get("baseline_cache_dir", "./.tracex_baseline")
        if not os.path.isabs(baseline_dir):
            baseline_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), baseline_dir)
        self.baseline_dir = baseline_dir
        os.makedirs(self.baseline_dir, exist_ok=True)
        self.baseline_file = os.path.join(self.baseline_dir, "baseline_manifest.json")
        self.baseline_manifest = self.load_baseline_manifest()
        
        # Host metadata
        self.hostname = platform.node() or "WINDOWS-ENDPOINT"
        self.os_info = f"{platform.system()} {platform.release()} ({platform.version()})"
        self.user = getpass.getuser()
        
        self.is_running = False
        self.event_queue: List[Dict[str, Any]] = []
        self.lock = threading.Lock()
        self.total_events_sent = 0

    def load_config(self) -> Dict[str, Any]:
        if os.path.exists(self.config_path):
            try:
                with open(self.config_path, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception as e:
                print(f"[Agent Warning] Failed to read {self.config_path}: {e}. Using defaults.")
        return {}

    def load_baseline_manifest(self) -> Dict[str, Any]:
        if os.path.exists(self.baseline_file):
            try:
                with open(self.baseline_file, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception:
                pass
        return {}

    def save_baseline_manifest(self):
        try:
            with open(self.baseline_file, "w", encoding="utf-8") as f:
                json.dump(self.baseline_manifest, f, indent=2)
        except Exception as e:
            print(f"[Agent Warning] Failed to persist baseline manifest: {e}")

    def calculate_file_hash(self, file_path: str, max_retries: int = 5) -> Optional[str]:
        """
        Calculates SHA-256 hash of a file with retry backoff to handle Windows file locks.
        """
        if not os.path.isfile(file_path):
            return None
        
        for attempt in range(max_retries):
            try:
                sha256 = hashlib.sha256()
                with open(file_path, "rb") as f:
                    for chunk in iter(lambda: f.read(65536), b""):
                        sha256.update(chunk)
                return sha256.hexdigest()
            except (PermissionError, IOError):
                time.sleep(0.15 * (attempt + 1))
        return None

    def extract_pdf_pages_text(self, pdf_path: str) -> List[str]:
        """
        Extracts text page by page from a PDF file using pypdf.
        """
        if not pypdf or not os.path.exists(pdf_path):
            return []
        pages_text: List[str] = []
        try:
            reader = pypdf.PdfReader(pdf_path)
            for page in reader.pages:
                text = page.extract_text() or ""
                pages_text.append(text)
        except Exception as e:
            print(f"[Agent Warning] Error extracting text from {pdf_path}: {e}")
        return pages_text

    def compare_pdf_content(self, baseline_pdf_path: str, modified_pdf_path: str) -> Dict[str, Any]:
        """
        Compares baseline and modified PDF files page by page using difflib.
        """
        base_pages = self.extract_pdf_pages_text(baseline_pdf_path)
        mod_pages = self.extract_pdf_pages_text(modified_pdf_path)
        
        max_pages = max(len(base_pages), len(mod_pages))
        changed_pages: List[int] = []
        pages_diff: List[Dict[str, Any]] = []
        total_additions = 0
        total_deletions = 0
        
        for i in range(max_pages):
            page_num = i + 1
            b_text = base_pages[i] if i < len(base_pages) else ""
            m_text = mod_pages[i] if i < len(mod_pages) else ""
            
            b_lines = [l.strip() for l in b_text.splitlines() if l.strip()]
            m_lines = [l.strip() for l in m_text.splitlines() if l.strip()]
            
            matcher = difflib.SequenceMatcher(None, b_lines, m_lines)
            diff_lines: List[Dict[str, Any]] = []
            added: List[str] = []
            removed: List[str] = []
            
            for tag, i1, i2, j1, j2 in matcher.get_opcodes():
                if tag == 'equal':
                    for line in b_lines[i1:i2]:
                        diff_lines.append({"type": "unchanged", "text": line})
                elif tag == 'replace':
                    for line in b_lines[i1:i2]:
                        diff_lines.append({"type": "removed", "text": line})
                        removed.append(line)
                        total_deletions += 1
                    for line in m_lines[j1:j2]:
                        diff_lines.append({"type": "added", "text": line})
                        added.append(line)
                        total_additions += 1
                elif tag == 'delete':
                    for line in b_lines[i1:i2]:
                        diff_lines.append({"type": "removed", "text": line})
                        removed.append(line)
                        total_deletions += 1
                elif tag == 'insert':
                    for line in m_lines[j1:j2]:
                        diff_lines.append({"type": "added", "text": line})
                        added.append(line)
                        total_additions += 1
                        
            page_has_changes = len(added) > 0 or len(removed) > 0 or (b_text != m_text)
            if page_has_changes:
                changed_pages.append(page_num)
                
            pages_diff.append({
                "page_number": page_num,
                "has_changes": page_has_changes,
                "baseline_text": b_text,
                "modified_text": m_text,
                "added_lines": added,
                "removed_lines": removed,
                "diff_lines": diff_lines
            })
            
        has_overall_changes = len(changed_pages) > 0 or (len(base_pages) != len(mod_pages))
        summary = (
            f"Altered {len(changed_pages)} of {max_pages} pages ({total_additions} additions, {total_deletions} deletions)"
            if has_overall_changes else "Content matches baseline."
        )
        
        return {
            "has_changes": has_overall_changes,
            "total_pages_baseline": len(base_pages),
            "total_pages_modified": len(mod_pages),
            "changed_pages": changed_pages,
            "total_additions": total_additions,
            "total_deletions": total_deletions,
            "pages": pages_diff,
            "summary": summary
        }

    def process_file_event(self, event_type: str, file_path: str, original_path: Optional[str] = None):
        """
        Normalizes a filesystem event, calculates hashes, checks baseline,
        and generates the event payload.
        """
        norm_path = os.path.abspath(file_path)
        file_name = os.path.basename(norm_path)
        
        # Ignore agent baseline directory itself to prevent feedback loop
        if ".tracex_baseline" in norm_path or "baseline_manifest" in file_name:
            return
            
        ext = os.path.splitext(file_name)[1].lower()
        is_pdf = ext == ".pdf"
        file_size = 0
        sha256 = ""
        
        if event_type != "deleted" and os.path.exists(norm_path):
            try:
                file_size = os.path.getsize(norm_path)
            except Exception:
                pass
            sha256 = self.calculate_file_hash(norm_path) or ""
            
        now_iso = datetime.now(timezone.utc).isoformat()
        
        # Baseline tracking
        baseline_info = self.baseline_manifest.get(norm_path)
        baseline_sha256 = baseline_info.get("sha256") if baseline_info else None
        is_modified_from_baseline = False
        pdf_diff = None
        
        cached_baseline_copy = os.path.join(self.baseline_dir, f"base_{file_name}")
        
        if event_type == "created":
            if not baseline_info and sha256:
                # Capture baseline
                self.baseline_manifest[norm_path] = {
                    "file_name": file_name,
                    "sha256": sha256,
                    "first_seen": now_iso,
                    "cached_copy": cached_baseline_copy
                }
                self.save_baseline_manifest()
                baseline_sha256 = sha256
                # Save snapshot copy for diffing
                try:
                    with open(norm_path, "rb") as src, open(cached_baseline_copy, "wb") as dst:
                        dst.write(src.read())
                except Exception:
                    pass
                    
        elif event_type == "modified":
            if baseline_sha256 and sha256 and sha256 != baseline_sha256:
                is_modified_from_baseline = True
                
                # If PDF, perform deep content diffing against baseline copy
                if is_pdf and os.path.exists(cached_baseline_copy):
                    pdf_diff = self.compare_pdf_content(cached_baseline_copy, norm_path)
            elif not baseline_info and sha256:
                # Discovered existing file modified
                self.baseline_manifest[norm_path] = {
                    "file_name": file_name,
                    "sha256": sha256,
                    "first_seen": now_iso,
                    "cached_copy": cached_baseline_copy
                }
                self.save_baseline_manifest()
                baseline_sha256 = sha256
                try:
                    with open(norm_path, "rb") as src, open(cached_baseline_copy, "wb") as dst:
                        dst.write(src.read())
                except Exception:
                    pass
                    
        elif event_type == "deleted":
            if baseline_info:
                baseline_sha256 = baseline_info.get("sha256")
                is_modified_from_baseline = True

        event_payload = {
            "event_type": event_type,
            "file_path": norm_path,
            "original_path": os.path.abspath(original_path) if original_path else None,
            "file_name": file_name,
            "file_size": file_size,
            "file_extension": ext,
            "sha256_hash": sha256,
            "baseline_sha256": baseline_sha256,
            "is_modified_from_baseline": is_modified_from_baseline,
            "timestamp": now_iso,
            "user": self.user,
            "hostname": self.hostname,
            "case_id": self.case_id,
            "is_pdf": is_pdf,
            "pdf_diff": pdf_diff
        }

        print(f"[TraceX Agent] Event: {event_type.upper():<8} | File: {file_name} | SHA-256: {sha256[:12] if sha256 else 'N/A'}")
        if is_modified_from_baseline:
            print(f"  [!] BASELINE DIVERGENCE DETECTED on {file_name}")
            if is_pdf and pdf_diff:
                print(f"  [PDF DIFF] Changed Pages: {pdf_diff.get('changed_pages')} | {pdf_diff.get('summary')}")

        with self.lock:
            self.event_queue.append(event_payload)

    def send_http_request(self, endpoint: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Sends an HTTP POST request to the TraceX backend.
        """
        url = f"{self.backend_url.rstrip('/')}/{endpoint.lstrip('/')}"
        json_data = json.dumps(data).encode("utf-8")
        req = urllib.request.Request(
            url,
            data=json_data,
            headers={"Content-Type": "application/json", "Accept": "application/json"}
        )
        try:
            with urllib.request.urlopen(req, timeout=5) as response:
                if response.status in [200, 201, 202]:
                    return json.loads(response.read().decode("utf-8"))
        except urllib.error.URLError as e:
            return None
        except Exception:
            return None
        return None

    def register(self) -> bool:
        """
        Registers this agent endpoint with TraceX backend.
        """
        data = {
            "hostname": self.hostname,
            "ip_address": "127.0.0.1",
            "os_info": self.os_info,
            "current_user": self.user,
            "agent_version": self.agent_version,
            "monitored_paths": self.monitored_paths
        }
        res = self.send_http_request("/agent/register", data)
        if res and res.get("success"):
            print(f"[TraceX Agent] Connected to TraceX Backend: {self.backend_url}")
            print(f"  Host: {self.hostname} | User: {self.user} | OS: {self.os_info}")
            return True
        else:
            print(f"[TraceX Agent] Backend registration at {self.backend_url} was not acknowledged (Backend offline or starting up).")
            return False

    def heartbeat_worker(self):
        """
        Background heartbeat thread to maintain online status.
        """
        while self.is_running:
            self.send_http_request("/agent/heartbeat", {
                "hostname": self.hostname,
                "monitored_paths": self.monitored_paths,
                "events_count": self.total_events_sent
            })
            time.sleep(self.heartbeat_interval)

    def flush_events_worker(self):
        """
        Background flusher thread to securely transmit queued events to backend.
        """
        while self.is_running:
            events_to_send = []
            with self.lock:
                if self.event_queue:
                    events_to_send = list(self.event_queue)
                    self.event_queue.clear()

            if events_to_send:
                payload = {
                    "hostname": self.hostname,
                    "agent_version": self.agent_version,
                    "case_id": self.case_id,
                    "events": events_to_send
                }
                res = self.send_http_request("/agent/events", payload)
                if res and res.get("success"):
                    self.total_events_sent += len(events_to_send)
                    print(f"[TraceX Agent] Ingested {len(events_to_send)} events into Case {self.case_id}.")
                else:
                    # Put events back on queue if transmission failed
                    with self.lock:
                        self.event_queue = events_to_send + self.event_queue

            time.sleep(1.0)

    def start(self):
        """
        Starts filesystem observer on all configured monitored paths.
        """
        self.is_running = True
        self.register()

        # Start background threads
        hb_thread = threading.Thread(target=self.heartbeat_worker, daemon=True)
        hb_thread.start()

        flush_thread = threading.Thread(target=self.flush_events_worker, daemon=True)
        flush_thread.start()

        # Initialize filesystem observer
        observer = Observer()
        handler = AgentEventHandler(self)

        for path in self.monitored_paths:
            abs_p = os.path.abspath(path)
            os.makedirs(abs_p, exist_ok=True)
            observer.schedule(handler, abs_p, recursive=True)
            print(f"[TraceX Agent] Monitoring directory: {abs_p}")

        observer.start()
        print("[TraceX Agent] FileSystemWatcher active. Recording create/modify/delete/rename events...")

        try:
            while self.is_running:
                time.sleep(0.5)
        except KeyboardInterrupt:
            print("\n[TraceX Agent] Stopping agent...")
            self.is_running = False
            observer.stop()
        observer.join()


class AgentEventHandler(FileSystemEventHandler):
    def __init__(self, agent: TraceXAgent):
        super().__init__()
        self.agent = agent
        self.debounce_cache: Dict[str, float] = {}

    def is_debounced(self, path: str, threshold: float = 0.5) -> bool:
        now = time.time()
        last = self.debounce_cache.get(path, 0)
        if now - last < threshold:
            return True
        self.debounce_cache[path] = now
        return False

    def on_created(self, event):
        if event.is_directory or self.is_debounced(event.src_path):
            return
        self.agent.process_file_event("created", event.src_path)

    def on_modified(self, event):
        if event.is_directory or self.is_debounced(event.src_path):
            return
        self.agent.process_file_event("modified", event.src_path)

    def on_deleted(self, event):
        if event.is_directory:
            return
        self.agent.process_file_event("deleted", event.src_path)

    def on_moved(self, event):
        if event.is_directory:
            return
        self.agent.process_file_event("renamed", event.dest_path, original_path=event.src_path)


def main():
    parser = argparse.ArgumentParser(description="TraceX Windows Endpoint Collection Agent")
    parser.add_argument("command", choices=["start", "status", "simulate-pdf"], help="Agent command")
    parser.add_argument("--config", default="config.json", help="Path to config.json")
    parser.add_argument("--dir", default=None, help="Directory to monitor")
    args = parser.parse_args()

    agent = TraceXAgent(config_path=args.config)
    if args.dir:
        agent.monitored_paths = [args.dir]

    if args.command == "start":
        agent.start()
    elif args.command == "status":
        res = agent.send_http_request("/agent/status", {})
        if res:
            print(json.dumps(res, indent=2))
        else:
            print(f"Could not connect to TraceX backend at {agent.backend_url}.")
    elif args.command == "simulate-pdf":
        print("[TraceX Simulation] Running PDF baseline and modification test...")
        # We will run the simulation test
        from test_agent_workflow import run_test_workflow
        run_test_workflow()


if __name__ == "__main__":
    main()
