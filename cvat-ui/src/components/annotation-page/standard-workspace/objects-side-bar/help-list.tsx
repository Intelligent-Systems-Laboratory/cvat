// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';

// import HelpItemContainer from 'containers/annotation-page/standard-workspace/objects-side-bar/help-item';
import HelpListHeader from './help-list-header';
import { Row, Col } from 'antd/lib/grid';
import Paragraph from 'antd/lib/typography/Paragraph';

interface Props {
    listHeight: number;
}

function HelpListComponent(props: Props): JSX.Element {
    const {
        listHeight,
    } = props;

    return (
        <div style={{ height: 100 }}>
            <HelpListHeader />
            <Row>
                <Paragraph>
                    Hello there!
                </Paragraph>
            </Row>
        </div>
    );
}

export default React.memo(HelpListComponent);
