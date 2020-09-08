import cv2

class Tracker:
    def __init__(self):
        pass

    def init(self):
        pass
        
    def update(self):
        pass


class CSRT(Tracker):
    def __init__(self):
        self.tracker = cv2.TrackerCSRT_create()

    def init(self, frame, initBB):
        self.tracker.init(frame, initBB)

    def update(self, frame):
        (success, box) = self.tracker.update(frame)
        if success:
            return box


