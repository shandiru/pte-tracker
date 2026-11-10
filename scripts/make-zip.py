import os
import zipfile

zip_filename = "pte-tracker.zip"
dirs_to_include = ["backend", "frontend"]

# Exclude unnecessary temporary files
def should_exclude(rel_path):
    parts = rel_path.split(os.sep)
    for p in parts:
        if p in ["node_modules", "dist", ".git", ".turbo", "__pycache__", ".DS_Store"]:
            return True
        if p.endswith(".log"):
            return True
    return False

print(f"Creating {zip_filename} with ONLY backend/ and frontend/ folders...")

with zipfile.ZipFile(zip_filename, "w", zipfile.ZIP_DEFLATED) as zf:
    for base_dir in dirs_to_include:
        if not os.path.exists(base_dir):
            continue
        for root, dirs, files in os.walk(base_dir):
            for file in files:
                file_path = os.path.join(root, file)
                rel_path = os.path.relpath(file_path, ".")
                if should_exclude(rel_path):
                    continue
                # Write to zip preserving directory structure
                zf.write(file_path, rel_path)
                print(f"  Added: {rel_path}")

# Also copy to public/ directory for easy direct static download
os.makedirs("public", exist_ok=True)
import shutil
shutil.copyfile(zip_filename, os.path.join("public", zip_filename))

print(f"Successfully generated {zip_filename} and public/{zip_filename}!")
