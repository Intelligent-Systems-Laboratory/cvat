# Copyright (c) SenseTime. All Rights Reserved.

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function
from __future__ import unicode_literals

from cvat.apps.engine.pysot.core.config import cfg
from cvat.apps.engine.pysot.tracker.siamrpn_tracker import SiamRPNTracker
from cvat.apps.engine.pysot.tracker.siammask_tracker import SiamMaskTracker
from cvat.apps.engine.pysot.tracker.siamrpnlt_tracker import SiamRPNLTTracker

TRACKS = {
          'SiamRPNTracker': SiamRPNTracker,
          'SiamMaskTracker': SiamMaskTracker,
          'SiamRPNLTTracker': SiamRPNLTTracker
         }


def build_tracker(model):
    return TRACKS[cfg.TRACK.TYPE](model)
