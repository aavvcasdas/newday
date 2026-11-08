#!/usr/bin/env python3
"""Remove only near-white background connected to image edges from generated riding art."""
from pathlib import Path
import cv2
import numpy as np
from PIL import Image
ROOT=Path(__file__).resolve().parents[2]/'assets/ai-girls/dalabengba'
for src in ('whale_horse_source.png','whale_horse_pose2_source.png'):
    img=np.array(Image.open(ROOT/src).convert('RGB'))
    # Seed only light pixels connected to a border; white horse interiors stay intact.
    white=(np.min(img,axis=2)>242).astype(np.uint8)
    count, labels, stats, _ = cv2.connectedComponentsWithStats(white, connectivity=4)
    border=np.unique(np.concatenate((labels[0],labels[-1],labels[:,0],labels[:,-1])))
    bg=np.isin(labels,border[border!=0])
    rgba=np.dstack((img, np.where(bg,0,255).astype('uint8')))
    dest=ROOT/src.replace('_source','_cutout')
    Image.fromarray(rgba).save(dest)
    print(dest,'transparent pixels',int(bg.sum()))
