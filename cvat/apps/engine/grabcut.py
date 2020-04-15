import numpy as np
import cv2

def run(img,bboxx1,bboxy1,bboxx2,bboxy2):
    # THE PARAMETERS TO CHANGE
    # Coordinates of the resized image, not the full size
    (H,W) = img.shape[:2]
    ratioW = 1

    x1, y1, x2, y2 = snap_algorithm("grabcut",img, bboxx1, bboxy1, bboxx2, bboxy2)

    x1 = int(x1 / ratioW)
    x2 = int(x2 / ratioW)
    y1 = int(y1 / ratioW)
    y2 = int(y2 / ratioW)

        
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

    mask = np.zeros(img.shape[:2],np.uint8)
    bgdModel = np.zeros((1,65),np.float64)
    fgdModel = np.zeros((1,65),np.float64)
    

    #get only part of the image
    x1 = int(x1)
    y1 = int(y1)
    x2 = int(x2)
    y2 = int(y2)
    W = x2-x1
    H = y2-y1
    factor = 0.2 # 10% of the bbox .get a slightly larger box only instead of the whole image as the input to grabcut
    WFactor = int(W*factor)
    HFactor = int(H*factor)
    img = img[y1-HFactor:y2+HFactor,x1-WFactor:x2+WFactor]
    mask = np.zeros(img.shape[:2],np.uint8)

    #compute offset, needed later to convert back the coordinates
    xOffset = x1-WFactor #same as the x and y coordinate of the new img in relation to the old one
    yOffset = y1-HFactor

    #transform the coordinates
    x1 = WFactor
    y1 = HFactor
    x2 = WFactor + W
    y2 = HFactor + H

    #compute new rect based on the coordinates
    rect = (int(x1), int(y1), int(x2-x1), int(y2-y1)) # x,y, W, H
    cv2.grabCut(img,mask,rect,bgdModel,fgdModel,5,cv2.GC_INIT_WITH_RECT)
    mask2 = np.where((mask==2)|(mask==0),0,1).astype('uint8')
    img = img*mask2[:,:,np.newaxis]
    img2  = np.where(img!=0,255,img).astype('uint8')
    img2 = cv2.cvtColor(img2, cv2.COLOR_BGR2GRAY) 

    cnts, hierarchy = cv2.findContours(img2.copy(), cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
    area_list = []
    rec_list = []

    for c in cnts:    
        (nX, nY, w, h) = cv2.boundingRect(c)
        cnts_area = cv2.contourArea(c)
        rec_list.append(c)
        area_list.append(cnts_area)

    nX = nX + xOffset
    nY = nY + yOffset
    return nX, nY, nX + w, nY + h

