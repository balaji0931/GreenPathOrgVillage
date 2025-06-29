
from PIL import Image
import os

# Load base icon (your uploaded 512x512 image)
base_icon = Image.open("public/icons/logo.png")

# Ensure output directory exists
output_dir = "public/icons"
os.makedirs(output_dir, exist_ok=True)

# Sizes required for PWA manifest
sizes = [72, 96, 128, 144, 152, 192, 384, 512]

for size in sizes:
    resized_icon = base_icon.resize((size, size), Image.LANCZOS)
    filename = f"icon-{size}x{size}.png"
    filepath = os.path.join(output_dir, filename)
    resized_icon.save(filepath, format="PNG", optimize=True)
    print(f"✅ Generated: {filename}")

print("🎉 All PWA icons created!")
