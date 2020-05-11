// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import ReactDOM from 'react-dom';



import { Row, Col } from 'antd/lib/grid';
import Icon from 'antd/lib/icon';
import Select from 'antd/lib/select';
import Radio, { RadioChangeEvent } from 'antd/lib/radio';
import Checkbox, { CheckboxChangeEvent } from 'antd/lib/checkbox';
import Divider from 'antd/lib/divider'
import Input from 'antd/lib/input';
import InputNumber from 'antd/lib/input-number';
import Collapse from 'antd/lib/collapse';
import Dropdown from 'antd/lib/dropdown';
import Menu from 'antd/lib/menu';
import Button from 'antd/lib/button';
import Modal from 'antd/lib/modal';
import Popover from 'antd/lib/popover';
import Text from 'antd/lib/typography/Text';
import Tooltip from 'antd/lib/tooltip';


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
        padding: 5,
      };


    console.log(objectID, objectState, attributes, labels);

    return ReactDOM.createPortal(
        <div className='cvat-canvas-label-menu' style={ divStyle }>


            {/* <Button type='link' icon='tags'>
                Label Menu
            </Button> */}
            <Row type='flex' align='middle' justify='space-around'>
                <Col span={12}>
                    <Text style={{ fontSize:14 }}>Label</Text>
                </Col>
                <Col span={12}>
                    <Text strong style={{ fontSize:16 }}>{objectState.label.name}</Text>
                </Col>
                {/* <Text style={{ fontSize: 16 }}>Label {objectState.label.name}</Text> */}
            </Row>
            {!!attributes.length && <Divider />}

            {!!attributes.length
                && attributes.map((attribute: any): JSX.Element => (
                    <Row>
                        <Col span={12}>
                            <Text style={{ fontSize:14 }}>{attribute.name}</Text>
                        </Col>
                        <Col span={12}>
                            <Text strong style={{ fontSize:16 }}>{objectState.attributes[attribute.id]}</Text>
                        </Col>
                    </Row>
                ))
                }
            <ObjectItemContainer clientID={activatedStateID} />
        </div>,
        window.document.body,
    );
}
