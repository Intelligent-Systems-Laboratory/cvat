// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { connect } from 'react-redux';
import { CombinedState } from 'reducers/interfaces';
import {
    setGlobalAttributesVisibility,
    okGlobalAttributes,
} from 'actions/annotation-actions';

import GlobalModal from 'components/annotation-page/top-bar/global-attributes-modal';

interface StateToProps {
    visible: boolean;
    labels: any[];
}

interface DispatchToProps {
    onCloseGlobalAttributesModal(): void;
    onSubmitGlobalAttributesModal(attributes:any): void;
}

function mapStateToProps(state: CombinedState): StateToProps {
    const {
        annotation: {
            globalAttributesVisibility:visible,
            job: {
                labels:labels,
            },
        },
    } = state;

    return {
        visible,
        labels
    };
}

function mapDispatchToProps(dispatch: any): DispatchToProps {
    return {
        onCloseGlobalAttributesModal(): void {
            dispatch(setGlobalAttributesVisibility(false));
        },
        onSubmitGlobalAttributesModal(attributes:any): void{
            dispatch(okGlobalAttributes(attributes));
        }
    };
}

type Props = StateToProps & DispatchToProps;

class GlobalModalContainer extends React.PureComponent<Props> {

    constructor(props:Props) {
        super(props);
        // console.log('MARKER!!',props.labels[0].attributes);
    }

    public render(): JSX.Element {
        const {
            visible,
            onCloseGlobalAttributesModal,
            onSubmitGlobalAttributesModal,
            labels,
        } = this.props;

        return (
            <GlobalModal
                title='Global Attributes'
                visible={false}
                handleCancel={onCloseGlobalAttributesModal}
                handleOk={onSubmitGlobalAttributesModal}
                attributes={labels[0].attributes}
                />
        );
    }
}

export default connect(
    mapStateToProps,
    mapDispatchToProps,
)(GlobalModalContainer);
