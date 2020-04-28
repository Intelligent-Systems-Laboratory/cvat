// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React, { useState } from 'react';
import { connect } from 'react-redux';
import Select, { SelectValue, LabeledValue } from 'antd/lib/select';
import Title from 'antd/lib/typography/Title';
import Text from 'antd/lib/typography/Text';
import Paragraph from 'antd/lib/typography/Paragraph';
import Tooltip from 'antd/lib/tooltip';
import Modal from 'antd/lib/modal';
import Icon from 'antd/lib/icon';

import {
    changeAnnotationsFilters as changeAnnotationsFiltersAction,
    fetchAnnotationsAsync,
} from 'actions/annotation-actions';
import { CombinedState } from 'reducers/interfaces';

interface StateToProps {
    annotationsFilters: string[];
    annotationsFiltersHistory: string[];
    searchForwardShortcut: string;
    searchBackwardShortcut: string;
}

interface DispatchToProps {
    changeAnnotationsFilters(value: SelectValue): void;
}

function mapStateToProps(state: CombinedState): StateToProps {
    const {
        annotation: {
            annotations: {
                filters: annotationsFilters,
                filtersHistory: annotationsFiltersHistory,
            },
        },
        shortcuts: {
            normalizedKeyMap,
        },
    } = state;

    return {
        annotationsFilters,
        annotationsFiltersHistory,
        searchForwardShortcut: normalizedKeyMap.SEARCH_FORWARD,
        searchBackwardShortcut: normalizedKeyMap.SEARCH_BACKWARD,
    };
}

function mapDispatchToProps(dispatch: any): DispatchToProps {
    return {
        changeAnnotationsFilters(value: SelectValue) {
            if (typeof (value) === 'string') {
                dispatch(changeAnnotationsFiltersAction([value]));
                dispatch(fetchAnnotationsAsync());
            } else if (Array.isArray(value)
                && value.every((element: string | number | LabeledValue): boolean => (
                    typeof (element) === 'string'
                ))
            ) {
                dispatch(changeAnnotationsFiltersAction(value as string[]));
                dispatch(fetchAnnotationsAsync());
            }
        },
    };
}

function filtersHelpModalContent(
    searchForwardShortcut: string,
    searchBackwardShortcut: string,
): JSX.Element {
    return (
        <>
            <Paragraph>
                <Title level={3}>General</Title>
            </Paragraph>
            <Paragraph>
                You can use this search bar to search how a particular
                feature of CVAT works.
            </Paragraph>
            <Paragraph>
                <Text strong>Supported features: </Text>
                New ISL features, Controls sidebar features
                <br />
                <br />
                All properties and values are case-sensitive.
                CVAT uses json queries to perform search.
            </Paragraph>
            <Paragraph>
                <Title level={3}>Examples</Title>
                <ul>
                    <li>Emphasize box</li>
                    <li>autoSnap</li>
                    <li>Zoom upon resize</li>
                    <li>Track with mouse</li>
                </ul>
            </Paragraph>
        </>
    );
}

function HelpFiltersInput(props: StateToProps & DispatchToProps): JSX.Element {
    const {
        annotationsFilters,
        annotationsFiltersHistory,
        searchForwardShortcut,
        searchBackwardShortcut,
        changeAnnotationsFilters,
    } = props;

    const [underCursor, setUnderCursor] = useState(false);

    return (
        <Select
            className='cvat-annotations-filters-input'
            allowClear
            value={annotationsFilters}
            mode='tags'
            style={{ width: '100%' }}
            placeholder={
                underCursor ? (
                    <>
                        <Tooltip title='Click to open help'>
                            <Icon
                                type='filter'
                                onClick={(e: React.MouseEvent) => {
                                    e.stopPropagation();
                                    Modal.info({
                                        width: 700,
                                        title: 'How to search a feature?',
                                        content: filtersHelpModalContent(
                                            searchForwardShortcut,
                                            searchBackwardShortcut,
                                        ),
                                    });
                                }}
                            />
                        </Tooltip>
                    </>
                ) : (
                        <>
                            <Icon style={{ transform: 'scale(0.9)' }} type='filter' />
                            <span style={{ marginLeft: 5 }}>Search a feature</span>
                        </>
                    )
            }
            onChange={changeAnnotationsFilters}
            onMouseEnter={() => setUnderCursor(true)}
            onMouseLeave={() => setUnderCursor(false)}
        >
            {annotationsFiltersHistory.map((element: string): JSX.Element => (
                <Select.Option key={element} value={element}>{element}</Select.Option>
            ))}
        </Select>
    );
}


export default connect(
    mapStateToProps,
    mapDispatchToProps,
)(HelpFiltersInput);
