// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React from 'react';
import Layout from 'antd/lib/layout';

import CanvasWrapperContainer from 'containers/annotation-page/standard-workspace/canvas-wrapper';
import ControlsSideBarContainer from 'containers/annotation-page/standard-workspace/controls-side-bar/controls-side-bar';
import TrackConfirmContainer from 'containers/annotation-page/standard-workspace/track-confirm';
import PropagateConfirmContainer from 'containers/annotation-page/standard-workspace/propagate-confirm';
import CanvasContextMenuContainer from 'containers/annotation-page/standard-workspace/canvas-context-menu';
import ObjectSideBarComponent from 'components/annotation-page/standard-workspace/objects-side-bar/objects-side-bar';
import CanvasPointContextMenuComponent from 'components/annotation-page/standard-workspace/canvas-point-context-menu';
import TrackAllConfirmContainer from 'containers/annotation-page/standard-workspace/trackall-confirm';

export default function StandardWorkspaceComponent(): JSX.Element {
    return (
        <Layout hasSider className='cvat-standard-workspace'>
            <ControlsSideBarContainer />
            <CanvasWrapperContainer />
            <ObjectSideBarComponent />
            <PropagateConfirmContainer />
            <TrackConfirmContainer /> {/* ISL TRACKING */}
            <TrackAllConfirmContainer/> {/* mabe track all bbs */}
            <CanvasContextMenuContainer />
            <CanvasPointContextMenuComponent />
        </Layout>
    );
}
