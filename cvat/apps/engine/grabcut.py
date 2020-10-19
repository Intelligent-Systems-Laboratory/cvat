import numpy as np
import cv2

def run(img, bboxx1, bboxy1, bboxx2, bboxy2):
    # THE PARAMETERS TO CHANGE
    # Coordinates of the resized image, not the full size
    (H,W) = img.shape[:2]
    ratioW = 1

    x1, y1, x2, y2 = snap_algorithm("grabcut",img, bboxx1, bboxy1, bboxx2, bboxy2)

    x1 = int(x1 / ratioW)
    x2 = int(x2 / ratioW)
    y1 = int(y1 / ratioW)
    y2 = int(y2 / ratioW)

    if (x1 == 0 and y1 == 0 and x2 == 0 and y2 == 0):
        data = [bboxx1, bboxy1, bboxx2, bboxy2]
    else:
        data = [x1, y1, x2, y2]

    dim = [H, W]
    return data, dim

def snap_algorithm(*args):
    img = args[1]
    if isinstance(args[2], (float, int)) and isinstance(args[3], (float, int)) or isinstance(args[4], (float, int)) or isinstance(args[5], (float, int)):
        x1 = args[2]
        y1 = args[3]
        x2 = args[4]
        y2 = args[5]
    else:
        print("Argument 3 to 6 should be int or float")
        return ValueError

    bgdModel = np.zeros((1,65),np.float64)
    fgdModel = np.zeros((1,65),np.float64)


    #get only part of the image
    x1 = int(x1)
    y1 = int(y1)
    x2 = int(x2)
    y2 = int(y2)
    W = x2-x1
    H = y2-y1
    Area = W*H
    factor = 0.2 # 10% of the bbox .get a slightly larger box only instead of the whole image as the input to grabcut
    WFactor = int(W*factor)
    HFactor = int(H*factor)
    img = img[y1-HFactor:y2+HFactor,x1-WFactor:x2+WFactor]
    img = cv2.medianBlur(img, 5)
    v_ex = 5

    mask = np.zeros(img.shape[:2],np.uint8)
    (mask_h, mask_w) = mask.shape[:2]

    for iter in range(0, mask_w-1):
        mask[v_ex][iter] = 1
        mask[v_ex+1][iter] = 1
        mask[mask_h-v_ex][iter] = 1
        mask[mask_h-v_ex-1][iter] = 1
    for iter in range(0, mask_w-1):
        mask[v_ex][iter] = 1
        mask[v_ex+1][iter] = 1
        mask[mask_h-v_ex][iter] = 1
        mask[mask_h-v_ex-1][iter] = 1

    #compute offset, needed later to convert back the coordinates
    xOffset = x1-WFactor #same as the x and y coordinate of the new img in relation to the old one
    yOffset = y1-HFactor

    #transform the coordinates
    x1 = WFactor
    y1 = HFactor
    x2 = WFactor + W
    y2 = HFactor + H

    #compute new rect based on the coordinates
    rect = (v_ex+WFactor,v_ex+HFactor,W-v_ex,H-v_ex)
    cv2.grabCut(img,mask,rect,bgdModel,fgdModel,25,cv2.GC_BGD)
    mask2 = np.where((mask==2)|(mask==0),0,1).astype('uint8')
    img = img*mask2[:,:,np.newaxis]
    img2  = np.where(img!=0,255,img).astype('uint8')
    img2 = cv2.cvtColor(img2, cv2.COLOR_BGR2GRAY)

    thresh = cv2.threshold(img2,127,255,cv2.THRESH_BINARY)[1]
    cnts, hierarchy = cv2.findContours(thresh.copy(), cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
    area_list = []
    rec_list = []

    for c in cnts:
        (nX, nY, w, h) = cv2.boundingRect(c)
        cnts_area = cv2.contourArea(c)
        rec_list.append(c)
        area_list.append(cnts_area)

    nX, nY, w, h = cv2.boundingRect(rec_list[area_list.index(max(area_list))])

    if (w*h) >= (0.3*Area):
        nX = nX + xOffset
        nY = nY + yOffset
        return nX, nY, nX + w, nY + h
    else:
        return 0, 0, 0, 0

