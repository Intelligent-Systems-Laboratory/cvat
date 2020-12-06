from __future__ import absolute_import
from __future__ import division
from __future__ import print_function
from __future__ import unicode_literals
# import the necessary packages
import imutils
import cv2

import os
import argparse

# import cv2
import torch
import numpy as np
from glob import glob

from cvat.apps.engine.pysot.core.config import cfg
from cvat.apps.engine.pysot.models.model_builder import ModelBuilder
from cvat.apps.engine.pysot.tracker.tracker_builder import build_tracker
class Tracker:
    results = []
    def track(self, frameList, initBB, tracker):
        if(tracker == 'CSRT'):
            results = track_CSRT(frameList,initBB)
        elif(tracker == 'pysot'):
            results = track_CSRT(frameList,initBB)
        self.results = results
        return results
def track_CSRT(frameList, initBB):
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


def track_pysot(frameList, initBB):

    path = os.path.abspath("./")
    config_path = os.path.join(path,'cvat/apps/engine/pysot/siamrpn_alex_dwxcorr/config.yaml')
    model_path = os.path.join(path,'cvat/apps/engine/pysot/siamrpn_alex_dwxcorr/model.pth')
    coords = []
    # load config
    cfg.merge_from_file(config_path)
    cfg.CUDA = torch.cuda.is_available() and cfg.CUDA
    device = torch.device('cuda')

    # create model
    model = ModelBuilder()

    # load model
    model.load_state_dict(torch.load(model_path,
        map_location=lambda storage, loc: storage.cpu()))
    model.eval().to(device)

    # build tracker
    tracker = build_tracker(model)

    first_frame = True

    for frame in frameList:
        if first_frame:
            tracker.init(frame, initBB)
            first_frame = False
        else:
            outputs = tracker.track(frame)
            if 'polygon' in outputs:
                polygon = np.array(outputs['polygon']).astype(np.int32)
                # print(polygon)
                # cv2.polylines(frame, [polygon.reshape((-1, 1, 2))],
                #               True, (0, 255, 0), 3)
                mask = ((outputs['mask'] > cfg.TRACK.MASK_THERSHOLD) * 255)
                mask = mask.astype(np.uint8)
                mask = np.stack([mask, mask*255, mask]).transpose(1, 2, 0)
                frame = cv2.addWeighted(frame, 0.77, mask, 0.23, -1)
            else:
                bbox = list(map(int, outputs['bbox']))
                coords.append([bbox[0],bbox[1],bbox[0]+bbox[2],bbox[1]+bbox[3]])
                # print(bbox)
                # cv2.rectangle(frame, (bbox[0], bbox[1]),
                #               (bbox[0]+bbox[2], bbox[1]+bbox[3]),
                #               (0, 255, 0), 3)
            # cv2.imshow(video_name, frame)
            # cv2.waitKey(40)
    return coords

class TrackResultsStorage:
    results = []
    updated = False
    def check(self):
        size = len(self.results)
        print('storage size ',size)
        if(size>0):
            return True
        else:
            return False

    def flush(self):
        self.results = []
    def get(self,objectID):
        for result in self.results:
            if(result['objectID']==objectID):
                return result['data']
    def store(self, item):
        self.results.append(item)
        self.updated = True