// Copyright (C) 2020 Intel Corporation
//
// SPDX-License-Identifier: MIT

import React from 'react';
import { connect } from 'react-redux';
import { CombinedState } from 'reducers/interfaces';
import {
    setGlobalAttributesVisibility,
    okGlobalAttributes,
    switchToggleFeatureModal,
} from 'actions/annotation-actions';
import TogglesModal from 'components/annotation-page/top-bar/toggles-modal';

interface StateToProps {
    visible: boolean;
}

interface DispatchToProps {
    onCancel():void;
}

function mapStateToProps(state: CombinedState): StateToProps {
    const {
        annotation: {
            featuresToggle:{
                visible:visible,
            }
        },
    } = state;

    return {
        visible,
    };
}

function mapDispatchToProps(dispatch: any): DispatchToProps {
    return {
        onCancel():void{
            dispatch(switchToggleFeatureModal(false));
        }
    };
}

type Props = StateToProps & DispatchToProps;

class TogglesModalContainer extends React.PureComponent<Props> {

    constructor(props:Props) {
        super(props);
    }

    public render(): JSX.Element {
        const {
            visible,
            onCancel
        } = this.props;

        return (
            <TogglesModal
                visible={visible}
                onCancel={onCancel}
            />
        );
    }
}

export default connect(
    mapStateToProps,
    mapDispatchToProps,
)(TogglesModalContainer);
