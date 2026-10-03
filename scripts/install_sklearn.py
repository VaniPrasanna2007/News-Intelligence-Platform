import urllib.request
import json
import os
import subprocess
import sys

def download_and_install():
    print("Fetching package metadata from PyPI...")
    url = "https://pypi.org/pypi/scikit-learn/json"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    
    with urllib.request.urlopen(req, timeout=20) as resp:
        data = json.loads(resp.read().decode("utf-8"))
        
    urls = data.get("urls", [])
    matching = [u for u in urls if "cp313-win_amd64.whl" in u["filename"]]
    
    if not matching:
        print("Could not find cp313-win_amd64.whl in latest release. Checking all releases...")
        for ver, file_list in reversed(data.get("releases", {}).items()):
            m = [u for u in file_list if "cp313-win_amd64.whl" in u["filename"]]
            if m:
                matching = m
                break
                
    if not matching:
        print("Error: No suitable wheel found!")
        sys.exit(1)
        
    wheel_info = matching[0]
    filename = wheel_info["filename"]
    download_url = wheel_info["url"]
    expected_size = wheel_info["size"]
    print(f"Target wheel: {filename} ({expected_size / (1024*1024):.2f} MB)")
    print(f"URL: {download_url}")
    
    out_dir = os.path.join(os.path.dirname(__file__), "..", "scratch")
    os.makedirs(out_dir, exist_ok=True)
    wheel_path = os.path.join(out_dir, filename)
    
    if os.path.exists(wheel_path) and os.path.getsize(wheel_path) == expected_size:
        print("Wheel already downloaded.")
    else:
        print("Downloading wheel with chunks...")
        download_req = urllib.request.Request(download_url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(download_req, timeout=30) as r, open(wheel_path, "wb") as f:
            downloaded = 0
            while True:
                chunk = r.read(1024 * 128)
                if not chunk:
                    break
                f.write(chunk)
                downloaded += len(chunk)
                percent = (downloaded / expected_size) * 100
                sys.stdout.write(f"\rProgress: {downloaded / (1024*1024):.2f} MB / {expected_size / (1024*1024):.2f} MB ({percent:.1f}%)")
                sys.stdout.flush()
        print("\nDownload complete!")
        
    print(f"Installing {wheel_path}...")
    cmd = [sys.executable, "-m", "pip", "install", "--no-deps", wheel_path]
    subprocess.check_call(cmd)
    print("Scikit-learn installed successfully!")

if __name__ == "__main__":
    download_and_install()
