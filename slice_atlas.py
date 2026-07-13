# pyrefly: ignore [missing-import]
import cv2
import numpy as np
import os

# Create output directory
out_dir = 'public/assets/sprites'
os.makedirs(out_dir, exist_ok=True)

# Load the atlas image with alpha channel
img = cv2.imread('public/assets/texture-0.png', cv2.IMREAD_UNCHANGED)
if img is None:
    print("Could not load texture-0.png")
    exit()

# Extract alpha channel
alpha = img[:, :, 3]

# Threshold alpha to get a binary mask of visible pixels
_, mask = cv2.threshold(alpha, 10, 255, cv2.THRESH_BINARY)

# Find contours of the visible pixels
contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

print(f"Found {len(contours)} sprites.")

count = 0
for i, c in enumerate(contours):
    x, y, w, h = cv2.boundingRect(c)
    # Filter out very small noise
    if w < 10 or h < 10:
        continue
    
    # Extract the sprite
    sprite = img[y:y+h, x:x+w]
    
    # Save the sprite
    cv2.imwrite(os.path.join(out_dir, f'sprite_{count}.png'), sprite)
    count += 1

print(f"Saved {count} sprites.")
