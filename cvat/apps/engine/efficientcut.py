import cv2
import os
import numpy as np
import time
import torch
from torch.backends import cudnn
from matplotlib import colors
from cvat.apps.engine.backbone import EfficientDetBackbone
from cvat.apps.engine.efficientdet.utils import BBoxTransform, ClipBoxes
from cvat.apps.engine.efficientdet_utils.utils import preprocess, invert_affine, postprocess, STANDARD_COLORS, standard_to_bgr, get_index_label, plot_one_box
import os

import pathlib

os.environ['DISPLAY'] = ':0'
def efficientcut(frame_img,ROI):
    #frame_img is a cv2.read output and ROI is a box defined by (xtl,ytl,xbr,ybr) or cv2.rect
    input_image = np.array(frame_img[ROI[1]:ROI[3], ROI[0]:ROI[2]])
    compound_coef = 0 # set to the model weights coefficient
    force_input_size = None  # set None to use default size

    # replace this part with your project's anchor config
    anchor_ratios = [(1.0, 1.0), (1.4, 0.7), (0.7, 1.4)]
    anchor_scales = [2 ** 0, 2 ** (1.0 / 3.0), 2 ** (2.0 / 3.0)]

    threshold = 0.2 # used to determine minimum allowable cofidence coefficient
    iou_threshold = 0.2 # used to determine the IOU threshold

    use_cuda = True
    use_float16 = False
    cudnn.fastest = True
    cudnn.benchmark = True

    obj_list = ['car', 'suv', 'van', 'truck', 'motorcycle', 'bicycle', 'tricycle', 'jeep', # classes
                'bus']

    color_list = standard_to_bgr(STANDARD_COLORS)
    # tf bilinear interpolation is different from any other's, just make do
    input_sizes = [512, 640, 768, 896, 1024, 1280, 1280, 1536, 1536]
    input_size = input_sizes[compound_coef] if force_input_size is None else force_input_size
    ori_imgs, framed_imgs, framed_metas = preprocess(input_image, max_size=input_size)

    if use_cuda:
        x = torch.stack([torch.from_numpy(fi).cuda() for fi in framed_imgs], 0)
    else:
        x = torch.stack([torch.from_numpy(fi) for fi in framed_imgs], 0)

    x = x.to(torch.float32 if not use_float16 else torch.float16).permute(0, 3, 1, 2)

    model = EfficientDetBackbone(compound_coef=compound_coef, num_classes=len(obj_list),
                                ratios=anchor_ratios, scales=anchor_scales)
    model_path = os.path.join(pathlib.Path().absolute(),'cvat/apps/engine/efficientdet-d0_best.pth')
    modal_path = os.path.join
    model.load_state_dict(torch.load(model_path, map_location='cpu')) # add path to weights here
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
    # get maximum confidence level only
    finalbox_index = np.where(out[0]['scores'] == max(out[0]['scores']))
    final_bbox = out[0]['rois'][finalbox_index]
    final_bbox[0][0] = final_bbox[0][0]+ROI[0]
    final_bbox[0][1] = final_bbox[0][1]+ROI[1]
    final_bbox[0][2] = final_bbox[0][2]+ROI[0]
    final_bbox[0][3] = final_bbox[0][3]+ROI[1]
    return final_bbox[0]
