// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { Row, Col } from 'antd/lib/grid';
import Icon from 'antd/lib/icon';
import Select from 'antd/lib/select';
import Text from 'antd/lib/typography/Text';
import Tooltip from 'antd/lib/tooltip';

import HelpFiltersInput from 'components/annotation-page/help-filters-input';

interface Props {
    statesHidden: boolean;
}

function HelpListHeader(props: Props): JSX.Element {
    const {
        statesHidden,
    } = props;

    return (
        <div className='cvat-objects-sidebar-help-header'>
            <Row>
                <Col>
                    <HelpFiltersInput />
                </Col>
            </Row>
        </div>
    );
}

export default React.memo(HelpListHeader);
