# import the necessary packages
import imutils
import cv2

def track(frameList, initBB):
    start = 0
    coords = []
    tracker = cv2.TrackerCSRT_create()

    # loop over frames from the video stream
    for frame in frameList:
        # grab the current frame, then handle if we are using a
        # VideoStream or VideoCapture object
        if start == 0:
            tracker.init(frame, initBB)

        # check to see if we are currently tracking an object
        if (start % 1 == 0) and start > 0:
            # grab the new bounding box coordinates of the object
            (success, box) = tracker.update(frame)

            # check to see if the tracking was a success
            if success:
                (x, y, w, h) = [int(v) for v in box]
                coords.append([x, y, x + w, y + h])
        
        start = start + 1
    
    return coords