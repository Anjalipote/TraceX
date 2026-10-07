import os
import difflib
from typing import Dict, Any, List, Optional
import pypdf

class PdfDiffService:
    @staticmethod
    def extract_text_from_pdf(pdf_path: str) -> List[str]:
        """
        Extracts text page by page from a given PDF file path.
        Returns a list of strings, where each entry is the text of a page.
        """
        if not os.path.exists(pdf_path):
            return []
        
        pages_text: List[str] = []
        try:
            reader = pypdf.PdfReader(pdf_path)
            for page in reader.pages:
                text = page.extract_text() or ""
                pages_text.append(text)
        except Exception as e:
            print(f"[PdfDiffService] Error reading PDF {pdf_path}: {e}")
            return []
        
        return pages_text

    @staticmethod
    def compare_pdf_pages(
        baseline_pages: List[str], 
        modified_pages: List[str]
    ) -> Dict[str, Any]:
        """
        Compares two lists of page text (baseline vs modified)
        and computes a detailed page-by-page diff.
        """
        total_baseline = len(baseline_pages)
        total_modified = len(modified_pages)
        max_pages = max(total_baseline, total_modified)

        changed_pages: List[int] = []
        page_results: List[Dict[str, Any]] = []
        total_additions = 0
        total_deletions = 0

        for i in range(max_pages):
            page_num = i + 1
            base_text = baseline_pages[i] if i < total_baseline else ""
            mod_text = modified_pages[i] if i < total_modified else ""

            base_lines = [line.strip() for line in base_text.splitlines() if line.strip()]
            mod_lines = [line.strip() for line in mod_text.splitlines() if line.strip()]

            matcher = difflib.SequenceMatcher(None, base_lines, mod_lines)
            diff_lines: List[Dict[str, Any]] = []
            added_lines: List[str] = []
            removed_lines: List[str] = []

            for tag, i1, i2, j1, j2 in matcher.get_opcodes():
                if tag == 'equal':
                    for line in base_lines[i1:i2]:
                        diff_lines.append({
                            "type": "unchanged",
                            "text": line
                        })
                elif tag == 'replace':
                    for line in base_lines[i1:i2]:
                        diff_lines.append({
                            "type": "removed",
                            "text": line
                        })
                        removed_lines.append(line)
                        total_deletions += 1
                    for line in mod_lines[j1:j2]:
                        diff_lines.append({
                            "type": "added",
                            "text": line
                        })
                        added_lines.append(line)
                        total_additions += 1
                elif tag == 'delete':
                    for line in base_lines[i1:i2]:
                        diff_lines.append({
                            "type": "removed",
                            "text": line
                        })
                        removed_lines.append(line)
                        total_deletions += 1
                elif tag == 'insert':
                    for line in mod_lines[j1:j2]:
                        diff_lines.append({
                            "type": "added",
                            "text": line
                        })
                        added_lines.append(line)
                        total_additions += 1

            page_has_changes = len(added_lines) > 0 or len(removed_lines) > 0 or (base_text != mod_text)
            if page_has_changes:
                changed_pages.append(page_num)

            page_results.append({
                "page_number": page_num,
                "has_changes": page_has_changes,
                "baseline_text": base_text,
                "modified_text": mod_text,
                "added_lines": added_lines,
                "removed_lines": removed_lines,
                "diff_lines": diff_lines
            })

        has_overall_changes = len(changed_pages) > 0 or (total_baseline != total_modified)
        
        summary = (
            f"Altered {len(changed_pages)} of {max_pages} pages ({total_additions} additions, {total_deletions} deletions)"
            if has_overall_changes
            else "Content is identical to baseline."
        )

        return {
            "has_changes": has_overall_changes,
            "total_pages_baseline": total_baseline,
            "total_pages_modified": total_modified,
            "changed_pages": changed_pages,
            "total_additions": total_additions,
            "total_deletions": total_deletions,
            "pages": page_results,
            "summary": summary
        }

    @staticmethod
    def compare_pdf_files(
        baseline_path: str,
        modified_path: str,
        file_name: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Reads both PDF files from disk, extracts text, and generates a structured comparison.
        """
        baseline_pages = PdfDiffService.extract_text_from_pdf(baseline_path)
        modified_pages = PdfDiffService.extract_text_from_pdf(modified_path)

        result = PdfDiffService.compare_pdf_pages(baseline_pages, modified_pages)
        result["file_name"] = file_name or os.path.basename(modified_path)
        result["baseline_path"] = baseline_path
        result["modified_path"] = modified_path
        return result
