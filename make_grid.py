import cv2
import math
import os
import numpy as np

src_dir = 'public/assets/sprites'
files = [f for f in os.listdir(src_dir) if f.endswith('.png')]
files.sort(key=lambda x: int(x.split('_')[1].split('.')[0]))

grid_cols = 15
grid_rows = math.ceil(len(files) / grid_cols)
cell_size = 120

canvas = np.zeros((grid_rows * cell_size, grid_cols * cell_size, 4), dtype=np.uint8)

for i, f in enumerate(files):
    img = cv2.imread(os.path.join(src_dir, f), cv2.IMREAD_UNCHANGED)
    if img is None: continue
    h, w = img.shape[:2]
    if w > cell_size - 20 or h > cell_size - 20:
        scale = min((cell_size - 20) / w, (cell_size - 20) / h)
        img = cv2.resize(img, (0,0), fx=scale, fy=scale)
        h, w = img.shape[:2]
    r = i // grid_cols
    c = i % grid_cols
    x = c * cell_size
    y = r * cell_size
    oy = y + (cell_size - h) // 2
    ox = x + (cell_size - w) // 2
    
    # If image doesn't have alpha, add it
    if img.shape[2] == 3:
        img = cv2.cvtColor(img, cv2.COLOR_BGR2BGRA)
        
    canvas[oy:oy+h, ox:ox+w] = img
    cv2.putText(canvas, str(i), (x + 5, y + 20), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255, 255), 2)

# Make background dark gray
bg = np.zeros_like(canvas)
bg[:, :] = (50, 50, 50, 255)

# Alpha blend
alpha = canvas[:, :, 3] / 255.0
for c in range(3):
    bg[:, :, c] = canvas[:, :, c] * alpha + bg[:, :, c] * (1 - alpha)

cv2.imwrite('public/assets/all_sprites_grid.png', bg)
print('Grid created')
