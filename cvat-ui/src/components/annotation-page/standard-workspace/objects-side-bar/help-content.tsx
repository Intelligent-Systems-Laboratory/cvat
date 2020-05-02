// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { Row, Col } from 'antd/lib/grid';
import Paragraph from 'antd/lib/typography/Paragraph';
import Icon from 'antd/lib/icon';
import Select from 'antd/lib/select';
import Text from 'antd/lib/typography/Text';
import Tooltip from 'antd/lib/tooltip';

import { GlobalHotKeys, ExtendedKeyMapOptions } from 'react-hotkeys';
import { ActiveControl, Rotation } from 'reducers/interfaces';

interface Props {
    normalizedKeyMap: Record<string, string>;
    activeControl: ActiveControl;
    tracking: boolean;
    activatedStateID: number | null;
}

function HelpContent(props: Props): JSX.Element {
    const {
        normalizedKeyMap,
        activeControl,
        tracking,
        activatedStateID,
    } = props;

    var title = null;
    var hotkey = null;
    var icontype = null;
    var description = 'insert description here lorem ipsum dolor';
    console.log('hello there');

    if (!tracking && activatedStateID !== null) {
        title = 'tracking'
        hotkey = 't'
        icontype = 'track'
        description = 'Allows user to track a bounding box with his mouse as it moves throughout the frame.'
        console.log('tracking help: ' + tracking);
        console.log('stateID help: ' + activatedStateID);
    } else {
        title = 'not in help yet'
    }

    return (
        <div className='cvat-objects-sidebar-help-content'>
            <Row>
                <Col span={20}>
                    <Text strong style={{ fontSize: 16 }}>{`Feature name: `}</Text>
                    <Text style={{ fontSize: 16 }}>{title}</Text>
                    <br />
                    <Text strong style={{ fontSize: 16 }}>{`Hotkey: `}</Text>
                    <Text style={{ fontSize: 16 }}>{`${hotkey}`}</Text>
                    <br />
                    <Text strong style={{ fontSize: 16 }}>{`Icon: `}</Text>
                    <Icon type='search' />
                    <br />
                    <br />
                    <Text strong style={{ fontSize: 16 }}>{`Description: `}</Text>
                    <br />
                    <Text type='secondary' style={{ fontSize: 14 }}>{description}</Text>
                </Col>
            </Row>
        </div>
    );
}

export default React.memo(HelpContent);
