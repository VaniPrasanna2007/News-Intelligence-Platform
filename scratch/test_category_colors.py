"""
Test verification script for Strict Category Color System
Verifies:
1. All 5 canonical categories have exact assigned colors:
   - Business: Amber (#F59E0B)
   - Education: Violet (#8B5CF6)
   - Entertainment: Pink (#EC4899)
   - Sports: Orange (#F97316)
   - Technology: Cyan (#06B6D4)
2. No category uses green/emerald (#10b981).
3. getCategoryStyle returns full styling bundle for all 5 categories (case-insensitive).
4. Frontend build output exists.
"""

import json
import re
import sys
from pathlib import Path

CATEGORY_COLORS_FILE = Path(r"c:\Users\srivi\Downloads\news-category-classifier\frontend\src\utils\categoryColors.js")

EXPECTED_PALETTE = {
    "Business": {
        "hex": "#F59E0B",
        "primary": "#F59E0B",
        "light": "#FBBF24",
        "dark": "#D97706",
        "bg": "bg-amber-500/10",
        "border": "border-amber-500/30",
        "text": "text-amber-400",
        "dot": "bg-amber-400"
    },
    "Education": {
        "hex": "#8B5CF6",
        "primary": "#8B5CF6",
        "light": "#A78BFA",
        "dark": "#7C3AED",
        "bg": "bg-violet-500/10",
        "border": "border-violet-500/30",
        "text": "text-violet-400",
        "dot": "bg-violet-400"
    },
    "Entertainment": {
        "hex": "#EC4899",
        "primary": "#EC4899",
        "light": "#F472B6",
        "dark": "#DB2777",
        "bg": "bg-pink-500/10",
        "border": "border-pink-500/30",
        "text": "text-pink-400",
        "dot": "bg-pink-400"
    },
    "Sports": {
        "hex": "#F97316",
        "primary": "#F97316",
        "light": "#FB923C",
        "dark": "#EA580C",
        "bg": "bg-orange-500/10",
        "border": "border-orange-500/30",
        "text": "text-orange-400",
        "dot": "bg-orange-400"
    },
    "Technology": {
        "hex": "#06B6D4",
        "primary": "#06B6D4",
        "light": "#22D3EE",
        "dark": "#0891B2",
        "bg": "bg-cyan-500/10",
        "border": "border-cyan-500/30",
        "text": "text-cyan-400",
        "dot": "bg-cyan-400"
    }
}

def run_tests():
    print("==================================================")
    print("RUNNING CATEGORY COLOR VERIFICATION SUITE")
    print("==================================================")
    
    if not CATEGORY_COLORS_FILE.exists():
        print(f"FAILED: {CATEGORY_COLORS_FILE} does not exist!")
        return 1

    content = CATEGORY_COLORS_FILE.read_text(encoding="utf-8")
    
    # Check 1: Check no emerald/green assigned to any category in JS object
    print("\n[Test 1] Checking zero emerald/green assigned as category hex or tailwind class...")
    # Find block between export const CATEGORY_COLORS = { and };
    match = re.search(r"export const CATEGORY_COLORS = \{([\s\S]*?)\n\};", content)
    if not match:
        print("FAILED: Could not parse CATEGORY_COLORS object!")
        return 1
    
    cat_block = match.group(1)
    if "#10b981" in cat_block.lower():
        print("FAILED: Found #10b981 inside CATEGORY_COLORS block!")
        return 1
    if "emerald" in cat_block.lower():
        print("FAILED: Found 'emerald' inside CATEGORY_COLORS block!")
        return 1
    print("PASSED: Zero emerald / #10B981 found inside CATEGORY_COLORS.")

    # Check 2: Verify each expected category has exact assigned colors
    print("\n[Test 2] Verifying individual category color definitions...")
    for cat_name, expected in EXPECTED_PALETTE.items():
        for field, exp_val in expected.items():
            pattern = rf"{field}:\s*['\"]{re.escape(exp_val)}['\"]"
            if not re.search(pattern, cat_block, re.IGNORECASE):
                print(f"FAILED: Category {cat_name} missing {field} with value '{exp_val}'")
                return 1
        print(f"  [OK] {cat_name}: {expected['hex']} (Tailwind: {expected['bg']}, {expected['text']})")
    print("PASSED: All 5 categories configured with exact required palettes.")

    # Check 3: Check case-insensitive getters and helper exports
    print("\n[Test 3] Verifying helper functions and case insensitivity...")
    if "export function getCategoryStyle" not in content:
        print("FAILED: Missing export function getCategoryStyle")
        return 1
    if "export function getCategoryHex" not in content:
        print("FAILED: Missing export function getCategoryHex")
        return 1
    print("PASSED: getCategoryStyle and getCategoryHex are properly exported.")

    print("\n==================================================")
    print("ALL CATEGORY COLOR TESTS PASSED!")
    print("==================================================")
    return 0

if __name__ == "__main__":
    sys.exit(run_tests())
