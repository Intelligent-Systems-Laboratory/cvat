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
    fetch,
    autoFit,
} from 'actions/annotation-actions';
import TogglesModal from 'components/annotation-page/top-bar/toggles-modal';

interface StateToProps {
    visible: boolean;
    jobInstance:any;
    autofitInitState:boolean;
    globalattributesInitState: boolean;
}

interface DispatchToProps {
    onCancel():void;
    toggleAutoFit(jobInstance:any,value:boolean):void;
    toggleGlobalAttributes(jobInstance:any,value:boolean):void;
    fetchInitialState(jobInstance:any):void;
}

function mapStateToProps(state: CombinedState): StateToProps {
    const {
        annotation: {
            featuresToggle:{
                visible:visible,
                autofitState:autofitInitState,
                globalattributesState:globalattributesInitState,
            },
            job: {
                instance: jobInstance
            },
        },

    } = state;

    return {
        visible,
        jobInstance,
        autofitInitState,
        globalattributesInitState,
    };
}

function mapDispatchToProps(dispatch: any): DispatchToProps {
    return {
        onCancel():void{
            dispatch(switchToggleFeatureModal(false));
        },
        toggleAutoFit(jobInstance:any,value:boolean):void{
            var params = {
                autofit:value,

            }
            dispatch(fetch(jobInstance,"tasks/1/ISLconfig",params));
        },
        toggleGlobalAttributes(jobInstance:any,value:boolean):void{
            var params = {
                globalattributes:value

            }
            dispatch(fetch(jobInstance,"tasks/1/ISLconfig",params));
        },
        fetchInitialState(jobInstance:any):void{
            dispatch(fetch(jobInstance,"tasks/1/ISLconfig"));
        }
    };
}

type Props = StateToProps & DispatchToProps;

class TogglesModalContainer extends React.PureComponent<Props> {

    constructor(props:Props) {
        super(props);
    }
    public componentDidMount(): void {
        const{
            fetchInitialState,
            jobInstance
        } = this.props;
        console.log('fetch initial config');
        fetchInitialState(jobInstance);
    }
    public render(): JSX.Element {
        const {
            visible,
            onCancel,
            jobInstance,
            toggleAutoFit,
            toggleGlobalAttributes,
            autofitInitState,
            globalattributesInitState,
        } = this.props;

        return (
            <TogglesModal
                visible={visible}
                onCancel={onCancel}
                jobInstance={jobInstance}
                toggleAutoFit={toggleAutoFit}
                toggleGlobalAttributes={toggleGlobalAttributes}
                autofitInitState={autofitInitState}
                globalattributesInitState={globalattributesInitState}
            />
        );
    }
}

export default connect(
    mapStateToProps,
    mapDispatchToProps,
)(TogglesModalContainer);
