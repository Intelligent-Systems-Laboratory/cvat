# Author: Zylo117

"""
Simple Inference Script of EfficientDet-Pytorch
"""
import time
import torch
from torch.backends import cudnn
from matplotlib import colors

import cv2
import numpy as np

from cvat.apps.engine.backbone import EfficientDetBackbone
from cvat.apps.engine.efficientdet.utils import BBoxTransform, ClipBoxes
from cvat.apps.engine.efficientdet_utils.utils import preprocess,preprocess_frame, invert_affine, postprocess, STANDARD_COLORS, standard_to_bgr, get_index_label, plot_one_box
import os

compound_coef = 0
force_input_size = None  # set None to use default size
# img_path = 'test/frame_000000.jpg'

# replace this part with your project's anchor config
anchor_ratios = [(1.0, 1.0), (1.4, 0.7), (0.7, 1.4)]
anchor_scales = [2 ** 0, 2 ** (1.0 / 3.0), 2 ** (2.0 / 3.0)]

threshold = 0.2
iou_threshold = 0.2

use_cuda = True
use_float16 = False
cudnn.fastest = True
cudnn.benchmark = True
obj_list = ['person', 'bicycle', 'car', 'motorcycle', 'airplane', 'bus', 'train', 'truck', 'boat', 'traffic light',
            'fire hydrant', '', 'stop sign', 'parking meter', 'bench', 'bird', 'cat', 'dog', 'horse', 'sheep',
            'cow', 'elephant', 'bear', 'zebra', 'giraffe', '', 'backpack', 'umbrella', '', '', 'handbag', 'tie',
            'suitcase', 'frisbee', 'skis', 'snowboard', 'sports ball', 'kite', 'baseball bat', 'baseball glove',
            'skateboard', 'surfboard', 'tennis racket', 'bottle', '', 'wine glass', 'cup', 'fork', 'knife', 'spoon',
            'bowl', 'banana', 'apple', 'sandwich', 'orange', 'broccoli', 'carrot', 'hot dog', 'pizza', 'donut',
            'cake', 'chair', 'couch', 'potted plant', 'bed', '', 'dining table', '', '', 'toilet', '', 'tv',
            'laptop', 'mouse', 'remote', 'keyboard', 'cell phone', 'microwave', 'oven', 'toaster', 'sink',
            'refrigerator', '', 'book', 'clock', 'vase', 'scissors', 'teddy bear', 'hair drier',
            'toothbrush']
desired_classes = [1,2,3,5,6,7]

color_list = standard_to_bgr(STANDARD_COLORS)

# frame = cv2.imread(img_path)

def predict(frame):
    # tf bilinear interpolation is different from any other's, just make do
    input_sizes = [512, 640, 768, 896, 1024, 1280, 1280, 1536, 1536]
    input_size = input_sizes[compound_coef] if force_input_size is None else force_input_size
    ori_imgs, framed_imgs, framed_metas = preprocess_frame(frame, max_size=input_size)

    if use_cuda:
        x = torch.stack([torch.from_numpy(fi).cuda() for fi in framed_imgs], 0)
    else:
        x = torch.stack([torch.from_numpy(fi) for fi in framed_imgs], 0)

    x = x.to(torch.float32 if not use_float16 else torch.float16).permute(0, 3, 1, 2)

    model = EfficientDetBackbone(compound_coef=compound_coef, num_classes=len(obj_list),
                                ratios=anchor_ratios, scales=anchor_scales)
    path = os.path.abspath("./")
    model_path = os.path.join(path,f'cvat/apps/engine/weights/efficientdet-d{compound_coef}.pth')
    # print('path',model_path)
    model.load_state_dict(torch.load(model_path, map_location='cpu'))
    model.requires_grad_(False)
    model.eval()

    if use_cuda:
        model = model.cuda()
    if use_float16:
        model = model.half()

    with torch.no_grad():
        features, regression, classification, anchors = model(x)

        regressBoxes = BBoxTransform()
        clipBoxes = ClipBoxes()

        out = postprocess(x,
                        anchors, regression, classification,
                        regressBoxes, clipBoxes,
                        threshold, iou_threshold)
    out = invert_affine(framed_metas, out)
    out = remove_undesired(out,desired_classes)
    out = remove_overlapping(out,0.9)
    display(out, ori_imgs, imshow=False, imwrite=False)

    result = {}
    result['bbox'] = []

    for box1 in out[0]['rois']:
        temp = []
        for coord in box1:
            temp.append(int(coord))
        result['bbox'].append(temp)
    # print(result)
    return result

def remove_undesired(preds, desired_classes):
    # print(preds)
    length = len(preds[0]['rois'])
    i=0
    while i<length:
        # print('counter ',i)
        class_id = int(preds[0]['class_ids'][i])
        try:
            desired_classes.index(class_id)
        except:
            # print('delete',i)
            preds[0]['rois']=np.delete(preds[0]['rois'],i,axis=0)
            preds[0]['class_ids']=np.delete(preds[0]['class_ids'],i,axis=0)
            preds[0]['scores']=np.delete(preds[0]['scores'],i,axis=0)
            i-=1
            length -= 1
            # print('i,length',i,length)
        i+=1
    # print(preds)
    # print(len(preds[0]['rois']))
    # print(len(preds[0]['class_ids']))
    # print(len(preds[0]['scores']))
    return preds
def remove_overlapping(preds,iou_threshold):
    index_to_delete = []
    for box1 in preds[0]['rois']:
        # print(type(box1))
        for box2 in preds[0]['rois']:
            if(not np.array_equal(box1,box2)):
                IOU = bb_intersection_over_union(box1,box2)
                if(IOU>iou_threshold):
                    print('detected overlap more than threshold')
                    index1 = np.where(preds[0]['rois']==box1)
                    index2 = np.where(preds[0]['rois']==box2)
                    print(index1)
                    # print(preds[0]['scores'][index1[0]])
                    # print(preds[0]['scores'][index2[0]])
                    score1 = preds[0]['scores'][index1[0]]
                    score2 = preds[0]['scores'][index2[0]]
                    # print('score1',score1)
                    # print(np.shape(preds[0]['scores'][index1[0]]))
                    if(score1[0]>score2[0]):
                        index_to_delete.append(index2[0][0])
                    else:
                        index_to_delete.append(index1[0][0])
    index_to_delete = np.unique(index_to_delete)
    index_to_delete = np.sort(index_to_delete)
    index_to_delete = index_to_delete[::-1]
    # print('index to delete',index_to_delete)
    for i in index_to_delete:
        preds[0]['rois']=np.delete(preds[0]['rois'],i,axis=0)
        preds[0]['class_ids']=np.delete(preds[0]['class_ids'],i,axis=0)
        preds[0]['scores']=np.delete(preds[0]['scores'],i,axis=0)
    return preds


def display(preds, imgs, imshow=True, imwrite=False):
    for i in range(len(imgs)):
        # print('counter')
        if len(preds[i]['rois']) == 0:
            continue

        imgs[i] = imgs[i].copy()

        for j in range(len(preds[i]['rois'])):
            class_id = int(preds[i]['class_ids'][j])
            try:
                desired_classes.index(class_id)
                x1, y1, x2, y2 = preds[i]['rois'][j].astype(np.int)
                obj = obj_list[preds[i]['class_ids'][j]]
                # print('MARKER', type(preds[i]['class_ids'][j]))
                score = float(preds[i]['scores'][j])
                plot_one_box(imgs[i], [x1, y1, x2, y2], label=obj,score=score,color=color_list[get_index_label(obj, obj_list)])

            except:
                continue

        if imshow:
            cv2.imshow('img', imgs[i])
            cv2.waitKey(0)

        if imwrite:
            cv2.imwrite(f'test/img_inferred_d{compound_coef}_this_repo_{i}.jpg', imgs[i])




# for i in range(len(obj_list)):
#     print(i, obj_list[i])

# print('running speed test...')
# with torch.no_grad():
#     print('test1: model inferring and postprocessing')
#     print('inferring image for 10 times...')
#     # t1 = time.time()
#     for _ in range(10):
#         _, regression, classification, anchors = model(x)

#         out = postprocess(x,
#                           anchors, regression, classification,
#                           regressBoxes, clipBoxes,
#                           threshold, iou_threshold)
#         out = invert_affine(framed_metas, out)

    # # t2 = time.time()
    # tact_time = (t2 - t1) / 10
    # print(f'{tact_time} seconds, {1 / tact_time} FPS, @batch_size 1')

    # uncomment this if you want a extreme fps test
    # print('test2: model inferring only')
    # print('inferring images for batch_size 32 for 10 times...')
    # t1 = time.time()
    # x = torch.cat([x] * 32, 0)
    # for _ in range(10):
    #     _, regression, classification, anchors = model(x)
    #
    # t2 = time.time()
    # tact_time = (t2 - t1) / 10
    # print(f'{tact_time} seconds, {32 / tact_time} FPS, @batch_size 32')
def bb_intersection_over_union(boxA, boxB):
	# determine the (x, y)-coordinates of the intersection rectangle
	xA = max(boxA[0], boxB[0])
	yA = max(boxA[1], boxB[1])
	xB = min(boxA[2], boxB[2])
	yB = min(boxA[3], boxB[3])
	# compute the area of intersection rectangle
	interArea = max(0, xB - xA + 1) * max(0, yB - yA + 1)
	# compute the area of both the prediction and ground-truth
	# rectangles
	boxAArea = (boxA[2] - boxA[0] + 1) * (boxA[3] - boxA[1] + 1)
	boxBArea = (boxB[2] - boxB[0] + 1) * (boxB[3] - boxB[1] + 1)
	# compute the intersection over union by taking the intersection
	# area and dividing it by the sum of prediction + ground-truth
	# areas - the interesection area
	iou = interArea / float(boxAArea + boxBArea - interArea)
	# return the intersection over union value
	return iou
# print(predict(frame))