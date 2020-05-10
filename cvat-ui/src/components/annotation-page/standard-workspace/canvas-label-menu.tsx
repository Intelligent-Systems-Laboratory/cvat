// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import ReactDOM from 'react-dom';


import Button from 'antd/lib/button';
import ObjectItemContainer from 'containers/annotation-page/standard-workspace/objects-side-bar/object-item';

interface Props {
    // activatedStateID: number | null;
    // visible: boolean;
    // left: number;
    // top: number;


    left: number;
    top: number;
    visible: boolean;
    activatedStateID: number | null;
    objectState: any;
    labels: any[];
    attributes: any[];
    objectID: any[];

    changeAttribute(id: number, value: string): void;
    changeLabel(labelID: string): void;
}

export default function CanvasLabelMenu(props: Props): JSX.Element | null {
    const {
        // activatedStateID,
        // visible,
        // left,
        // top,
        top,
        left,
        visible,
        activatedStateID,
        objectState,
        labels,
        attributes,
        objectID,
        changeAttribute,
        changeLabel,
    } = props;

    if (!visible || activatedStateID === null) {
        return null;
    }

    const divStyle = {
        top: top,
        left: left,
        backgroundColor: 'white',
      };

    return ReactDOM.createPortal(
        <div className='cvat-canvas-label-menu' style={ divStyle }>
            <Button type='link' icon='delete'>
                Label Menu
            </Button>
            {/* <ObjectItemContainer clientID={activatedStateID} /> */}
        </div>,
        window.document.body,
    );
}
