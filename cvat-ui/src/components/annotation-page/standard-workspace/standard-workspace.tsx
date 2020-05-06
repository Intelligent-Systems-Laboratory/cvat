// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import './styles.scss';
import React from 'react';
import Layout from 'antd/lib/layout';

import CanvasWrapperContainer from 'containers/annotation-page/standard-workspace/canvas-wrapper';
import ControlsSideBarContainer from 'containers/annotation-page/standard-workspace/controls-side-bar/controls-side-bar';
import ObjectSideBarContainer from 'containers/annotation-page/standard-workspace/objects-side-bar/objects-side-bar';
import PropagateConfirmContainer from 'containers/annotation-page/standard-workspace/propagate-confirm';
import CanvasContextMenuContainer from 'containers/annotation-page/standard-workspace/canvas-context-menu';
import CanvasPointContextMenuContainer from 'containers/annotation-page/standard-workspace/canvas-point-context-menu';
// EDITED FOR LABEL MENU
import CanvasLabelMenuContainer from 'containers/annotation-page/standard-workspace/canvas-label-menu'
// EDITED END

export default function StandardWorkspaceComponent(): JSX.Element {
    return (
        <Layout hasSider className='cvat-standard-workspace'>
            <ControlsSideBarContainer />
            <CanvasWrapperContainer />
            <ObjectSideBarContainer />
            <PropagateConfirmContainer />
            <CanvasContextMenuContainer />
            <CanvasPointContextMenuContainer />
            <CanvasLabelMenuContainer />   {/* EDited for Label Menu */}
        </Layout>
    );
}
